-- 一箕の昔と写真: 原本・掲載用画像分離マイグレーション
-- 既存の historical-photos-setup.sql 実行後に適用する。
-- 既存の photo_entries / photo2026 / 既存RPCは変更しない。

begin;

alter table public.historical_photos
    add column if not exists display_storage_path text,
    add column if not exists display_mime_type text,
    add column if not exists display_file_size integer,
    add column if not exists display_width integer,
    add column if not exists display_height integer;

alter table public.historical_photos
    drop constraint if exists historical_photos_display_path_check,
    drop constraint if exists historical_photos_display_mime_type_check,
    drop constraint if exists historical_photos_display_file_size_check,
    drop constraint if exists historical_photos_display_dimensions_check,
    drop constraint if exists historical_photos_display_variant_check;

alter table public.historical_photos
    add constraint historical_photos_display_path_check
        check (
            display_storage_path is null
            or display_storage_path ~* '^pending/2026/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/display[.]jpg$'
        ),
    add constraint historical_photos_display_mime_type_check
        check (
            display_mime_type is null
            or lower(display_mime_type) = 'image/jpeg'
        ),
    add constraint historical_photos_display_file_size_check
        check (
            display_file_size is null
            or display_file_size between 1 and 10485760
        ),
    add constraint historical_photos_display_dimensions_check
        check (
            (display_width is null and display_height is null)
            or (
                display_width between 1 and 1600
                and display_height between 1 and 1600
            )
        ),
    add constraint historical_photos_display_variant_check
        check (
            (display_storage_path is null
                and display_mime_type is null
                and display_file_size is null
                and display_width is null
                and display_height is null)
            or (
                display_storage_path is not null
                and display_mime_type is not null
                and display_file_size is not null
                and display_width is not null
                and display_height is not null
            )
        );

-- 引数構成変更による旧23引数版の残存を防ぐ。
drop function if exists public.submit_historical_photo(
    text, text, text, integer, text, text, text, text, text, smallint, smallint,
    text, text, text, text, text, text, boolean, timestamptz, text, boolean,
    timestamptz, text
);

create or replace function public.submit_historical_photo(
    p_storage_path text,
    p_display_storage_path text,
    p_display_mime_type text,
    p_display_file_size integer,
    p_display_width integer,
    p_display_height integer,
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
    v_display_storage_metadata jsonb;
    v_id uuid;
    v_email text := nullif(btrim(p_applicant_email), '');
    v_phone text := nullif(btrim(p_applicant_phone), '');
    v_mode text := nullif(btrim(p_provider_name_mode), '');
    v_public_name text := nullif(btrim(p_provider_name_public), '');
    v_mime_type text := lower(nullif(btrim(p_mime_type), ''));
    v_display_mime_type text := lower(nullif(btrim(p_display_mime_type), ''));
    v_path text := btrim(p_storage_path);
    v_display_path text := btrim(p_display_storage_path);
    v_original_folder text;
    v_display_folder text;
begin
    if v_path is null
        or v_path !~* '^pending/2026/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/original[.](jpg|jpeg|png|webp)$'
        or position('..' in v_path) > 0 then
        raise exception 'storage_path must be a valid original path under pending/';
    end if;

    if v_display_path is null
        or v_display_path !~* '^pending/2026/[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}/display[.]jpg$'
        or position('..' in v_display_path) > 0 then
        raise exception 'display_storage_path must be a valid display path under pending/';
    end if;

    v_original_folder := split_part(v_path, '/', 3);
    v_display_folder := split_part(v_display_path, '/', 3);

    if v_original_folder is null
        or v_original_folder <> v_display_folder then
        raise exception 'original and display paths must use the same post UUID';
    end if;

    if v_mime_type not in ('image/jpeg', 'image/png', 'image/webp') then
        raise exception 'unsupported original image type';
    end if;

    if v_display_mime_type <> 'image/jpeg' then
        raise exception 'display image must be JPEG';
    end if;

    if p_file_size is null or p_file_size not between 1 and 10485760 then
        raise exception 'original file size must be between 1 byte and 10MB';
    end if;

    if p_display_file_size is null or p_display_file_size not between 1 and 10485760 then
        raise exception 'display file size is invalid';
    end if;

    if p_display_width is null or p_display_height is null
        or p_display_width not between 1 and 1600
        or p_display_height not between 1 and 1600 then
        raise exception 'display dimensions must be between 1 and 1600 pixels';
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
        raise exception 'uploaded original image was not found';
    end if;

    if lower(coalesce(v_storage_metadata ->> 'mimetype', '')) <> v_mime_type then
        raise exception 'uploaded original image type does not match';
    end if;

    if coalesce(v_storage_metadata ->> 'size', '') !~ '^[0-9]+$'
        or (v_storage_metadata ->> 'size')::bigint <> p_file_size then
        raise exception 'uploaded original image size does not match';
    end if;

    select metadata
      into v_display_storage_metadata
      from storage.objects
     where bucket_id = 'historical-photos'
       and name = v_display_path;

    if not found then
        raise exception 'uploaded display image was not found';
    end if;

    if lower(coalesce(v_display_storage_metadata ->> 'mimetype', '')) <> 'image/jpeg' then
        raise exception 'uploaded display image type does not match';
    end if;

    if coalesce(v_display_storage_metadata ->> 'size', '') !~ '^[0-9]+$'
        or (v_display_storage_metadata ->> 'size')::bigint <> p_display_file_size then
        raise exception 'uploaded display image size does not match';
    end if;

    insert into public.historical_photos (
        storage_path,
        display_storage_path,
        display_mime_type,
        display_file_size,
        display_width,
        display_height,
        original_file_name,
        mime_type,
        file_size,
        applicant_name,
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
        v_display_path,
        v_display_mime_type,
        p_display_file_size,
        p_display_width,
        p_display_height,
        nullif(btrim(p_original_file_name), ''),
        v_mime_type,
        p_file_size,
        btrim(p_applicant_name),
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
    text, text, text, integer, integer, integer, text, text, integer,
    text, text, text, text, text, smallint, smallint, text, text, text,
    text, text, text, boolean, timestamptz, text, boolean, timestamptz, text
) from public;

grant execute on function public.submit_historical_photo(
    text, text, text, integer, integer, integer, text, text, integer,
    text, text, text, text, text, smallint, smallint, text, text, text,
    text, text, text, boolean, timestamptz, text, boolean, timestamptz, text
) to anon;

commit;
