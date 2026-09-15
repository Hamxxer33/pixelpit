-- Yap-to-earn: X posts with $PIT or @official handle.
alter table hunters add column if not exists x_handle text;

create unique index if not exists hunters_x_handle_unique
  on hunters (x_handle)
  where x_handle is not null;

create table if not exists yaps (
  id           serial primary key,
  user_id      text not null,
  tweet_id     text not null,
  tweet_url    text not null,
  author_handle text not null,
  body         text not null,
  has_ticker   boolean not null default false,
  has_mention  boolean not null default false,
  xp_awarded   integer not null,
  created_at   timestamptz not null default now(),
  unique (tweet_id)
);

create index if not exists yaps_user_id_idx on yaps (user_id);
create index if not exists yaps_created_at_idx on yaps (created_at desc);
