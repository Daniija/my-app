# Cyber Defence Unit — Week 1 Full-Stack Build

This is the first production-oriented build of the October 2026 Cybersecurity Month game planned in ChatGPT.

## Included now

- Passwordless work-email login through Supabase Auth
- First-time cyber-alias registration
- Four-Friday mission schedule stored in PostgreSQL
- Server/database-authoritative timed unlocks
- Mission 1: **The Breach**
  - incident briefing
  - 10 evidence artefacts
  - evidence review/classification
  - attack theory
  - attack-sequence reconstruction
  - strongest-evidence selection
  - containment decision
  - hints
  - server-side/DB-side scoring
  - resumable progress
  - duplicate-submission protection
  - result + Week 2 cliffhanger
- Persistent cumulative leaderboard table
- Live leaderboard using Supabase Realtime/Postgres Changes + 30-second fallback refresh
- Hidden Intelligence Vault + Week 1 code
- Admin Mission Control with scheduled/open/locked/closed controls
- Row Level Security policies
- Audit records for official submission / code redemption
- Automated test scaffolding

## Accounts you need

### Required: Supabase
Create a Supabase account and a new project. Supabase supplies:
- PostgreSQL database
- Auth
- API
- Realtime

From the Supabase project **Connect** dialog copy:
- Project URL
- Publishable key

For future server-only administration, also copy the **service-role key** and keep it secret. Never put the service-role key in a `NEXT_PUBLIC_...` environment variable.

### Recommended for deployment: Vercel
You do not need Vercel to develop locally. Create a Vercel account when you are ready to place the game online. Import the Git repository, add the same environment variables, then deploy.

### Recommended: GitHub
Not technically required, but strongly recommended for source control and easy Vercel deployment.

No separate database, Redis, Firebase, or dedicated websocket provider is needed for this first version.

## Setup

1. Install Node.js 20+ (22 recommended).
2. In this folder run:

```bash
npm install
```

3. Create a Supabase project.
4. In Supabase -> SQL Editor, paste and run:

`supabase/migrations/001_initial.sql`

5. Copy `.env.example` to `.env.local` and fill in:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
SUPABASE_SERVICE_ROLE_KEY=your_server_only_service_role_key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

6. In Supabase Auth settings add these redirect URLs for local development:

- `http://localhost:3000/auth/callback`

When deployed, also add:

- `https://YOUR-DOMAIN/auth/callback`

7. Start development:

```bash
npm run dev
```

Open `http://localhost:3000`.

## Create the Cyber Admin

First sign in once and create your player profile. Then, in the Supabase SQL Editor, promote that account by email:

```sql
update public.profiles
set role='admin'
where email='YOUR-WORK-EMAIL@example.com';
```

Then visit `/admin`.

## Mission schedule

Database schedule (America/Jamaica / UTC-05):

- Mission 1 — The Breach: Oct 9, 2026 at 9:00 AM
- Mission 2 — The Digital Footprint: Oct 16, 2026 at 9:00 AM
- Mission 3 — Trust No One: Oct 23, 2026 at 9:00 AM
- Mission 4 — Zero Hour: Oct 30, 2026 at 9:00 AM

The mission route does not trust the employee's computer clock. The database `now()` determines availability.

## Testing Week 1 before October 9

Use the admin screen and choose **Open now** for Mission 1, or temporarily set the mission status in Supabase:

```sql
update public.missions set status='forced_open' where id=1;
```

After testing:

```sql
update public.missions set status='scheduled' where id=1;
```

## Hidden Week 1 intelligence code

The current seeded demonstration code is:

`HORIZON-47`

Change it before the real event if testers have seen this repository.

## Important production tasks before launch

- Replace demonstration company names/domains with your fictional/approved organisation details.
- Change the hidden code.
- Configure the Supabase email sender/template so the sign-in email matches the Cyber Defence Unit branding.
- Run usability tests with 5–8 users.
- Run browser tests on the actual office devices.
- Load-test 75–100 simulated sessions.
- Confirm RLS tests.
- Confirm Mission 2 remains inaccessible before its unlock time.
- Create a database backup/export before each Friday.

## Architecture

```text
Employee Browser
    |
    +-- Next.js player portal
    |      +-- Dashboard
    |      +-- Week 1 game
    |      +-- Intelligence Vault
    |      +-- Leaderboard window
    |
    +-- Next.js server routes
              |
              +-- Supabase Auth
              +-- PostgreSQL + RLS
              +-- scoring stored functions
              +-- leaderboard table
              +-- Realtime subscription
```

## Notes

The score answer key is enforced inside the PostgreSQL function `submit_week1_attempt`; it is not returned to the player browser before submission. One `(player, mission)` attempt and one official score are enforced through unique constraints, so refreshes, multiple tabs, and double-clicked submissions cannot create multiple official scores.
