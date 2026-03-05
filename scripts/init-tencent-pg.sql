-- yiyu-prod-pg initialization for Tencent Cloud PostgreSQL
-- Safe to run multiple times (idempotent for core objects)

create extension if not exists pgcrypto;

create or replace function set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

-- Core content
create table if not exists reports (
  id text primary key,
  title text not null,
  publisher text,
  summary text,
  topics text[] default '{}',
  version text,
  format text[] default '{}',
  cover_image text,
  file_url text,
  file_size bigint,
  pages int,
  publish_date date,
  status text default 'draft',
  show_on_home boolean default false,
  views int default 0,
  downloads int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists insights (
  id text primary key,
  title text not null,
  excerpt text,
  content text,
  topics text[] default '{}',
  cover_image text,
  publish_date date,
  status text default 'draft',
  show_on_home boolean default false,
  views int default 0,
  likes int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists methodologies (
  id text primary key,
  title text not null,
  excerpt text,
  content text,
  topics text[] default '{}',
  cover_image text,
  publish_date date,
  status text default 'draft',
  show_on_home boolean default false,
  views int default 0,
  likes int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists books (
  id text primary key,
  title text not null,
  author text,
  description text,
  abstract text,
  topics text[] default '{}',
  pages int,
  duration text,
  rating numeric(3,2),
  cover_image text,
  cover_color text,
  publish_date date,
  status text default 'draft',
  show_on_home boolean default false,
  views int default 0,
  reviews int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists categories (
  id text primary key,
  name text not null,
  type text not null,
  parent_id text,
  sort int default 0
);

create table if not exists tags (
  id text primary key default gen_random_uuid()::text,
  name text unique not null,
  count int default 0
);

create table if not exists comments (
  id text primary key,
  content_id text not null,
  content_type text not null,
  content_title text,
  user_id text,
  user_name text,
  user_avatar text,
  text text,
  status text default 'pending',
  reply text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists users (
  id text primary key,
  email text,
  nickname text,
  avatar text,
  phone text,
  member_type text default 'regular',
  status text default 'active',
  invitation_code text,
  invited_by text,
  created_at timestamptz default now(),
  last_login_at timestamptz,
  login_count int default 0,
  comments_count int default 0,
  favorites_count int default 0
);

create table if not exists consult_requests (
  id text primary key,
  created_at timestamptz default now(),
  name text not null,
  organization text,
  role text,
  email text,
  wechat text,
  phone text,
  topic text,
  background text,
  goals text,
  constraints text,
  commitment text,
  notes text,
  status text default 'new',
  reviewed_by text,
  reviewed_at timestamptz
);

create table if not exists system_settings (
  id int primary key,
  site_name text,
  site_logo text,
  site_description text,
  contact_email text,
  contact_phone text,
  seo_title text,
  seo_keywords text[] default '{}',
  seo_description text,
  allow_registration boolean default true,
  require_invitation boolean default false,
  comment_moderation boolean default true,
  about_title text,
  about_content text,
  team_title text,
  team_members jsonb default '[]'::jsonb,
  updated_at timestamptz default now(),
  updated_by text
);

insert into system_settings (id) values (1) on conflict (id) do nothing;

-- Strategic companion
create table if not exists client_projects (
  id text primary key,
  client_name text not null,
  project_name text,
  start_date date,
  end_date date,
  status text default 'active',
  description text,
  current_milestone_id text,
  current_goal_id text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists strategic_milestones (
  id text primary key,
  title text not null,
  description text,
  status text default 'pending',
  phase_order int default 0,
  core_goal text,
  deliverable text,
  participants text[] default '{}',
  outputs text[] default '{}',
  milestone_date text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists strategic_goals (
  id text primary key,
  title text not null,
  description text,
  progress int default 0,
  quarter text,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists goal_metrics (
  id text primary key,
  goal_id text references strategic_goals(id) on delete cascade,
  label text not null,
  value numeric,
  target numeric,
  unit text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists project_events (
  id text primary key,
  type text,
  title text not null,
  description text,
  event_date date,
  details text,
  participants int,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists project_documents (
  id text primary key,
  category text,
  title text not null,
  description text,
  doc_date date,
  meta text,
  file_type text,
  file_url text,
  file_size bigint,
  password_protected boolean default false,
  password text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists project_meetings (
  id text primary key,
  title text not null,
  meeting_date date,
  duration text,
  participants_count int,
  key_points text[] default '{}',
  attendees text[] default '{}',
  decisions text[] default '{}',
  action_items text[] default '{}',
  notes text,
  password_protected boolean default false,
  password text,
  sort_order int default 0,
  is_active boolean default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create table if not exists project_milestones (
  id text primary key,
  project_id text references client_projects(id) on delete cascade,
  milestone_id text references strategic_milestones(id) on delete cascade,
  status text default 'pending',
  start_date date,
  end_date date,
  actual_date date,
  notes text,
  sort_order int default 0,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Utility RPC-like functions (compatible with current supabase-oriented code)
create or replace function increment_views(content_type text, content_id text)
returns void as $$
begin
  if content_type = 'report' then
    update reports set views = coalesce(views,0)+1 where id = content_id;
  elsif content_type = 'insight' then
    update insights set views = coalesce(views,0)+1 where id = content_id;
  elsif content_type = 'book' then
    update books set views = coalesce(views,0)+1 where id = content_id;
  end if;
end;
$$ language plpgsql;

create or replace function increment_downloads(content_id text)
returns void as $$
begin
  update reports set downloads = coalesce(downloads,0)+1 where id = content_id;
end;
$$ language plpgsql;

create or replace function increment_likes(content_type text, content_id text)
returns void as $$
begin
  if content_type = 'insight' then
    update insights set likes = coalesce(likes,0)+1 where id = content_id;
  end if;
end;
$$ language plpgsql;

-- Triggers for updated_at
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT unnest(ARRAY['reports','insights','methodologies','books','comments','system_settings','client_projects','strategic_milestones','strategic_goals','goal_metrics','project_events','project_documents','project_meetings','project_milestones']) AS t LOOP
    EXECUTE format('drop trigger if exists trg_%I_updated_at on %I;', r.t, r.t);
    EXECUTE format('create trigger trg_%I_updated_at before update on %I for each row execute function set_updated_at();', r.t, r.t);
  END LOOP;
END $$;
