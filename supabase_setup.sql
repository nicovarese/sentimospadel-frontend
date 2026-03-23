-- 1) profiles
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  public_category_number int null,
  is_category_verified boolean default false,
  verification_status text not null default 'none', -- 'none'|'pending'|'verified'|'rejected'
  verified_by_club_id uuid null,
  verified_at timestamptz null,
  created_at timestamptz default now()
);

-- 2) onboarding_surveys
create table if not exists public.onboarding_surveys (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  answers jsonb not null,
  values jsonb not null,
  weights jsonb not null,
  score_s int not null,
  score_s40 numeric(5,2) not null,
  initial_rating numeric(4,2) not null,
  initial_category_number int not null,
  initial_category_name text not null,
  created_at timestamptz default now()
);

-- 3) player_ratings
create table if not exists public.player_ratings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  current_rating numeric(4,2) not null,
  current_category_number int not null,
  current_category_name text not null,
  rating_source text not null default 'survey',
  last_updated timestamptz default now()
);

-- 4) clubs
create table if not exists public.clubs (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  city text,
  created_at timestamptz default now()
);

-- 5) club_verifications
create table if not exists public.club_verifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  club_id uuid not null references public.clubs(id) on delete cascade,
  requested_at timestamptz default now(),
  status text not null default 'pending', -- 'pending'|'approved'|'rejected'
  reviewed_at timestamptz null,
  reviewed_by text null,
  notes text null
);

-- RLS / POLICIES
alter table public.profiles enable row level security;
alter table public.onboarding_surveys enable row level security;
alter table public.player_ratings enable row level security;
alter table public.clubs enable row level security;
alter table public.club_verifications enable row level security;

-- Profiles: owner select/update; public select
create policy "Public profiles are viewable by everyone" on public.profiles for select using (true);
create policy "Users can update own profile" on public.profiles for update using (auth.uid() = user_id);

-- Onboarding: owner insert/select
create policy "Users can insert own survey" on public.onboarding_surveys for insert with check (auth.uid() = user_id);
create policy "Users can view own survey" on public.onboarding_surveys for select using (auth.uid() = user_id);

-- Player Ratings: owner select/update
create policy "Users can view own rating" on public.player_ratings for select using (auth.uid() = user_id);
create policy "Users can update own rating" on public.player_ratings for update using (auth.uid() = user_id);

-- Clubs: public select
create policy "Clubs are viewable by everyone" on public.clubs for select using (true);

-- Verifications: owner insert/select
create policy "Users can insert own verification request" on public.club_verifications for insert with check (auth.uid() = user_id);
create policy "Users can view own verification request" on public.club_verifications for select using (auth.uid() = user_id);

-- RPC: submit_onboarding_survey
create or replace function public.submit_onboarding_survey(
  p_answers jsonb,
  p_values jsonb,
  p_weights jsonb,
  p_score_s int,
  p_score_s40 numeric,
  p_initial_rating numeric,
  p_initial_category_number int,
  p_initial_category_name text
) returns void as $$
declare
  v_user_id uuid := auth.uid();
begin
  -- Insert survey
  insert into public.onboarding_surveys (
    user_id, answers, values, weights, score_s, score_s40, 
    initial_rating, initial_category_number, initial_category_name
  ) values (
    v_user_id, p_answers, p_values, p_weights, p_score_s, p_score_s40, 
    p_initial_rating, p_initial_category_number, p_initial_category_name
  );

  -- Upsert player ratings
  insert into public.player_ratings (
    user_id, current_rating, current_category_number, current_category_name, rating_source
  ) values (
    v_user_id, p_initial_rating, p_initial_category_number, p_initial_category_name, 'survey'
  ) on conflict (user_id) do update set
    current_rating = excluded.current_rating,
    current_category_number = excluded.current_category_number,
    current_category_name = excluded.current_category_name,
    last_updated = now();

  -- Update profiles
  update public.profiles
  set 
    verification_status = case when p_initial_category_number in (1, 2) then 'pending' else 'none' end,
    is_category_verified = false,
    public_category_number = case when p_initial_category_number in (1, 2) then null else p_initial_category_number end
  where user_id = v_user_id;
end;
$$ language plpgsql security definer;

-- RPC: request_club_verification
create or replace function public.request_club_verification(p_club_id uuid) returns void as $$
begin
  insert into public.club_verifications (user_id, club_id)
  values (auth.uid(), p_club_id);
end;
$$ language plpgsql security definer;

-- RPC: approve_club_verification (Simplificado para demo, en producción requiere chequeo de rol)
create or replace function public.approve_club_verification(p_user_id uuid, p_club_id uuid) returns void as $$
declare
  v_cat_num int;
begin
  -- Get current category
  select current_category_number into v_cat_num from public.player_ratings where user_id = p_user_id;

  update public.club_verifications
  set status = 'approved', reviewed_at = now()
  where user_id = p_user_id and club_id = p_club_id;

  update public.profiles
  set 
    verification_status = 'verified',
    is_category_verified = true,
    public_category_number = v_cat_num,
    verified_by_club_id = p_club_id,
    verified_at = now()
  where user_id = p_user_id;
end;
$$ language plpgsql security definer;
