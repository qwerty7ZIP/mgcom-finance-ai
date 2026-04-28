-- Chat history storage for AI assistant

create table if not exists public.ai_chats (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null default 'Новый чат',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ai_chat_messages (
  id bigint generated always as identity primary key,
  chat_id uuid not null references public.ai_chats(id) on delete cascade,
  role text not null check (role in ('user', 'ai')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists ai_chats_user_updated_idx
  on public.ai_chats(user_id, updated_at desc);

create index if not exists ai_chat_messages_chat_created_idx
  on public.ai_chat_messages(chat_id, created_at asc);
