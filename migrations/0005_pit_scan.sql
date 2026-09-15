-- Public X firehose + scan throttle. Scored hunter posts stay in yaps.
create table if not exists pit_posts (
  tweet_id      text primary key,
  tweet_url     text not null,
  author_handle text not null,
  body          text not null,
  has_ticker    boolean not null default false,
  has_mention   boolean not null default false,
  is_original   boolean not null default true,
  posted_at     timestamptz,
  scanned_at    timestamptz not null default now()
);

create index if not exists pit_posts_scanned_idx on pit_posts (scanned_at desc);
create index if not exists pit_posts_author_idx on pit_posts (lower(author_handle));

create table if not exists pit_scan (
  id      text primary key,
  last_at timestamptz not null default now(),
  source  text,
  found   integer not null default 0
);
