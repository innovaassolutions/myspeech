-- ============================================================
-- MySpeech Schema  — safe to run multiple times
-- ============================================================

-- ------------------------------------------------------------
-- Collections
-- ------------------------------------------------------------
create table if not exists public.collections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  name text not null,
  target_language text not null,
  voice_id text not null,
  created_at timestamptz default now() not null
);

alter table public.collections enable row level security;

do $$ begin
  create policy "Users manage own collections"
    on public.collections for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- Sentences
-- ------------------------------------------------------------
create table if not exists public.sentences (
  id uuid primary key default gen_random_uuid(),
  collection_id uuid references public.collections(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  source_text text not null,
  target_text text,
  phonetic_text text,
  audio_url text,
  audio_status text default 'pending' not null
    check (audio_status in ('pending', 'generating', 'ready', 'error')),
  created_at timestamptz default now() not null
);

alter table public.sentences enable row level security;

do $$ begin
  create policy "Users manage own sentences"
    on public.sentences for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- Recall results
-- ------------------------------------------------------------
create table if not exists public.recall_results (
  id uuid primary key default gen_random_uuid(),
  sentence_id uuid references public.sentences(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  correct boolean not null,
  attempted_at timestamptz default now() not null
);

alter table public.recall_results enable row level security;

do $$ begin
  create policy "Users manage own recall results"
    on public.recall_results for all
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
exception when duplicate_object then null;
end $$;

-- ------------------------------------------------------------
-- Indexes
-- ------------------------------------------------------------
alter table public.sentences
  drop constraint if exists sentences_collection_id_source_text_key;
alter table public.sentences
  add constraint sentences_collection_id_source_text_key unique (collection_id, source_text);

create index if not exists sentences_collection_id_idx on public.sentences(collection_id);
create index if not exists sentences_audio_status_idx on public.sentences(audio_status);
create index if not exists recall_results_sentence_id_idx on public.recall_results(sentence_id);
create index if not exists recall_results_user_id_idx on public.recall_results(user_id);

-- ------------------------------------------------------------
-- Storage bucket for audio files
-- ------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('audio', 'audio', true)
on conflict do nothing;

do $$ begin
  create policy "Users can upload own audio"
    on storage.objects for insert
    with check (bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]);
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Public audio read"
    on storage.objects for select
    using (bucket_id = 'audio');
exception when duplicate_object then null;
end $$;

do $$ begin
  create policy "Users can delete own audio"
    on storage.objects for delete
    using (bucket_id = 'audio' and auth.uid()::text = (storage.foldername(name))[1]);
exception when duplicate_object then null;
end $$;
