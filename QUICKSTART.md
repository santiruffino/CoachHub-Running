# Quick Start Guide

## First Time Setup

### 1. Install Dependencies

```bash
cd frontend
npm install
```

### 2. Configure Supabase

Create `frontend/.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SECRET_KEY=your-secret-key
NEXT_PUBLIC_APP_URL=http://localhost:3001
```

### 3. Set Up Database

Run the SQL from `supabase/migrations/*.sql` in order (or run them via your Supabase migration workflow).

Historical manual scripts are available under `supabase/queries/legacy/` for reference.

### 4. Create First Coach

```bash
cd frontend
npx tsx scripts/create-coach.ts
```

Enter email, password, and name when prompted.

### 5. Start Development Server

```bash
npm run dev
```

Visit http://localhost:3001 and login!

## That's It! 🎉

See [README.md](./README.md) for detailed documentation.
