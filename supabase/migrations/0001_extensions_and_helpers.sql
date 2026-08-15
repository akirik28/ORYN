-- Extensions and shared helper functions used across later migrations.

create extension if not exists pgcrypto;

-- Generic updated_at maintenance trigger, reused by every table below instead of
-- hand-rolling per-table trigger functions.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
