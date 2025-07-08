-- First ensure cascade deletes are properly set up
ALTER TABLE IF EXISTS public.perk_redemptions
  DROP CONSTRAINT IF EXISTS perk_redemptions_user_id_fkey,
  ADD CONSTRAINT perk_redemptions_user_id_fkey
    FOREIGN KEY (user_id)
    REFERENCES auth.users(id)
    ON DELETE CASCADE;

-- Create a function to handle user deletion
create or replace function delete_user()
returns void as $$
declare
  v_user_id uuid;
begin
  -- Get the ID of the authenticated user
  v_user_id := auth.uid();
  
  if v_user_id is null then
    raise exception 'Not authenticated';
  end if;

  -- Delete perk redemptions first
  delete from public.perk_redemptions where user_id = v_user_id;
  
  -- Delete perk auto redemptions
  delete from public.perk_auto_redemptions where user_id = v_user_id;
  
  -- Delete user credit cards
  delete from public.user_credit_cards where user_id = v_user_id;

  -- Delete from profiles
  delete from public.profiles where id = v_user_id;

  -- Finally delete the user from auth.users
  delete from auth.users where id = v_user_id;
end;
$$ language plpgsql security definer; 