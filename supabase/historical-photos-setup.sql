-- 一箕の昔と写真 専用Supabase基盤
-- 実行順: 1) バケット 2) テーブルと制約 3) トリガー 4) RLS/権限 5) 登録RPC
-- このSQLは既存の photo_entries / photo2026 / 既存RPCを変更しません。

begin;

-- 1. 専用Storageバケット
insert into storage.buckets (
    id,
    name,
    public,
    file_size_limit,
    allowed_mime_types
)
values (
    'historical-photos',
    'historical-photos',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp']::text[]
)
on conflict (id) do nothing;

-- 2. 専用テーブル
create table if not exists public.historical_photos (
    id uuid primary key default gen_random_uuid(),
    storage_path text not null,
    original_file_name text,
    mime_type text not null,
    file_size integer,
    title text,
    shooting_era_display text not null,
    shooting_year_sort smallint,
    shooting_year_end_sort smallint,
    location text not null,
    description text not null,
    provider_name_private text,
    provider_name_mode text not null,
    provider_name_public text not null,
    applicant_email text,
    applicant_phone text,
    contact_preference text,
    rights_consent boolean not null,
    rights_consent_at timestamptz not null,
    rights_consent_version text not null,
    privacy_consent boolean not null,
    privacy_consent_at timestamptz not null,
    privacy_consent_version text not null,
    status text not null default 'received',
    is_public boolean not null default false,
    display_order integer not null default 0,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    approved_at timestamptz,
    approved_by uuid references auth.users(id) on delete set null,
    admin_note text,

    constraint historical_photos_mime_type_check
        check (lower(mime_type) in ('image/jpeg', 'image/png', 'image/webp')),
    constraint historical_photos_file_size_check
        check (file_size is null or file_size between 1 and 10485760),
    constraint historical_photos_contact_check
        check (
            nullif(btrim(applicant_email), '') is not null
            or nullif(btrim(applicant_phone), '') is not null
        ),
    constraint historical_photos_provider_mode_check
        check (provider_name_mode in ('real_name', 'family_name', 'nickname', 'anonymous')),
    constraint historical_photos_provider_name_check
        check (
            (provider_name_mode = 'anonymous' and provider_name_public = '匿名')
            or (
                provider_name_mode <> 'anonymous'
                and nullif(btrim(provider_name_private), '') is not null
                and nullif(btrim(provider_name_public), '') is not null
            )
        ),
    constraint historical_photos_status_check
        check (status in ('received', 'reviewing', 'approved', 'rejected', 'hidden')),
    constraint historical_photos_consent_check
        check (rights_consent is true and privacy_consent is true),
    constraint historical_photos_consent_detail_check
        check (
            rights_consent_at is not null
            and nullif(btrim(rights_consent_version), '') is not null
            and privacy_consent_at is not null
            and nullif(btrim(privacy_consent_version), '') is not null
        ),
    constraint historical_photos_year_check
        check (
            (shooting_year_sort is null or shooting_year_sort between 1800 and 2100)
            and (shooting_year_end_sort is null or shooting_year_end_sort between 1800 and 2100)
            and (
                shooting_year_end_sort is null
                or shooting_year_sort is not null
            )
            and (
                shooting_year_sort is null
                or shooting_year_end_sort is null
                or shooting_year_end_sort >= shooting_year_sort
            )
        ),
    constraint historical_photos_display_order_check
        check (display_order >= 0)
);

-- 3. updated_at自動更新。既存の同名関数を上書きしない専用名にする。
create or replace function public.set_historical_photos_updated_at()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;

drop trigger if exists historical_photos_set_updated_at on public.historical_photos;
create trigger historical_photos_set_updated_at
before update on public.historical_photos
for each row
execute function public.set_historical_photos_updated_at();

-- 4. テーブル直接公開を禁止
alter table public.historical_photos enable row level security;
revoke all on table public.historical_photos from anon, authenticated;
revoke all on function public.set_historical_photos_updated_at() from public;

-- 5. Storage: 匿名応募者は pending/ 以下へ画像を新規登録するだけ。
-- SELECT / UPDATE / DELETE ポリシーは作成しない。
drop policy if exists historical_photos_pending_insert on storage.objects;
create policy historical_photos_pending_insert
on storage.objects
for insert
to anon
with check (
    bucket_id = 'historical-photos'
    and name like 'pending/%'
    and (storage.foldername(name))[1] = 'pending'
    and position('..' in name) = 0
    and lower(coalesce(metadata ->> 'mimetype', '')) in ('image/jpeg', 'image/png', 'image/webp')
    and (
        coalesce(metadata ->> 'size', '') = ''
        or (
            (metadata ->> 'size') ~ '^[0-9]+$'
            and (metadata ->> 'size')::bigint between 1 and 10485760
        )
    )
);

-- 6. 登録RPC。応募者はテーブルへ直接書き込めず、この関数だけを実行する。
create or replace function public.submit_historical_photo(
    p_storage_path text,
    p_original_file_name text,
    p_mime_type text,
    p_file_size integer,
    p_applicant_name text,
    p_applicant_email text,
    p_applicant_phone text,
    p_title text,
    p_shooting_era_display text,
    p_shooting_year_sort smallint,
    p_shooting_year_end_sort smallint,
    p_location text,
    p_description text,
    p_provider_name_private text,
    p_provider_name_mode text,
    p_provider_name_public text,
    p_contact_preference text,
    p_rights_consent boolean,
    p_rights_consent_at timestamptz,
    p_rights_consent_version text,
    p_privacy_consent boolean,
    p_privacy_consent_at timestamptz,
    p_privacy_consent_version text
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
    v_storage_metadata jsonb;
    v_id uuid;
    v_email text := nullif(btrim(p_applicant_email), '');
    v_phone text := nullif(btrim(p_applicant_phone), '');
    v_mode text := nullif(btrim(p_provider_name_mode), '');
    v_public_name text := nullif(btrim(p_provider_name_public), '');
    v_mime_type text := lower(nullif(btrim(p_mime_type), ''));
    v_path text := btrim(p_storage_path);
begin
    if v_path is null or v_path not like 'pending/%' or position('..' in v_path) > 0 then
        raise exception 'storage_path must be under pending/';
    end if;

    if v_mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
        raise exception 'unsupported image type';
    end if;

    if p_file_size is not null and p_file_size not between 1 and 10485760 then
        raise exception 'file size must be between 1 byte and 10MB';
    end if;

    if v_email is null and v_phone is null then
        raise exception 'email or phone is required';
    end if;

    if v_mode not in ('real_name', 'family_name', 'nickname', 'anonymous') then
        raise exception 'invalid provider name mode';
    end if;

    if v_mode = 'anonymous' then
        v_public_name := '匿名';
    elsif nullif(btrim(p_provider_name_private), '') is null
        or v_public_name is null then
        raise exception 'public provider name is required';
    end if;

    if nullif(btrim(p_applicant_name), '') is null
        or nullif(btrim(p_title), '') is null
        or nullif(btrim(p_shooting_era_display), '') is null
        or nullif(btrim(p_location), '') is null
        or nullif(btrim(p_description), '') is null then
        raise exception 'required text is missing';
    end if;

    if p_shooting_year_sort is not null
        and p_shooting_year_sort not between 1800 and 2100 then
        raise exception 'invalid shooting start year';
    end if;

    if p_shooting_year_end_sort is not null
        and p_shooting_year_end_sort not between 1800 and 2100 then
        raise exception 'invalid shooting end year';
    end if;

    if p_shooting_year_end_sort is not null
        and (p_shooting_year_sort is null or p_shooting_year_end_sort < p_shooting_year_sort) then
        raise exception 'shooting end year must be after start year';
    end if;

    if p_rights_consent is not true
        or p_privacy_consent is not true
        or nullif(btrim(p_rights_consent_version), '') is null
        or nullif(btrim(p_privacy_consent_version), '') is null then
        raise exception 'both consent records are required';
    end if;

    select metadata
      into v_storage_metadata
      from storage.objects
     where bucket_id = 'historical-photos'
       and name = v_path;

    if not found then
        raise exception 'uploaded image was not found';
    end if;

    if lower(coalesce(v_storage_metadata ->> 'mimetype', '')) <> v_mime_type then
        raise exception 'uploaded image type does not match';
    end if;

    if coalesce(v_storage_metadata ->> 'size', '') ~ '^[0-9]+$'
        and (v_storage_metadata ->> 'size')::bigint > 10485760 then
        raise exception 'uploaded image exceeds 10MB';
    end if;

    if p_file_size is not null
        and coalesce(v_storage_metadata ->> 'size', '') ~ '^[0-9]+$'
        and (v_storage_metadata ->> 'size')::bigint <> p_file_size then
        raise exception 'uploaded image size does not match';
    end if;

    insert into public.historical_photos (
        storage_path,
        original_file_name,
        mime_type,
        file_size,
        title,
        shooting_era_display,
        shooting_year_sort,
        shooting_year_end_sort,
        location,
        description,
        provider_name_private,
        provider_name_mode,
        provider_name_public,
        applicant_email,
        applicant_phone,
        contact_preference,
        rights_consent,
        rights_consent_at,
        rights_consent_version,
        privacy_consent,
        privacy_consent_at,
        privacy_consent_version,
        status,
        is_public
    )
    values (
        v_path,
        nullif(btrim(p_original_file_name), ''),
        v_mime_type,
        p_file_size,
        nullif(btrim(p_title), ''),
        btrim(p_shooting_era_display),
        p_shooting_year_sort,
        p_shooting_year_end_sort,
        btrim(p_location),
        btrim(p_description),
        nullif(btrim(p_provider_name_private), ''),
        v_mode,
        v_public_name,
        v_email,
        v_phone,
        nullif(btrim(p_contact_preference), ''),
        true,
        now(),
        btrim(p_rights_consent_version),
        true,
        now(),
        btrim(p_privacy_consent_version),
        'received',
        false
    )
    returning id into v_id;

    return v_id;
end;
$$;

revoke all on function public.submit_historical_photo(
    text, text, text, integer, text, text, text, text, text, smallint, smallint,
    text, text, text, text, text, text, boolean, timestamptz, text, boolean,
    timestamptz, text
) from public;
grant execute on function public.submit_historical_photo(
    text, text, text, integer, text, text, text, text, text, smallint, smallint,
    text, text, text, text, text, boolean, timestamptz, text, boolean,
    timestamptz, text
) to anon;

commit;
