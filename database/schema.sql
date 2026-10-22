-- ═══════════════════════════════════════════════════════════
-- EV Fleet Vehicle Condition Audit — Supabase Schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor)
-- ═══════════════════════════════════════════════════════════

-- ── 1. Vehicles master list ──────────────────────────────────
create table if not exists vehicles (
  id          uuid primary key default gen_random_uuid(),
  vehicle_no  text not null unique,
  city        text not null,
  center      text,
  sm          text,
  director    text,
  status      text default 'Working',
  created_at  timestamptz default now()
);
create index on vehicles(city);
create index on vehicles(sm);

-- ── 2. SPOC list ─────────────────────────────────────────────
create table if not exists spocs (
  id         uuid primary key default gen_random_uuid(),
  name       text not null,
  city       text not null,
  created_at timestamptz default now(),
  unique(name, city)
);

-- ── 3. Audit responses ───────────────────────────────────────
create table if not exists audit_responses (
  id                      uuid primary key default gen_random_uuid(),
  -- Who / where / when
  spoc_name               text not null,
  city                    text not null,
  center                  text,
  vehicle_no              text not null,
  sm                      text,
  director                text,
  working_status          text,
  -- Body & Frame checks (value: 'OK' | 'Not OK' | 'N/A')
  body_dents              text,
  body_dents_remark       text,
  body_windscreen         text,
  body_windscreen_remark  text,
  body_mirrors            text,
  body_mirrors_remark     text,
  body_frame              text,
  body_frame_remark       text,
  body_doors              text,
  body_doors_remark       text,
  body_tyres              text,
  body_tyres_remark       text,
  -- Electrical checks
  elec_charger_port       text,
  elec_charger_port_remark text,
  elec_wiring             text,
  elec_wiring_remark      text,
  elec_lights             text,
  elec_lights_remark      text,
  elec_dashboard          text,
  elec_dashboard_remark   text,
  elec_horn               text,
  elec_horn_remark        text,
  elec_brake              text,
  elec_brake_remark       text,
  -- Overall
  overall_condition       integer check (overall_condition between 1 and 5),
  immediate_action        text check (immediate_action in ('Yes', 'No')),
  action_details          text,
  additional_remarks      text,
  -- Photo URLs (Supabase Storage paths)
  photo_front             text,
  photo_back              text,
  photo_left              text,
  photo_right             text,
  photo_damage            text,
  -- Meta
  is_duplicate            boolean default false,
  submitted_at            timestamptz default now()
);
create index on audit_responses(vehicle_no);
create index on audit_responses(city);
create index on audit_responses(sm);
create index on audit_responses(submitted_at);

-- ── 4. Storage bucket (run once) ─────────────────────────────
-- In Supabase Dashboard → Storage → New bucket:
--   Name: audit-photos   Public: true
-- Or via SQL:
-- insert into storage.buckets (id, name, public) values ('audit-photos', 'audit-photos', true);

-- ── 5. RLS Policies (adjust as needed) ───────────────────────
alter table vehicles        enable row level security;
alter table spocs           enable row level security;
alter table audit_responses enable row level security;

-- Allow anyone (anon) to read vehicles + spocs (needed for form)
create policy "public read vehicles" on vehicles for select using (true);
create policy "public read spocs"    on spocs    for select using (true);

-- Allow anyone to insert audit responses (SPOCs are not logged in)
create policy "public insert audits" on audit_responses for insert with check (true);

-- Allow anyone to read audits (dashboard reads aggregate data)
create policy "public read audits" on audit_responses for select using (true);

-- ── 6. Sample seed data ───────────────────────────────────────
insert into spocs (name, city) values
  ('Rahul Sharma',  'Delhi'),
  ('Rahul Sharma',  'Gurgaon'),
  ('Priya Singh',   'Mumbai'),
  ('Priya Singh',   'Pune'),
  ('Amit Kumar',    'Bangalore'),
  ('Neha Joshi',    'Chennai'),
  ('Neha Joshi',    'Coimbatore')
on conflict do nothing;

insert into vehicles (vehicle_no, city, center, sm, director, status) values
  ('DL01EV001', 'Delhi',      'Okhla Hub',      'Vikram Anand',   'Suresh Patil',    'Working'),
  ('DL01EV002', 'Delhi',      'Okhla Hub',      'Vikram Anand',   'Suresh Patil',    'Working'),
  ('DL01EV003', 'Delhi',      'Rohini Center',  'Manish Gupta',   'Suresh Patil',    'Breakdown'),
  ('MH01EV001', 'Mumbai',     'Andheri Hub',    'Pooja Mehta',    'Ramesh Rao',      'Working'),
  ('MH01EV002', 'Mumbai',     'Andheri Hub',    'Pooja Mehta',    'Ramesh Rao',      'Working'),
  ('KA01EV001', 'Bangalore',  'Whitefield Hub', 'Arjun Nair',     'Deepak Sharma',   'Working'),
  ('KA01EV002', 'Bangalore',  'Whitefield Hub', 'Arjun Nair',     'Deepak Sharma',   'Idle'),
  ('TN01EV001', 'Chennai',    'OMR Center',     'Sundaram Raja',  'Ganesh Kumar',    'Working'),
  ('HR01EV001', 'Gurgaon',    'Sector 18 Hub',  'Anil Yadav',     'Suresh Patil',    'Working')
on conflict do nothing;
