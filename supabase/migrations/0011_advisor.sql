-- AI Advisor chat history.

create table public.advisor_conversations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null default 'New conversation',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index advisor_conversations_user_id_idx on public.advisor_conversations(user_id);
create trigger advisor_conversations_set_updated_at before update on public.advisor_conversations for each row execute function public.set_updated_at();

create type message_role as enum ('user', 'assistant');

create table public.advisor_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.advisor_conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role message_role not null,
  content text not null,
  created_at timestamptz not null default now()
);
create index advisor_messages_conversation_id_idx on public.advisor_messages(conversation_id, created_at);
