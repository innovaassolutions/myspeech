-- Add phonetic_text column to sentences
-- Run this in Supabase SQL Editor if you already have the tables created
alter table public.sentences
  add column if not exists phonetic_text text;
