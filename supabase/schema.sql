-- ══════════════════════════════════════════════════════════════
-- The Maxxyyy — SaaS Database Schema
-- Run this in Supabase SQL editor (Dashboard → SQL Editor → New query)
-- ══════════════════════════════════════════════════════════════

-- ── Profiles (extends auth.users) ────────────────────────────
CREATE TABLE IF NOT EXISTS public.profiles (
  id                  uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email               text,
  full_name           text,
  avatar_url          text,
  stripe_customer_id  text UNIQUE,
  tier                text NOT NULL DEFAULT 'free' CHECK (tier IN ('free', 'pro')),
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Subscriptions (mirrors Stripe state) ─────────────────────
CREATE TABLE IF NOT EXISTS public.subscriptions (
  id                    text PRIMARY KEY,
  user_id               uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status                text NOT NULL,
  price_id              text NOT NULL,
  current_period_start  timestamptz,
  current_period_end    timestamptz,
  cancel_at_period_end  boolean NOT NULL DEFAULT false,
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

-- ── Projects ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.projects (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  name           text NOT NULL DEFAULT 'Untitled Project',
  agent_set_id   text NOT NULL DEFAULT 'marketing-agency',
  phase          text NOT NULL DEFAULT 'idle',
  client_brief   text NOT NULL DEFAULT '',
  final_output   text,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

-- ── Tasks ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.tasks (
  id                        text PRIMARY KEY,
  project_id                uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id                   uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title                     text NOT NULL,
  description               text NOT NULL,
  assigned_agent_ids        integer[] NOT NULL DEFAULT '{}',
  status                    text NOT NULL DEFAULT 'scheduled'
                            CHECK (status IN ('scheduled','on_hold','in_progress','done')),
  requires_client_approval  boolean NOT NULL DEFAULT false,
  output                    text,
  parent_task_id            text REFERENCES public.tasks(id),
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now()
);

-- ── Usage Events ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.usage_events (
  id               bigserial PRIMARY KEY,
  user_id          uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  project_id       uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  provider         text NOT NULL,
  model            text NOT NULL,
  agent_index      integer,
  input_tokens     integer,
  output_tokens    integer,
  is_platform_key  boolean NOT NULL DEFAULT false,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- ── Row Level Security ────────────────────────────────────────
ALTER TABLE public.profiles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.usage_events   ENABLE ROW LEVEL SECURITY;

-- Users can only see their own rows
CREATE POLICY "own_profile"      ON public.profiles       FOR ALL USING (auth.uid() = id);
CREATE POLICY "own_subscription" ON public.subscriptions  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_projects"     ON public.projects       FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_tasks"        ON public.tasks          FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "own_usage"        ON public.usage_events   FOR ALL USING (auth.uid() = user_id);

-- ── Indexes ───────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_projects_user    ON public.projects (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_tasks_project    ON public.tasks (project_id);
CREATE INDEX IF NOT EXISTS idx_usage_user_date  ON public.usage_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sub_user         ON public.subscriptions (user_id);

-- ── Auto-create profile on signup ────────────────────────────
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'full_name',
    NEW.raw_user_meta_data->>'avatar_url'
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
