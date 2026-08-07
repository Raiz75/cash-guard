# Cash Guard — Personal Finance Tracker

A **mobile-first PWA** for tracking personal income and expenses. Data lives entirely in your browser (IndexedDB), so it works fully offline with no backend, no accounts, and **$0 to host**.

![Stack](https://img.shields.io/badge/Next.js_16-000?logo=nextdotjs&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Dexie](https://img.shields.io/badge/Dexie-IndexedDB-blue)
![PWA](https://img.shields.io/badge/PWA-installable-green)

---

## ✨ Features

- **Dashboard** — total balance, current-month income/expenses, spending-by-category breakdown, recent transactions
- **Transactions** — add / edit / delete income & expenses, filter by type, category, and search, live income/expense/net totals
- **Settings** — manage categories (with Tabler icons), export CSV, and download a JSON backup
- **Local-first & offline** — everything stored in IndexedDB via Dexie; no server or database required
- **PWA** — installable on mobile/desktop, offline-capable, service worker included
- **Dark / light mode** — automatic with system preference, toggle in the header

---

## 🧱 Tech Stack

| Layer     | Choice                                             |
| --------- | -------------------------------------------------- |
| Framework | [Next.js 16](https://nextjs.org) (App Router)      |
| Language  | [TypeScript](https://www.typescriptlang.org/)      |
| Styling   | [Tailwind CSS](https://tailwindcss.com) v4 + [shadcn/ui](https://ui.shadcn.com) (Base UI, "maia" preset) |
| Icons     | [Tabler Icons](https://tabler.io/icons)            |
| Forms     | React Hook Form + [Zod](https://zod.dev)           |
| Storage   | [Dexie](https://dexie.org) (IndexedDB) + `dexie-react-hooks` live queries |
| PWA       | Web App Manifest + custom service worker           |
| Theme     | [next-themes](https://github.com/pacocoursey/next-themes) |

> **No server-side database.** This project has no API routes, no ORM, and no environment-secret configuration. All persistence happens in the browser via IndexedDB, which keeps hosting free and the codebase small.

## 🗄️ How Data is Stored

Data is stored **locally in your browser** using IndexedDB (via Dexie). The app never sends your financial data to any server.

Two tables:

- `transactions` — each income/expense record (type, amount, category, description, date)
- `categories` — user-defined income/expense categories (name, Tabler icon, color)

**Live updates:** the UI is driven by `useLiveQuery`, so the dashboard, lists, and totals re-render automatically whenever data changes. No manual refresh needed.

**Back up your data:** use **Settings → Export CSV** or **Download JSON backup**. Since data is per-browser, this is how you move your records between devices.

## 📁 Project Structure

```
cash-guard/
├── app/                  # Next.js App Router pages
│   ├── page.tsx           # Dashboard
│   ├── transactions/      # Transactions list
│   └── settings/          # Settings (categories, export)
├── components/
│   ├── ui/                # shadcn/ui (maia preset) components
│   ├── shared/            # Header, BottomNav, CategoryIcon, ThemeProvider
│   ├── dashboard/         # Dashboard feature components
│   ├── transactions/      # Transaction form, list, filters, dialogs
│   └── settings/          # Settings feature components
├── lib/
│   ├── db/
│   │   ├── schema.ts       # Dexie schema + tables + seeding
│   │   └── repository.ts   # CRUD operations against IndexedDB
│   ├── hooks/              # useLiveQuery hooks, useHydrated
│   ├── validations/        # Zod schemas
│   └── format.ts           # PHP currency, date, file download helpers
├── public/
│   ├── manifest.webmanifest # PWA manifest
│   ├── sw.js                # Service worker (offline)
│   └── icons/               # PWA icons
└── components.json         # shadcn/ui config
```

## 🧑‍💻 Local Development

> **Requires Node.js ≥ 20.9** (Next.js 16 requirement). Node 18 will fail to build.

```bash
# 1. Install dependencies
npm install

# 2. Start the dev server
npm run dev

# 3. Open the app
open http://localhost:3000
```

### Useful scripts

| Command            | Description                      |
| ------------------ | -------------------------------- |
| `npm run dev`      | Start development server         |
| `npm run build`    | Create an optimized production build |
| `npm run start`    | Serve the production build       |
| `npm run lint`     | Run ESLint                       |

## 🌤️ Deploy to Vercel (free)

Because the app is fully static/local-first, deploying is trivial.

**Option A — via GitHub + Vercel (recommended):**

1. Push this repo to GitHub.
2. Go to [vercel.com/new](https://vercel.com/new), import the repo.
3. **No environment variables.** Click **Deploy**.
4. Done — your app is live with a free public URL, automatically SSL.

**Option B — Vercel CLI:**

```bash
npm i -g vercel
vercel
vercel --prod
```

> No `TURSO_*`, `DATABASE_URL`, or postgres env vars are needed — there is no remote database. Any security/network-scanning concerns don't apply because there are no secrets.

## 🧪 Testing / Linting

```bash
npm run lint
```

## 🔮 Future Ideas

- Monthly budgets and spending limits
- Recurring transactions
- Multi-currency support
- Cross-device sync via a cloud layer (local-first stays default)
- Native mobile app (React Native)

## 📄 License

Private project for personal use.