-- フォトコンテスト2026 応募受付終了
-- photo2026応募のINSERTをDB時刻で停止する。
-- historical-photos / historical_photos には触れない。

begin;

-- photo_entries.contest_year は既存管理画面で使用している実在列。
-- このトリガーはINSERTだけを対象とし、既存行のUPDATE・審査・公開処理には影響しない。
create or replace function public.prevent_photo2026_application_after_deadline()
returns trigger
language plpgsql
set search_path = pg_catalog, pg_temp
as $$
begin
    if new.contest_year = 2026
        and now() >= timestamptz '2026-10-01 00:00:00+09' then
        raise exception '応募受付は終了しました';
    end if;

    return new;
end;
$$;

drop trigger if exists photo2026_application_deadline on public.photo_entries;
create trigger photo2026_application_deadline
before insert on public.photo_entries
for each row
execute function public.prevent_photo2026_application_after_deadline();

alter policy photo2026_public_upload
on storage.objects
to anon
with check (
    bucket_id = 'photo2026'
    and now() < timestamptz '2026-10-01 00:00:00+09'
);

-- 適用後の確認用クエリ。
-- select
--     policyname,
--     roles,
--     cmd,
--     with_check
-- from pg_policies
-- where schemaname = 'storage'
--   and tablename = 'objects'
--   and policyname = 'photo2026_public_upload';

commit;
