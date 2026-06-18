# MarketOS Supabase Setup

MarketOS is records-only. Supabase stores business records and evidence metadata; it does not hold money, move payments, or create wallets.

## 1. Create Project

Create a Supabase project, then copy:

- Project URL
- Public anon key

Create `MarketOS/.env` from `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 2. Run Schema

Open Supabase SQL Editor and run:

```text
MarketOS/supabase/schema.sql
```

This creates:

- business workspaces
- members
- products
- customers
- sales and sale items
- expenses
- debts
- stock movements
- transaction evidence
- scan drafts
- activity log
- private `marketos-evidence` storage bucket

## 3. Auth Providers

Email/password works with Supabase Auth by default.

For Google sign-in, enable Google in Supabase Auth Providers and add your app URL to the allowed redirect URLs.

## 4. Local Run

```bash
npm install
npm run dev
```

Without `.env`, MarketOS stays in demo mode. With `.env`, setup and reviewed records persist to Supabase.
