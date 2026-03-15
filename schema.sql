-- ============================================================
-- Quibly Rewards — Phase 8 Schema (Private Mode)
-- Run this in the Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. Drop existing tables/views if they exist (clean slate)
drop view  if exists public.child_balances cascade;
drop table if exists public.notifications cascade;
drop table if exists public.point_ledger cascade;
drop table if exists public.rewards cascade;
drop table if exists public.tasks cascade;
drop table if exists public.profiles cascade;
drop table if exists public.site_config cascade;

-- Drop old enums
drop type if exists public.task_recurrence cascade;
drop type if exists public.task_state cascade;
drop type if exists public.ledger_transaction_type cascade;

-- 2. Enums
create type public.task_recurrence as enum ('daily', 'weekly', 'all_time');
create type public.task_state as enum ('unlocked', 'locked');
create type public.ledger_transaction_type as enum ('task_completion', 'reward_purchase', 'parent_adjustment', 'undo');

-- 3. Site Config (Singleton tracking global streak multiplier)
create table public.site_config (
    id integer primary key check (id = 1),
    streak_bonus_multiplier integer not null default 0,
    updated_at timestamptz not null default now()
);

-- Initialize the single config row
insert into public.site_config (id, streak_bonus_multiplier) values (1, 0) on conflict (id) do nothing;

-- 4. Profiles (Added streak tracking)
create table public.profiles (
    id          uuid primary key references auth.users(id) on delete cascade,
    display_name text not null default 'User',
    avatar_emoji text default '😊',
    is_admin    boolean not null default false,
    current_streak integer not null default 0,
    last_streak_date date,
    created_at  timestamptz not null default now()
);

-- 5. Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = ''
as $$
begin
    insert into public.profiles (id, display_name, is_admin)
    values (
        new.id,
        coalesce(new.raw_user_meta_data ->> 'display_name', 'User'),
        coalesce((new.raw_user_meta_data ->> 'role') = 'parent', false)
    );
    return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
    after insert on auth.users
    for each row execute function public.handle_new_user();

-- 6. Tasks (created_by is now just a loose UUID to avoid FK errors, added time limit/bonus)
create table public.tasks (
    id          uuid primary key default gen_random_uuid(),
    created_by  uuid not null, -- Removed FK constraint to prevent insert errors
    assigned_to uuid references public.profiles(id) on delete set null,
    title       text not null,
    description text,
    emoji       text default '✨',
    point_value integer not null default 10,
    time_limit_minutes integer, -- Optional countdown timer
    time_limit_bonus integer not null default 0, -- Bonus points if beat the timer
    recurrence  public.task_recurrence not null default 'daily',
    state       public.task_state not null default 'unlocked',
    is_active   boolean not null default true,
    created_at  timestamptz not null default now(),
    updated_at  timestamptz not null default now()
);

-- 7. Rewards (created_by is a loose UUID)
create table public.rewards (
    id          uuid primary key default gen_random_uuid(),
    created_by  uuid not null, -- Removed FK constraint 
    title       text not null,
    description text,
    image_url   text,
    point_cost  integer not null default 10,
    stock       integer, -- Null means infinite stock
    is_active   boolean not null default true,
    created_at  timestamptz not null default now()
);

-- 8. Point Ledger (immutable)
create table public.point_ledger (
    id               uuid primary key default gen_random_uuid(),
    child_id         uuid not null references public.profiles(id) on delete cascade,
    task_id          uuid references public.tasks(id) on delete set null,
    reward_id        uuid references public.rewards(id) on delete set null,
    transaction_type public.ledger_transaction_type not null,
    point_delta      integer not null,
    notes            text,
    created_at       timestamptz not null default now()
);

-- 9. Notifications
create table public.notifications (
    id         uuid primary key default gen_random_uuid(),
    user_id    uuid not null references public.profiles(id) on delete cascade,
    title      text not null,
    body       text not null,
    is_read    boolean not null default false,
    created_at timestamptz not null default now()
);

-- 10. Child Balances View
create or replace view public.child_balances as
select
    p.id as child_id,
    p.display_name as child_name,
    coalesce(sum(pl.point_delta), 0)::integer as current_points
from public.profiles p
left join public.point_ledger pl on pl.child_id = p.id
where p.is_admin = false
group by p.id, p.display_name;

-- 11. Purchase Reward RPC (Atomic transaction to prevent overdrafts)
create or replace function public.purchase_reward(
    p_child_id uuid,
    p_reward_id uuid
) returns json
language plpgsql
security definer set search_path = ''
as $$
declare
    v_reward public.rewards%rowtype;
    v_current_points integer;
    v_child_name text;
begin
    -- 1. Get the reward details and lock the row to safely check/decrement stock
    select * into v_reward from public.rewards where id = p_reward_id and is_active = true for update;
    if not found then
        raise exception 'Reward not found or inactive';
    end if;

    -- 2. Check Stock
    if v_reward.stock is not null and v_reward.stock <= 0 then
        raise exception 'Reward is out of stock';
    end if;

    -- 3. Lock the child's profile row to serialize concurrent purchases for this specific child
    select display_name into v_child_name from public.profiles where id = p_child_id for update;

    -- 4. Calculate current balance
    select coalesce(sum(point_delta), 0)::integer into v_current_points
    from public.point_ledger
    where child_id = p_child_id;

    -- 5. Verify funds
    if v_current_points < v_reward.point_cost then
        raise exception 'Insufficient points (Balance: %, Cost: %)', v_current_points, v_reward.point_cost;
    end if;

    -- 6. Deduct points
    insert into public.point_ledger (
        child_id,
        reward_id,
        transaction_type,
        point_delta,
        notes
    ) values (
        p_child_id,
        p_reward_id,
        'reward_purchase',
        -(v_reward.point_cost),
        'Purchased: ' || v_reward.title
    );

    -- 7. Decrement stock if applicable
    if v_reward.stock is not null then
        update public.rewards set stock = stock - 1 where id = p_reward_id;
    end if;

    -- 8. Send notification to the parent (creator of the reward)
    insert into public.notifications (
        user_id,
        title,
        body
    ) values (
        v_reward.created_by,
        'Reward Claimed! 🎁',
        coalesce(v_child_name, 'A child') || ' just purchased "' || v_reward.title || '"'
    );

    return json_build_object(
        'success', true,
        'new_balance', v_current_points - v_reward.point_cost,
        'reward_title', v_reward.title
    );
end;
$$;
