# Cash Guard

A **personal finance tracker** that runs entirely in your browser — no account, no backend, no data leaving your device.

Cash Guard is a mobile-first **PWA** (Progressive Web App) for tracking income and expenses. Everything you enter is stored in your browser's own IndexedDB via Dexie, so the app works fully offline, installs like a native app on your phone or desktop, and costs nothing to host.

> **Try it live:** [cash-guard-jet.vercel.app](https://cash-guard-jet.vercel.app)

![Stack](https://img.shields.io/badge/Next.js_16-000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Dexie](https://img.shields.io/badge/Dexie-IndexedDB-blue)
![PWA](https://img.shields.io/badge/PWA-installable-green)

---

## Why Cash Guard

Most finance apps either send your data to a cloud you don't control or lock you into a subscription. Cash Guard takes the opposite approach:

- **Local-first.** All your data lives in your browser. Nothing is ever sent to a server.
- **Private by design.** No accounts, no telemetry, no cloud sync, no ads — your financial data is yours alone.
- **Free to run.** Because there's no server, there's nothing to pay for.
- **Works offline.** On a plane, in a dead zone, anywhere — Cash Guard keeps working.
- **Free to keep.** Your data stays on your device and is easy to back up and move.

## Features

- **Dashboard** — total balance, income vs. expenses, spending by category, and recent transactions at a glance
- **Transactions** — add, edit, and delete income & expenses; filter by type, category, and date range; search; live running totals
- **Settings** — manage your own categories (with icon + color), import CSV, and export your data as CSV or a JSON backup
- **PWA** — installable on mobile and desktop, with offline support
- **Dark / light mode** — follows your system, toggle in the header
- **Automatic updates** — Cash Guard checks for new versions and lets you apply them when you're ready

## How your data is stored

Cash Guard uses **IndexedDB** (via [Dexie](https://dexie.org)) directly in your browser. Two tables hold everything:

- `transactions` — each income/expense record (type, amount, category, description, date)
- `categories` — the income/expense categories you define (name, icon, color)

The interface updates live as you type — there's no save button and no refresh needed. Because data is per-browser, **use Settings → Export CSV or Download JSON backup** to move your records to another device.

## Tech stack

| Layer     | Choice                                                        |
| --------- | ------------------------------------------------------------- |
| Framework | [Next.js 16](https://nextjs.org) (App Router)                 |
| Language  | [TypeScript](https://www.typescriptlang.org/)                 |
| Styling   | [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com) (Base UI, "maia" preset) |
| Icons     | [Tabler Icons](https://tabler.io/icons)                       |
| Forms     | React Hook Form + [Zod](https://zod.dev)                      |
| Storage   | [Dexie](https://dexie.org) (IndexedDB) + live queries         |
| PWA       | Web App Manifest + custom service worker                      |
| Theme     | [next-themes](https://github.com/pacocoursey/next-themes)     |

## License

Private project for personal use.
