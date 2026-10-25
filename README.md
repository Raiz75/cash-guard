# Cash Guard

A **personal finance tracker** with account-based cloud storage — sign in and your data syncs across devices.

Cash Guard is a mobile-first **PWA** (Progressive Web App) for tracking income and expenses. Everything you enter is stored in your Supabase Postgres database, scoped to your account via Row Level Security (RLS), so the app works across devices once you sign in. The PWA shell installs like a native app on your phone or desktop.

> **Try it live:** [cash-guard-jet.vercel.app](https://cash-guard-jet.vercel.app)

![Stack](https://img.shields.io/badge/Next.js_16-000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-Postgres%20%2B%20Auth-3ECF8E?logo=supabase&logoColor=white)
![PWA](https://img.shields.io/badge/PWA-installable-green)

---

## Why Cash Guard

- **Account-based.** Sign in with email + password; your data follows you across devices.
- **Private by design.** Row Level Security scopes every row to your account; no telemetry, no ads. The publishable key is public and RLS is the security boundary.
- **Free to run.** Supabase free tier + Vercel hosting; nothing to pay for.
- **Online-first.** Data requires a connection; the PWA shell still installs and updates offline.
- **Yours to keep.** CSV export/import (Settings) remains available as a backup/migration aid.

## Features

- **Dashboard** — total balance, income vs. expenses, spending by category, and recent transactions at a glance
- **Transactions** — add, edit, and delete income & expenses; filter by type, category, and date range; search; live running totals
- **Budgets** — monthly budget with per-category breakdowns and tiered warnings
- **Settings** — manage your own categories (with icon + color), import CSV, and export your data as CSV or a JSON backup
- **PWA** — installable on mobile and desktop, with offline shell + automatic updates
- **Dark / light mode** — follows your system, toggle in the header
- **Automatic updates** — Cash Guard checks for new versions and lets you apply them when you're ready

## How your data is stored

Cash Guard stores everything in **Supabase Postgres**, scoped per user via Row Level Security:

- `transactions` — each income/expense record (type, amount, category, description, date)
- `categories` — the income/expense categories you define (name, icon, color)
- `budgets` — per-category budget breakdowns

The interface updates live as you interact — there's no save button and no refresh needed. Data syncs across devices once signed in. **Settings → Export CSV / Download JSON backup** remains available as a backup.

## Tech stack

| Layer     | Choice                                                        |
| --------- | ------------------------------------------------------------- |
| Framework | [Next.js 16](https://nextjs.org) (App Router)                 |
| Language  | [TypeScript](https://www.typescriptlang.org/)                 |
| Styling   | [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com) (Base UI, "maia" preset) |
| Icons     | [Tabler Icons](https://tabler.io/icons)                       |
| Forms     | React Hook Form + [Zod](https://zod.dev)                      |
| Data      | [Supabase](https://supabase.com) (Postgres + Auth) + [TanStack Query](https://tanstack.com/query) |
| PWA       | Web App Manifest + custom service worker                      |
| Theme     | [next-themes](https://github.com/pacocoursey/next-themes)     |

## License

Private project for personal use.