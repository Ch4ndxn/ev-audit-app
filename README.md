# EV Fleet Audit App

Mobile-first React web app for auditing 3-wheeler EV fleet condition (Delhivery).

## Features

- **Audit Form** — SPOC identification, vehicle selection, 12-point checklist (6 body + 6 electrical), photo capture (4 mandatory angles + optional damage close-up), overall condition rating, and submission
- **Dashboard** — City-wise and SM-wise pendency tracking with progress bars and flagged vehicle counts
- **Photo compression** — Client-side Canvas compression before upload (max 1200px, 80% quality)
- **Demo mode** — Works out of the box without Supabase credentials using mock data

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env
# Fill in your Supabase URL, anon key, and dashboard token

# 3. Set up database
# Paste contents of database/schema.sql into Supabase SQL editor and run

# 4. Start dev server
npm run dev
```

App runs at `http://localhost:5173`

Dashboard URL: `http://localhost:5173/dashboard?token=YOUR_TOKEN`

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `VITE_DASHBOARD_TOKEN` | Secret token to protect the dashboard (leave blank to disable auth) |

Without Supabase vars set, the app runs in **demo mode** with sample data — nothing is saved.

## Project Structure

```
src/
  components/
    audit/
      ChecklistSection.tsx   — 12-point checklist (OK / Not OK / N/A pills)
      PhotoSection.tsx       — 4-angle + damage photo capture with compression
    ui/
      SearchDropdown.tsx     — Searchable dropdown with "already audited" indicators
      Toast.tsx              — Floating toast notification
  lib/
    supabase.ts              — Supabase client + DEMO_MODE flag
    db.ts                    — All data access (SPOC/vehicle fetch, saveAudit, uploadPhoto, dashboard)
  pages/
    AuditPage.tsx            — Main audit form (SPOC step → vehicle → checklists → assessment → photos)
    DashboardPage.tsx        — Dashboard (city view + SM view, token-gated)
  types/
    index.ts                 — TypeScript interfaces
database/
  schema.sql                 — Supabase PostgreSQL schema + RLS policies + seed data
```

## Database Setup

Run `database/schema.sql` in Supabase SQL Editor. It creates:

- `vehicles` — Fleet master (vehicle_no, city, center, sm, director, status)
- `spocs` — SPOC → city mapping
- `audit_responses` — All audit submissions
- `audit-photos` storage bucket (public)
- RLS policies for public read/insert

Seed data includes 9 sample vehicles across 3 cities and 7 SPOCs.

## Tech Stack

React 18 · TypeScript · Vite · Tailwind CSS · Supabase · React Router v6 · Lucide React
