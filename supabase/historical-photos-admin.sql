-- 一箕の昔と写真: 管理者許可リストと管理RPC
-- historical-photos-setup.sql と historical-photos-image-variants.sql の適用後に実行する。
--
-- 初回管理者登録は、Supabase SQL Editorで次のように手動実行する。
-- insert into public.portal_admins (user_id, created_by)
-- values ('AUTH_USER_UUID', 'CREATOR_USER_UUID');
-- UUIDはSQLファイルへ埋め込まず、実際のAuthユーザーUUIDを手動指定する。

begin;

create table if not exists public.portal_admins (
    user_id uuid primary key references auth.users(id) on delete cascade,
    is_active boolean not null default true,
    created_at timestamptz not null default now(),
    created_by uuid references auth.users(id) on delete set null
);

alter table public.portal_admins enable row level security;
revoke all on table public.portal_admins from public, anon, authenticated;

create or replace function public.is_portal_admin()
returns boolean
language sql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
    select auth.uid() is not null
       and exists (
            select 1
              from public.portal_admins
             where user_id = auth.uid()
               and is_active = true
       );
$$;

revoke all on function public.is_portal_admin() from public, anon, authenticated;
grant execute on function public.is_portal_admin() to authenticated;

-- 管理者一覧。管理画面に必要な公開情報と掲載用画像情報だけを返す。
drop function if exists public.admin_list_historical_photos(text);
create or replace function public.admin_list_historical_photos(
    p_status text default null
)
returns table (
    id uuid,
    title text,
    shooting_era_display text,
    location text,
    provider_name_public text,
    status text,
    is_public boolean,
    display_order integer,
    created_at timestamptz,
    updated_at timestamptz,
    display_storage_path text,
    display_mime_type text,
    display_file_size integer,
    display_width integer,
    display_height integer
)
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
begin
    if not public.is_portal_admin() then
        raise exception 'portal admin access required';
    end if;

    return query
     select
          h.id,
          h.title,
          h.shooting_era_display,
          h.location,
          h.provider_name_public,
          h.status,
          h.is_public,
          h.display_order,
          h.created_at,
          h.updated_at,
          h.display_storage_path,
          h.display_mime_type,
          h.display_file_size,
          h.display_width,
          h.display_height
        from public.historical_photos as h
      where p_status is null
          or h.status = p_status
      order by h.display_order asc, h.created_at desc;
end;
$$;

revoke all on function public.admin_list_historical_photos(text) from public, anon, authenticated;
grant execute on function public.admin_list_historical_photos(text) to authenticated;

-- 管理者詳細。原本パスと応募者情報を管理画面だけへ返す。
drop function if exists public.admin_get_historical_photo(uuid);
create or replace function public.admin_get_historical_photo(
    p_id uuid
)
returns public.historical_photos
language plpgsql
stable
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
    historical_photo public.historical_photos;
begin
    if not public.is_portal_admin() then
        raise exception 'portal admin access required';
    end if;

    select photo.*
      into historical_photo
      from public.historical_photos as photo
     where photo.id = p_id;

    if not found then
        raise exception 'historical photo was not found';
    end if;

    return historical_photo;
end;
$$;

revoke all on function public.admin_get_historical_photo(uuid) from public, anon, authenticated;
grant execute on function public.admin_get_historical_photo(uuid) to authenticated;

-- 管理者編集。公開可否と承認者はサーバー側で確定する。
drop function if exists public.admin_update_historical_photo(
    uuid, text, text, smallint, smallint, text, text, text, text, boolean, integer, text
);
create or replace function public.admin_update_historical_photo(
    p_id uuid,
    p_title text,
    p_shooting_era_display text,
    p_shooting_year_sort smallint,
    p_shooting_year_end_sort smallint,
    p_location text,
    p_description text,
    p_provider_name_public text,
    p_status text,
    p_is_public boolean,
    p_display_order integer,
    p_admin_note text
)
returns public.historical_photos
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
    existing_photo public.historical_photos;
    updated_photo public.historical_photos;
    effective_is_public boolean;
begin
    if not public.is_portal_admin() then
        raise exception 'portal admin access required';
    end if;

    if p_status not in ('received', 'reviewing', 'approved', 'rejected', 'hidden') then
        raise exception 'invalid historical photo status';
    end if;

    if p_display_order is null or p_display_order < 0 then
        raise exception 'display_order must be zero or greater';
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

    if nullif(btrim(p_provider_name_public), '') is null then
        raise exception 'public provider name is required';
    end if;

    select photo.*
      into existing_photo
      from public.historical_photos as photo
     where photo.id = p_id;

    if not found then
        raise exception 'historical photo was not found';
    end if;

    effective_is_public := case
        when p_status in ('received', 'reviewing', 'rejected', 'hidden') then false
        else coalesce(p_is_public, false)
    end;

    if p_status = 'approved' and effective_is_public then
        if existing_photo.display_storage_path is null
            or existing_photo.display_mime_type is distinct from 'image/jpeg'
            or existing_photo.display_file_size is null
            or existing_photo.display_width is null
            or existing_photo.display_height is null then
            raise exception 'a complete JPEG display image is required for publication';
        end if;
    end if;

    update public.historical_photos
       set title = nullif(btrim(p_title), ''),
           shooting_era_display = btrim(p_shooting_era_display),
           shooting_year_sort = p_shooting_year_sort,
           shooting_year_end_sort = p_shooting_year_end_sort,
           location = btrim(p_location),
           description = btrim(p_description),
           provider_name_public = btrim(p_provider_name_public),
           status = p_status,
           is_public = effective_is_public,
           display_order = p_display_order,
           admin_note = nullif(btrim(p_admin_note), ''),
           approved_at = case
               when p_status = 'approved' then now()
               when p_status in ('rejected', 'received', 'reviewing') then null
               else existing_photo.approved_at
           end,
           approved_by = case
               when p_status = 'approved' then auth.uid()
               when p_status in ('rejected', 'received', 'reviewing') then null
               else existing_photo.approved_by
           end,
           updated_at = now()
     where id = p_id
     returning historical_photos.* into updated_photo;

    return updated_photo;
end;
$$;

revoke all on function public.admin_update_historical_photo(
    uuid, text, text, smallint, smallint, text, text, text, text, boolean, integer, text
) from public, anon, authenticated;
grant execute on function public.admin_update_historical_photo(
    uuid, text, text, smallint, smallint, text, text, text, text, boolean, integer, text
) to authenticated;

-- 原本・掲載用画像の署名URL作成に必要な最小のStorage閲覧権限。
drop policy if exists historical_photos_admin_select on storage.objects;
create policy historical_photos_admin_select
on storage.objects
for select
to authenticated
using (
    bucket_id = 'historical-photos'
    and public.is_portal_admin()
);

commit;
