# MarketOS Supabase And Deployment Setup

MarketOS is records-only. Supabase stores business records and evidence metadata; it does not hold money, move payments, or create wallets.

## 1. Security First

If any secret key was copied into chat, screenshots, or frontend code, rotate/delete it in Supabase before launch.

Use only the public browser key in MarketOS:

- `sb_publishable_...`
- or the legacy anon key beginning with `eyJ...`

Never use a `sb_secret_...` or `service_role` key in Vite, React, or Vercel frontend env vars.

## 2. Create Project

Create a Supabase project, then copy:

- Project URL
- Public anon key

Create `MarketOS/.env` from `.env.example`:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
```

## 3. Run Schema

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

If Supabase says a type, table, or policy already exists, the schema was probably run partially before. Stop and make the schema rerun-safe before running it again.

## 4. Auth Providers

Email/password works with Supabase Auth by default.

In Supabase Auth URL settings, add:

- Local URL: `http://localhost:5175`
- Local fallback: `http://localhost:5173`
- Vercel production URL after deployment

For Google sign-in, enable Google in Supabase Auth Providers and add the same app URLs to the allowed redirect URLs.

## 5. Vercel Deployment

Import this GitHub repository:

```text
michaelkeane036-cmyk/MarketOS
```

Use these settings:

- Framework preset: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

Add environment variables in Vercel Project Settings:

```bash
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-publishable-or-anon-key
```

Redeploy after adding env vars.

## 6. Local Run

```bash
npm install
npm run dev
```

Without `.env`, MarketOS stays in demo mode. With `.env`, setup and reviewed records persist to Supabase.

## 7. Smoke Test

After Supabase and Vercel are connected:

- Create an account with email/password.
- Create the first business profile.
- Add one sale, one expense, one stock entry, and one debt.
- Confirm Today metrics update after each saved record.
- Test scan/upload and confirm it opens the review flow before saving.
- Check Supabase tables for created rows in businesses, products, sales, expenses, debts, stock movements, evidence, and activity log.
- Confirm the app still says records-only and never creates a wallet, escrow, payment collection, or money custody flow.
