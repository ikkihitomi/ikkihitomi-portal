-- 一箕の昔と写真: 管理者用の完全削除機能
-- historical-photos-admin.sql の適用後に実行する。

begin;

-- 削除処理の開始時に、対象を先に非公開・hiddenへ変更する。
-- 画像削除や最終削除に失敗しても、壊れた投稿が公開され続けないようにする。
drop function if exists public.admin_prepare_historical_photo_delete(uuid);
create or replace function public.admin_prepare_historical_photo_delete(
    p_id uuid
)
returns public.historical_photos
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
    prepared_photo public.historical_photos;
begin
    if not public.is_portal_admin() then
        raise exception 'portal admin access required';
    end if;

    update public.historical_photos
       set status = 'hidden',
           is_public = false,
           updated_at = now()
     where id = p_id
     returning historical_photos.* into prepared_photo;

    if not found then
        raise exception 'historical photo was not found';
    end if;

    return prepared_photo;
end;
$$;

revoke all on function public.admin_prepare_historical_photo_delete(uuid)
from public, anon, authenticated;
grant execute on function public.admin_prepare_historical_photo_delete(uuid)
to authenticated;

-- Storageから原本・掲載用画像を削除した後に、投稿情報を完全削除する。
-- prepareを経由してhidden・非公開になった投稿だけを削除できる。
drop function if exists public.admin_delete_historical_photo(uuid);
create or replace function public.admin_delete_historical_photo(
    p_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = pg_catalog, pg_temp
as $$
declare
    existing_photo public.historical_photos;
begin
    if not public.is_portal_admin() then
        raise exception 'portal admin access required';
    end if;

    select photo.*
      into existing_photo
      from public.historical_photos as photo
     where photo.id = p_id
       for update;

    if not found then
        raise exception 'historical photo was not found';
    end if;

    if existing_photo.status is distinct from 'hidden'
        or existing_photo.is_public is distinct from false then
        raise exception 'historical photo must be hidden before deletion';
    end if;

    delete from public.historical_photos
     where id = p_id;

    return p_id;
end;
$$;

revoke all on function public.admin_delete_historical_photo(uuid)
from public, anon, authenticated;
grant execute on function public.admin_delete_historical_photo(uuid)
to authenticated;

-- 専用バケット内の画像を、許可リスト登録済み管理者だけが削除できる。
drop policy if exists historical_photos_admin_delete on storage.objects;
create policy historical_photos_admin_delete
on storage.objects
for delete
to authenticated
using (
    bucket_id = 'historical-photos'
    and public.is_portal_admin()
);

commit;
