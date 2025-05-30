-- Create user's selected credit cards table
create table if not exists public.user_credit_cards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references auth.users(id) on delete cascade not null,
  card_name text not null,
  card_brand text not null,
  card_category text,
  annual_fee decimal(10,2) default 0,
  is_active boolean default true,
  renewal_date timestamp with time zone,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security (RLS)
alter table public.user_credit_cards enable row level security;

-- Create RLS policies
create policy "Users can view own credit cards"
  on public.user_credit_cards
  for select
  using (auth.uid() = user_id);

create policy "Users can insert own credit cards"
  on public.user_credit_cards
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update own credit cards"
  on public.user_credit_cards
  for update
  using (auth.uid() = user_id);

create policy "Users can delete own credit cards"
  on public.user_credit_cards
  for delete
  using (auth.uid() = user_id); 