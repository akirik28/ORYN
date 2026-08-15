-- Private storage buckets. Files are never publicly addressable by default (Phase 11).
-- Convention: object path is always "{auth.uid()}/{filename}" so a single folder-prefix
-- policy scopes every read/write to the owner. Signed URLs (created server-side with a
-- short expiry) are the only way to hand a viewable link to the browser.

insert into storage.buckets (id, name, public)
values ('evidence', 'evidence', false)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('cv-uploads', 'cv-uploads', false)
on conflict (id) do nothing;

do $$
declare
  bucket text;
  buckets text[] := array['evidence', 'cv-uploads'];
begin
  foreach bucket in array buckets loop
    execute format(
      $p$create policy "%1$s owner read" on storage.objects for select to authenticated
        using (bucket_id = %2$L and (storage.foldername(name))[1] = auth.uid()::text);$p$,
      bucket, bucket
    );
    execute format(
      $p$create policy "%1$s owner insert" on storage.objects for insert to authenticated
        with check (bucket_id = %2$L and (storage.foldername(name))[1] = auth.uid()::text);$p$,
      bucket, bucket
    );
    execute format(
      $p$create policy "%1$s owner delete" on storage.objects for delete to authenticated
        using (bucket_id = %2$L and (storage.foldername(name))[1] = auth.uid()::text);$p$,
      bucket, bucket
    );
  end loop;
end $$;
