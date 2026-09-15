-- PIXELPIT hunters, wallets, XP, and task completions.
create table if not exists hunters (
  user_id         text primary key,
  display_name    text not null default 'Hunter',
  avatar_url      text,
  wallet_address  text,
  wallet_chain    text,
  xp              integer not null default 0,
  wl_status       text not null default 'none',
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  constraint hunters_wl_status_chk check (wl_status in ('none', 'wl', 'gtd'))
);

create unique index if not exists hunters_wallet_unique
  on hunters (wallet_address)
  where wallet_address is not null;

create index if not exists hunters_xp_idx on hunters (xp desc);

create table if not exists task_completions (
  id           serial primary key,
  user_id      text not null,
  task_id      text not null,
  xp_awarded   integer not null,
  completed_at timestamptz not null default now(),
  unique (user_id, task_id)
);

create index if not exists task_completions_user_id_idx on task_completions (user_id);
