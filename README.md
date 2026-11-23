# My Life Dashboard

A calm, responsive personal dashboard for **money, work, daily tasks, and health** — built with the MERN stack (MongoDB, Express, React, Node) and JWT authentication.

The app is designed around one idea: keep the important things visible without turning your life into a spreadsheet. Every account only ever sees its own data.

---

## Features

### Dashboard overview
- Greeting, today's date, and a short "what matters today" summary.
- Customisable summary cards: today's tasks, work deadlines, monthly money, budget left, health today.
- Charts for spending by category, seven-day task momentum, and a seven-day health trend (sleep / water / movement).
- Today's focus list with quick-add, upcoming deadlines, budget watch, and today's health snapshot.
- In-app reminder banner for tasks whose reminder time has passed.

### Money
- Add, edit, delete, and search income and expenses.
- Month navigation, filters by type, category, date range, and free-text search.
- Paginated transaction list.
- Monthly category budgets with planned / spent / left totals.
- Budget warnings at 80% ("near limit") and 100% ("over").
- Spending donut, six-month income-vs-expense bars, and per-category progress.

### Work
- Projects with description, priority, status, deadline, and accent colour.
- List view with progress, task counts, and overdue indicators.
- Kanban board (To do / In progress / Done) with status changes.
- Deadline radar for the next few project dates.
- Project detail modal with its task list, progress, edit, and delete.
- Work tasks are linked to projects; personal tasks stay separate.

### Daily tasks
- Full CRUD, complete / reopen, priority, category, notes, due date, reminder, recurrence.
- Today / Upcoming / Completed views.
- Quick-add with a due date.
- Search and filter by priority and category.
- Recurring tasks automatically create the next occurrence when completed.

### Health
- Daily check-in for water, sleep, exercise minutes, mood, meals, and notes.
- Private daily logs, editable and deletable, unique per account per day.
- Health goals for water, sleep, exercise, meals, or mood over daily / weekly / monthly periods.
- Goal progress rings and bars.
- Seven- or thirty-day trends for each metric, plus averages.
- History list of past check-ins.

### Account & privacy
- Update name and email.
- Change currency (INR default, plus USD, EUR, GBP).
- Choose which dashboard summary cards are visible.
- Change password.
- Privacy overview and session details.

### Authentication & security
- Register / sign in with server-side and client-side validation.
- Passwords hashed with bcrypt (12 rounds) — never stored or returned as plain text.
- Signed JWTs (`Authorization: Bearer …`), with expiry.
- Every query is scoped to the signed-in user id.
- Helmet, CORS allow-list, request body limits, and auth rate limiting.
- Zod schemas validate every write on the server.

---

## Tech stack

| Layer | Tools |
| --- | --- |
| Frontend | React 18, Vite, React Router, hand-built SVG charts, custom CSS |
| Backend | Node.js, Express, Mongoose, Zod, JWT, bcryptjs |
| Database | MongoDB (local or Atlas); optional in-memory MongoDB for zero-setup previews |
| Fonts | Fraunces (display) + Inter (UI) from Google Fonts |

No UI framework or state library is used — the design system and components are intentionally small and readable.

---

## Quick start

### Prerequisites
- **Node.js 18+** and npm
- **MongoDB** running locally, a **MongoDB Atlas** connection string, **or** nothing at all (see Option A)

### Option A — zero-setup preview (in-memory MongoDB)

This starts the API with a temporary MongoDB and fresh demo data. Data resets when the API stops.

**Terminal 1**
```bash
cd backend
npm install
npm run dev:memory
```

**Terminal 2**
```bash
cd frontend
npm install
npm run dev
```

Open **http://localhost:5173**.

Demo account:

```
Email:    demo@mylifedashboard.app
Password: Demo1234!
```

The sign-in page also has a **Fill demo details** button.

> The first `dev:memory` run downloads a MongoDB binary (and on Windows may require the Microsoft Visual C++ 2015–2022 Redistributable). See [Troubleshooting](#troubleshooting).

### Option B — local MongoDB or Atlas

1. Create the environment files:

   ```bash
   cd backend
   cp .env.example .env
   ```

   On PowerShell:
   ```powershell
   Copy-Item .env.example .env
   ```

2. Edit `backend/.env`:
   - Set `MONGODB_URI` (local example: `mongodb://127.0.0.1:27017/my_life_dashboard`).
   - Set a long random `JWT_SECRET`.
   - Keep `CLIENT_URL=http://localhost:5173`.

3. Install, seed, and run:

   ```bash
   npm install
   npm run seed
   npm run dev
   ```

4. In another terminal:

   ```bash
   cd frontend
   npm install
   npm run dev
   ```

For Atlas, use a connection string such as:
```
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/my_life_dashboard?retryWrites=true&w=majority
```
and allow your IP address in Atlas.

If the API runs somewhere other than `http://localhost:5000`, create `frontend/.env`:
```
VITE_API_URL=http://localhost:5000/api
```

---

## Use on iPhone

The app is installable as a home-screen app and works over your local Wi-Fi.

1. Find your computer's LAN IP address:
   - Windows: `ipconfig` → look for **IPv4 Address** (for example `172.20.10.3`).
   - macOS / Linux: `ifconfig` or `ip addr`.

2. Start the backend bound to the network (already configured in `dev-memory.js` for the preview, or set `HOST=0.0.0.0` and restart a normal server). The API listens on `0.0.0.0:5000`.

3. Start the frontend:
   ```bash
   cd frontend
   npm run dev
   ```
   Vite is configured with `host: '0.0.0.0'`, so it is reachable from the phone.

4. On the iPhone, make sure it is on the **same Wi-Fi network**, then open Safari and visit:
   ```
   http://<your-computer-ip>:5173
   ```
   for example `http://172.20.10.3:5173`.

5. Sign in with the demo account (or register), then tap the **Share** button in Safari and choose **Add to Home Screen**. The app opens full-screen like a native app.

6. For the API to be reachable from the phone, either:
   - run the zero-setup preview (`npm run dev:memory` in `backend/`), which already allows any origin in development, or
   - set `CLIENT_URL=http://localhost:5173,http://<your-ip>:5173` in `backend/.env`.

Notes for iPhone:
- The service worker only registers in a secure context (HTTPS or localhost). Over plain HTTP on a LAN IP it will not cache offline, but the app still works online and can be added to the home screen.
- For a fully offline-capable install, serve the app over HTTPS (for example with a tunnel such as `ngrok http 5173`) or deploy it.
- The in-memory database resets when the API restarts. Use a real MongoDB (local or Atlas) for data you want to keep.

## Environment variables

### `backend/.env`
| Variable | Purpose | Default |
| --- | --- | --- |
| `PORT` | API port | `5000` |
| `NODE_ENV` | `development` / `production` | `development` |
| `MONGODB_URI` | MongoDB connection string | — |
| `JWT_SECRET` | Secret used to sign tokens | — |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `CLIENT_URL` | Comma-separated allowed frontend origins | `http://localhost:5173` |
| `USE_MEMORY_DB` | Use temporary in-memory MongoDB | `false` |
| `AUTO_SEED` | Seed demo data on boot | `false` |

### `frontend/.env`
| Variable | Purpose | Default |
| --- | --- | --- |
| `VITE_API_URL` | Base URL of the Express API, including `/api` | `http://localhost:5000/api` |

Both `.env.example` files are committed; real `.env` files are git-ignored.

---

## Scripts

### Backend (`backend/`)
| Command | What it does |
| --- | --- |
| `npm run dev` | Start the API with nodemon (needs `MONGODB_URI`) |
| `npm run dev:memory` | Start with temporary in-memory MongoDB + demo data |
| `npm start` | Start the API without nodemon |
| `npm run seed` | Seed the configured database with demo data |
| `npm run seed:memory` | Seed a temporary in-memory DB, then exit |

### Frontend (`frontend/`)
| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server at `http://localhost:5173` |
| `npm run build` | Production build into `dist/` |
| `npm run preview` | Preview the production build |

---

## Project structure

```
my-life-dashboard/
├── backend/
│   ├── scripts/
│   │   ├── dev-memory.js          # zero-setup API (in-memory Mongo + seed)
│   │   └── seed-memory.js
│   ├── src/
│   │   ├── config/db.js           # Mongo / in-memory connection
│   │   ├── middleware/            # auth, Zod validation, errors
│   │   ├── models/                # User, Transaction, Budget, Project,
│   │   │                          # Task, HealthLog, HealthGoal
│   │   ├── routes/                # auth, transactions, budgets, projects,
│   │   │                          # tasks, health, dashboard
│   │   ├── services/              # money + health aggregations
│   │   ├── utils/                 # dates, JWT, async handler
│   │   ├── seed/                  # demo data + seeder
│   │   ├── app.js                 # Express app
│   │   └── server.js              # entry point
│   ├── .env.example
│   └── package.json
├── frontend/
│   ├── src/
│   │   ├── components/            # UI primitives, charts, layout, task modal
│   │   ├── context/               # Auth + toast providers
│   │   ├── lib/                   # API client, fetch hook, formatting, constants
│   │   ├── pages/                 # Login, Register, Dashboard, Money, Work,
│   │   │                          # Tasks, Health, Account
│   │   ├── styles/index.css       # full design system + responsive rules
│   │   ├── App.jsx
│   │   └── main.jsx
│   ├── .env.example
│   ├── index.html
│   └── package.json
├── .gitignore
└── README.md
```

---

## API overview

All routes are prefixed with `/api`. Except for `ping`, `register`, and `login`, every route requires `Authorization: Bearer <token>`.

| Method | Endpoint | Description |
| --- | --- | --- |
| `GET` | `/ping` | Health check |
| `POST` | `/auth/register` | Create an account |
| `POST` | `/auth/login` | Sign in and receive a JWT |
| `GET` | `/auth/me` | Current user |
| `PATCH` | `/auth/profile` | Update name / email |
| `PUT` | `/auth/password` | Change password |
| `PATCH` | `/auth/preferences` | Currency + dashboard cards |
| `GET` | `/dashboard` | Aggregated data for every dashboard widget |
| `GET` | `/transactions` | List with `type`, `category`, `from`, `to`, `q`, `page`, `limit` |
| `GET` | `/transactions/summary` | Monthly totals, category breakdown, six-month trend, budgets, alerts |
| `GET` | `/transactions/categories` | Categories used by the account |
| `POST` / `PUT` / `DELETE` | `/transactions`, `/transactions/:id` | Create / update / delete |
| `GET` / `POST` | `/budgets` | List by `month` / create |
| `PUT` / `DELETE` | `/budgets/:id` | Update / delete |
| `GET` / `POST` | `/projects` | List with counts / create |
| `GET` | `/projects/:id` | Project + its tasks |
| `PUT` / `DELETE` | `/projects/:id` | Update (and cascade tasks on delete) |
| `GET` | `/tasks` | Filter by `project=personal\|work\|<id>`, `view=today\|upcoming\|completed\|all`, `q`, `priority`, `category` |
| `POST` / `PUT` / `DELETE` | `/tasks`, `/tasks/:id` | Create / update / delete |
| `PATCH` | `/tasks/:id/toggle` | Complete / reopen (creates next occurrence if recurring) |
| `PATCH` | `/tasks/:id/status` | Move between To do / In progress / Done |
| `GET` | `/health/overview?days=7\|30` | Today, logs, goals, averages, trend |
| `GET` / `POST` | `/health/logs` | List / upsert a daily log |
| `PUT` / `DELETE` | `/health/logs/:id` | Update / delete a log |
| `GET` / `POST` | `/health/goals` | List / create goals |
| `PUT` / `DELETE` | `/health/goals/:id` | Update / delete a goal |

Errors use a consistent shape:
```json
{
  "message": "Human-readable summary.",
  "errors": { "field": "Specific validation message." }
}
```

---

## Data model (short version)

- **User** — name, unique email, bcrypt `passwordHash`, preferences (currency, dashboard cards).
- **Transaction** — user, type, amount, category, date, payment method, notes.
- **Budget** — user, category, month (`YYYY-MM`), amount; unique per user/category/month.
- **Project** — user, name, description, status, priority, deadline, colour.
- **Task** — user, optional project, title, notes, category, priority, status, due date, reminder, recurrence, completion.
- **HealthLog** — user, local `YYYY-MM-DD` date, water, sleep, exercise, mood, meals, notes; unique per user/day.
- **HealthGoal** — user, title, metric, target, unit, period; progress computed server-side.

Health logs use a local calendar date string rather than a timestamp so "today" stays stable regardless of timezone.

---

## Design notes

- **Palette:** warm paper background, deep forest sidebar, sage / clay / honey / sky / plum accents.
- **Typography:** Fraunces for headings, Inter for interface text.
- **Layout:** desktop sidebar, mobile slide-over navigation, card-based content, generous spacing.
- **Charts:** dependency-free SVG components (`DonutChart`, `BarChart`, `LineChart`, `ProgressRing`).
- **States:** every data surface has loading skeletons, empty states, error states with retry, and toast feedback.
- **Accessibility:** labelled inputs, visible focus rings, keyboard-operable modal with focus trap and Escape, skip link, `aria-live` toasts, semantic headings, and chart `aria-label` summaries.
- **Motion:** subtle transitions, disabled under `prefers-reduced-motion`.

---

## Security notes

- Passwords are hashed with bcrypt at 12 rounds and are never included in API responses.
- JWTs are signed with `JWT_SECRET` and expire (default 7 days).
- Auth endpoints are rate-limited.
- Every database read/write is filtered by the authenticated user id.
- Validation is enforced on both the client and the server (Zod).
- The frontend stores the token in `localStorage` for simplicity. For a higher-security deployment, consider httpOnly cookies with CSRF protection.

---

## Troubleshooting

**`npm run dev:memory` fails while starting MongoDB on Windows**
Install the Microsoft Visual C++ 2015–2022 Redistributable (x64), then retry:
```powershell
winget install Microsoft.VCRedist.2015+.x64
```
The first run also downloads a MongoDB binary; later runs use the cache.

**"Cannot reach the server" in the browser**
- Make sure the API is running on port `5000`.
- Check `frontend/.env` → `VITE_API_URL` matches the API URL.
- Confirm `CLIENT_URL` in `backend/.env` includes `http://localhost:5173`.

**CORS error**
Add the exact frontend origin (including port) to the comma-separated `CLIENT_URL` value and restart the API.

**Port already in use**
Change `PORT` in `backend/.env` and update `VITE_API_URL` in `frontend/.env` to match.

**No demo data**
Run `npm run seed` (Option B) or use `npm run dev:memory` (Option A). In-memory data always resets on restart.

**Health check-in button does nothing**
This was a browser validation issue with seeded decimal sleep values; the inputs now accept `0.1` hour sleep steps and `1` minute exercise steps.

---

## Deploy to production

The repo includes deployment config for **Render** (backend) and **Vercel** (frontend). You only need a free MongoDB Atlas cluster.

### 1. Database — MongoDB Atlas
1. Create a free M0 cluster at https://cloud.mongodb.com.
2. Add a database user and allow your IP (or `0.0.0.0/0` for Render's dynamic IPs).
3. Copy the connection string, e.g.
   ```
   mongodb+srv://<user>:<password>@<cluster>.mongodb.net/my_life_dashboard?retryWrites=true&w=majority
   ```

### 2. Backend — Render
1. Push this repo to GitHub (see commands below).
2. In Render, choose **New → Blueprint** and select the repo. `render.yaml` at the root configures the service:
   - Root directory: `backend`
   - Build: `npm install`
   - Start: `npm start`
   - Health check: `/api/ping`
3. Set the secret env vars in the Render dashboard:
   - `MONGODB_URI` = your Atlas connection string
   - `CLIENT_URL` = your frontend URL (add it after step 3; you can update later)
   - `JWT_SECRET` is auto-generated by the blueprint.
4. Deploy. Note the service URL, e.g. `https://my-life-dashboard-api.onrender.com`.

Seed the production database once:
```bash
# locally, with the Atlas URI in backend/.env
cd backend
MONGODB_URI="mongodb+srv://..." npm run seed
```
(On Windows PowerShell: `$env:MONGODB_URI="..."; npm run seed`.)

### 3. Frontend — Vercel
1. In Vercel, **New Project → Import** the GitHub repo.
2. Set **Root Directory** to `frontend`. Vercel auto-detects Vite.
3. Add an environment variable:
   - `VITE_API_URL` = `https://my-life-dashboard-api.onrender.com/api`
4. Deploy. `frontend/vercel.json` adds the SPA rewrite so client-side routing works.

### 4. Wire the two together
1. Copy your Vercel URL (e.g. `https://my-life-dashboard.vercel.app`).
2. In Render, set `CLIENT_URL` to that URL (and `http://localhost:5173` if you still want local dev) and redeploy the backend.
3. Reload the frontend — it should now talk to the production API.

### Push to GitHub
```bash
cd C:\Users\Atul2005\my-life-dashboard
git branch -M main
# create an empty repo on GitHub first, then:
git remote add origin https://github.com/<you>/my-life-dashboard.git
git push -u origin main
```

### Other hosts
- **Railway / Fly.io**: same idea — backend root `backend`, start `npm start`, set the env vars above.
- **Netlify / Cloudflare Pages**: equivalent to Vercel; set root to `frontend`, build `npm run build`, output `dist`, and add the same SPA rewrite.

### Production checklist
- `NODE_ENV=production` on the backend.
- `JWT_SECRET` is long and random (Render generates one).
- `CLIENT_URL` exactly matches the deployed frontend origin (including `https://`).
- `VITE_API_URL` points at the deployed API with `/api` suffix.
- Run the seed once against Atlas so the demo account exists.
- Free Render services sleep after ~15 minutes of inactivity; the first request wakes them (a few seconds).

## iOS app (Capacitor)

The `frontend/` folder is set up with [Capacitor](https://capacitorjs.com) so the same web app can ship as a native iPhone app. The iOS project lives in `frontend/ios/`.

### Prerequisites (Mac required)
- A Mac with **Xcode 15+** installed.
- An **Apple Developer account** (free account works for running on your own device; paid account needed for the App Store).
- Node.js 18+ and npm.

### Build & run on a simulator / device
1. Edit `frontend/.env.production` and set `VITE_API_URL` to your deployed backend:
   ```
   VITE_API_URL=https://your-render-service.onrender.com/api
   ```
2. From `frontend/`:
   ```bash
   npm install
   npm run build
   npx cap sync ios
   npx cap open ios
   ```
3. In Xcode, select a simulator (or your connected iPhone) and press **Run** (▶).

### App icons & splash screen
Capacitor does not generate icons automatically. To add them:
1. Export a 1024×1024 PNG of your icon (you can render `frontend/public/icon.svg` in any image editor).
2. Install the asset generator:
   ```bash
   npm install -D @capacitor/assets
   ```
3. Put the PNG at `frontend/resources/icon.png` (and `splash.png` at 2732×2732) and run:
   ```bash
   npx capacitor-assets generate --ios
   npx cap sync ios
   ```

### Notes
- The native app bundles the built web assets, so it works offline for the shell; data calls still need the deployed API.
- iOS requires HTTPS for the API in production (Render provides it).
- Safe-area insets for the notch / home indicator are handled in CSS.
- To update the app after code changes: `npm run build && npx cap sync ios`, then rebuild in Xcode.

## Notes & limitations

- Reminders appear as an in-app banner when due; there is no email, SMS, or push notification service.
- Recurrence creates the next occurrence on completion — it does not pre-generate future instances.
- The in-memory mode is for previews and demos, not production.
- Budgets are per month and per category; there is no rollover between months.

---

Built as a small, complete MERN project: a calm interface, a real REST API, per-user data isolation, and enough seed data to explore every screen immediately.
