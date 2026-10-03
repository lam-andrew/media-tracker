alter table library add constraint library_owner_id unique(user_id,id);

create table collections (
 id uuid primary key,
 user_id uuid not null references accounts(id) on delete cascade,
 name text not null check(name = btrim(name) and char_length(name) between 1 and 80),
 created_at timestamptz not null default now(),
 unique(user_id,id),
 unique(user_id,name)
);
create index collections_user on collections(user_id,created_at,id);

create table collection_memberships (
 user_id uuid not null,
 collection_id uuid not null,
 item_id uuid not null,
 primary key(collection_id,item_id),
 foreign key(user_id,collection_id) references collections(user_id,id) on delete cascade,
 foreign key(user_id,item_id) references library(user_id,id) on delete cascade
);
create index collection_memberships_item on collection_memberships(user_id,item_id);
