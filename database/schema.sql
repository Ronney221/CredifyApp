-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- Create user profiles table
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text unique not null,
  full_name text,
  avatar_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create user's selected credit cards table (metadata only, no sensitive data)
create table if not exists public.user_credit_cards (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  card_name text not null,
  card_brand text not null, -- visa, mastercard, amex, etc.
  card_category text, -- travel, cashback, dining, etc.
  annual_fee decimal(10,2) default 0,
  is_active boolean default true,
  date_added timestamp with time zone default timezone('utc'::text, now()) not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Create monthly perk progress tracking table
create table if not exists public.perk_progress (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  card_id uuid references public.user_credit_cards(id) on delete cascade not null,
  perk_type text not null, -- dining_credit, travel_credit, etc.
  perk_amount decimal(10,2) not null,
  amount_used decimal(10,2) default 0,
  month_year text not null, -- "2024-01" format
  is_completed boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Enable Row Level Security
alter table public.profiles enable row level security;
alter table public.user_credit_cards enable row level security;
alter table public.perk_progress enable row level security;

-- Create policies for profiles
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

create policy "Users can insert own profile" on public.profiles
  for insert with check (auth.uid() = id);

-- Create policies for user credit cards
create policy "Users can view own credit cards" on public.user_credit_cards
  for select using (auth.uid() = user_id);

create policy "Users can insert own credit cards" on public.user_credit_cards
  for insert with check (auth.uid() = user_id);

create policy "Users can update own credit cards" on public.user_credit_cards
  for update using (auth.uid() = user_id);

create policy "Users can delete own credit cards" on public.user_credit_cards
  for delete using (auth.uid() = user_id);

-- Create policies for perk progress
create policy "Users can view own perk progress" on public.perk_progress
  for select using (auth.uid() = user_id);

create policy "Users can insert own perk progress" on public.perk_progress
  for insert with check (auth.uid() = user_id);

create policy "Users can update own perk progress" on public.perk_progress
  for update using (auth.uid() = user_id);

create policy "Users can delete own perk progress" on public.perk_progress
  for delete using (auth.uid() = user_id);

-- Function to automatically create a profile when a user signs up
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (new.id, new.email, new.raw_user_meta_data->>'full_name');
  return new;
end;
$$ language plpgsql security definer;

-- Create trigger (only if it doesn't exist)
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user(); 