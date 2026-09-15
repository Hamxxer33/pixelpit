-- Originality + reply flag for Kaito-style mindshare scoring.
alter table yaps add column if not exists is_original boolean not null default true;
alter table yaps add column if not exists body_key text;

create unique index if not exists yaps_body_key_unique
  on yaps (body_key)
  where body_key is not null;
