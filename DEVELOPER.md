# Developer / AI Agent Guide — Mining Command FMS

Technical handbook for the next human developer or AI coding agent.  
**Do not redesign the Dashboard layout or palette unless the product owner explicitly asks.**

---

## 1. Product intent

Enterprise **Mining Fleet Management System (FMS)** UI shell inspired by MineStar / Hexagon / Wenco-style ops centers.

| Concern | Decision |
|---------|----------|
| UI shell | Vite + React 19 + TypeScript + Tailwind v4 |
| State (now) | React context + local hooks + mock data |
| State (target) | REST (Railway) + Socket.IO (Railway) + MySQL + JWT RBAC |
| Map | **Static** base image + overlays; no live GPS motion yet |
| Auth (now) | Demo users in memory + `sessionStorage` |
| Auth (target) | JWT + role middleware; optional Supabase Auth |

---

## 2. Hard product rules (from design reviews)

1. **Dashboard layout is locked** (unless user says otherwise):
   - Left: Live Map + Equipment Status Table  
   - Right: 4 Telemetry gauge cards + Daily Production  
2. **Telemetry gauge colors (exact, do not “harmonize”)**:
   - Top-left Fuel Usage → **amber** `#F6A214`  
   - Top-right Operating Efficiency → **cyan** `#1ADBDE`  
   - Bottom-left Fuel Usage (warn) → **cyan**  
   - Bottom-right Downtime (warn) → **amber**  
3. **Daily Production bars**: thin dual-tone **per hour** — cyan (ore) + amber (waste) stacked; labels aligned under each hour.  
4. Palette: `bg #0D1116`, panel/map `#363C41` / `#151A1F`, cyan `#1ADBDE`, amber `#F6A214`, muted teal `#27787A`, success `#3AC7A3`, alert `#D6403E`.  
5. Map: topographic pit + zone fills + letter pins — **not** radar rings as primary metaphor. Keep static until GPS work is scheduled.  
6. Prefer **typed hooks** (`useLiveTelemetry`, `useVehiclePositions`, …) so backend can swap without rewriting pages.

---

## 3. Stack & commands

```bash
npm install
npm run dev      # Vite HMR
npm run build    # tsc -b && vite build
npm run preview  # serve dist/
```

Key deps: `react`, `react-dom`, `tailwindcss` + `@tailwindcss/vite`, `lucide-react`, `framer-motion`, `react-router-dom` (available; primary nav is state-based today), `@supabase/supabase-js` (preinstalled; API client pattern in `api/db-client.js` if serverless routes are added).

---

## 4. Repository map

```
src/
  main.tsx                 # AuthProvider → OpsProvider → App
  App.tsx                  # Auth gate, Guarded routes by role, page switch
  index.css                # Tailwind v4 + focus/scrollbar
  types/
    fms.ts                 # Canonical domain types (NavItemId, FleetAsset, ProductionBar, …)
    telemetry.ts           # Re-exports fms (legacy import path)
  data/
    authUsers.ts           # DEMO_USERS, roles, module ACLs
    enterprise.ts          # Fleet, operators, WOs, alerts, dispatch, KPIs
    mockData.ts            # Dashboard gauges, map lists, production bars, equipment table seed
    alerts.ts              # Re-export alerts
  contexts/
    AuthContext.tsx        # login/logout/canAccess/sessionStorage
    OpsContext.tsx         # nav, mine/shift, toasts, modals, flags, map layers, settings, copilot
  hooks/
    useLiveTelemetry.ts    # KPI gauge mock tick
    useVehiclePositions.ts # Static markers + focusOn camera nudge
    useEquipmentStatus.ts  # Table health tick + filter/sort
    useProductionData.ts   # Dual-tone hourly bars tick
    useClock.ts            # UTC clock string
  components/
    Header.tsx, Sidebar.tsx, LiveMap.tsx, GaugeCard.tsx
    DailyProduction.tsx, EquipmentTable.tsx, ModalsHost.tsx
    ui/                    # Button, DataTable, ModalShell, StatusBadge, KpiCard, Toast, Dropdown
    panels/                # Settings + legacy panels
    copilot/OpsCopilot.tsx
  pages/                   # Feature pages (Fleet, Dispatch, …)
  lib/
    export.ts              # CSV/JSON download helpers (ops data only)
    i18n.ts                # Locale EN/ID + theme prefs helpers
    copilotEngine.ts       # Rule-based copilot (EN + ID)
    downloadSource.ts      # DEV ONLY — never wire in production UI
public/
  map/pit-base.png         # Static pit raster for Live Map
  favicon.svg
  # mining-command-fms-source.zip / download.html — strip before public deploy
api/
  db-client.js             # Supabase client (do not overwrite resilience logic)
  db-wake.js
```

---

## 5. App bootstrap & navigation model

```tsx
// main.tsx
<AuthProvider>
  <OpsProvider>
    <App />
  </OpsProvider>
</AuthProvider>
```

- **No React Router for primary IA** today: `activeNav: NavItemId` lives in `OpsContext`.  
- `App.tsx` switches pages with `activeNav === '…'`.  
- `Guarded` wraps pages with `useAuth().canAccess(nav)`.  
- Unauthenticated → `LoginPage`.  
- Forbidden module → `AccessDenied` + bounce effect to first allowed module.

When adding a module:
1. Extend `NavItemId` in `src/types/fms.ts`.  
2. Add to `ALL` / role `modules` in `src/data/authUsers.ts`.  
3. Add sidebar entry in `Sidebar.tsx`.  
4. Add page + `Guarded` branch in `App.tsx`.  
5. Optional: copilot `NAV_MAP` in `lib/copilotEngine.ts`.

---

## 6. Auth & RBAC

**File:** `src/data/authUsers.ts`, `src/contexts/AuthContext.tsx`

| Role | id | Typical modules |
|------|-----|-----------------|
| `admin` | `u-admin` | All including users/roles/audit |
| `ops_lead` | `u-ops` | Dashboard, ops, fleet, production, reports, analytics |
| `dispatcher` | `u-disp` | live-ops, dispatch, fleet, alerts |
| `maintenance` | `u-maint` | maintenance, spare-parts, equipment |
| `analyst` | `u-analyst` | reports, analytics, production |

Session key: `mineops_fms_session_v1` in `sessionStorage` (stores user id only).

**Backend swap checklist**
- Replace `login()` with `POST /auth/login` → JWT.  
- Store access + refresh token (memory + httpOnly cookie preferred).  
- `canAccess` from JWT claims / `/me` permissions.  
- Pass `Authorization: Bearer` on API calls.  
- Keep demo login behind `import.meta.env.DEV` if needed.

---

## 7. OpsContext (global UI state)

**File:** `src/contexts/OpsContext.tsx`

Owns: `activeNav`, sidebar collapse, mine/shift, global search, lastSync, systemStatus, toasts, modal stack, alerts ack, notifications, flagged units, equipment filters, map layers, settings, selected asset, copilot open flag.

**Modals** (`ModalKind`): unit, asset, radio, service, confirm-flag, assign, settings, filter-equipment, map-settings, shift-report, confirm — rendered by `ModalsHost.tsx`.

Pattern for new modal:
1. Extend `ModalKind`.  
2. `openModal({ type: '…' })` from UI.  
3. Branch in `ModalsHost`.  
4. Use shared `ModalShell` + `Button`.

---

## 8. Data layer (mock → real)

### Dashboard / telemetry
| Hook | Source now | Replace with |
|------|------------|--------------|
| `useLiveTelemetry` | `INITIAL_KPIS` + interval | Socket room `telemetry:kpis` or REST poll |
| `useVehiclePositions` | static `INITIAL_VEHICLES` | Socket `fleet:positions` (do not animate until ready) |
| `useEquipmentStatus` | `INITIAL_EQUIPMENT` | `GET /api/equipment` + optional socket health |
| `useProductionData` | dual-tone `INITIAL_PRODUCTION` | `GET /api/production/hourly?shift=` |

### Enterprise tables
`src/data/enterprise.ts`: `FLEET`, `OPERATORS`, `WORK_ORDERS`, `FUEL_EVENTS`, `ALERTS`, `DISPATCH_QUEUE`, production series, `DASHBOARD_KPIS`, etc.

**Rule:** pages should prefer hooks or context over importing giant arrays directly when you add caching — but current pages may import `enterprise.ts` for speed. When adding API, introduce `src/api/client.ts` and thin hooks.

### ProductionBar shape (important)

```ts
interface ProductionBar {
  hour: string;      // '08:00'
  primary: number;   // cyan / ore
  secondary: number; // amber / waste
}
```

Do **not** reintroduce single `value` + `color` for the dashboard chart without updating `DailyProduction.tsx` and `ProductionPanel.tsx`.

---

## 9. UI system

| Component | Path | Notes |
|-----------|------|--------|
| `Button` | `ui/Button.tsx` | primary/secondary/success/warning/danger/ghost/outline + loading |
| `DataTable` | `ui/DataTable.tsx` | search, sort, pagination, column hide, optional bulk select |
| `StatusBadge` | `ui/StatusBadge.tsx` | asset/engine/WO/priority colors |
| `PageShell` | `ui/PageShell.tsx` | page chrome + StatTile |
| `ModalShell` | `ui/ModalShell.tsx` | dialog + PrimaryBtn/GhostBtn wrappers |
| `DropdownMenu` | `ui/DropdownMenu.tsx` | click-outside + Escape |
| `ToastStack` | `ui/ToastStack.tsx` | via `pushToast` |
| `KpiCard` | `ui/KpiCard.tsx` | analytics-style KPI (not the dashboard gauges) |
| `GaugeCard` | `GaugeCard.tsx` | semicircle gauges for dashboard only |

Export helpers: `src/lib/export.ts` → `downloadCsv`, `downloadJson`, `stampFilename`.

---

## 10. Dashboard specifics (do not regress)

**File:** `src/pages/DashboardPage.tsx`

```
grid [1fr | 340px]
  left:  LiveMap (flex 1.55) + EquipmentTable (flex 0.85)
  right: TELEMETRY KPI CARDS (GaugeCard x4) + DailyProduction
```

- Live map image: `/map/pit-base.png`.  
- Layers toggles: `mapLayers` in OpsContext (labels, pins, fleet, heat, pitZones, haulRoads).  
- Equipment table actions call `openModal` / `focusOn` / CSV export.

---

## 11. Target backend architecture (planned)

```
[Browser SPA]
    |  HTTPS REST (JWT)
    v
[Node API · Railway] ---- [MySQL · Railway]
    ^
    |  Socket.IO auth
[Realtime service · Railway]
```

Suggested first endpoints (illustrative):

```
POST   /auth/login
GET    /auth/me
GET    /fleet
GET    /fleet/:unit
PATCH  /fleet/:unit/assignment
GET    /production/hourly
GET    /alerts
POST   /alerts/:id/ack
GET    /maintenance/work-orders
POST   /dispatch/jobs
GET    /operators
```

Socket events (later):

```
telemetry:kpis
fleet:positions
alerts:new
dispatch:queue
```

Keep hook names stable when wiring sockets so pages stay dumb.

---

## 12. Supabase / `api/` notes

- `api/db-client.js` and `api/db-wake.js` are pre-wired for serverless Supabase. **Do not overwrite** resilience logic blindly.  
- Frontend currently does **not** require Supabase for core demo.  
- If adding Vercel functions: CORS headers, import supabase from `./db-client.js`, never raw SQL from random files.

---

## 13. Styling conventions

- Tailwind utility-first; dark surfaces `#0D1116` / `#12171C` / `#151A1F`.  
- Borders `#2A3036`.  
- Fonts: Inter (UI) + mono for unit IDs / clocks.  
- Viewport: prefer **no page scroll** on Dashboard; other pages may scroll inside `PageShell`.  
- Accessibility: `:focus-visible` cyan outline; buttons need `type="button"`; dialogs Escape-to-close.

---

## 14. Safe change checklist (for AI agents)

Before large edits:

1. Read this file + `README.md`.  
2. Confirm whether the task touches **Dashboard layout/colors** — if yes, re-read user color rules.  
3. Prefer extending types in `fms.ts` over ad-hoc `any`.  
4. Keep mock data realistic (mining units HT-*, EX-*, Face B/C, Crusher Pad).  
5. After code changes: `npm run build` must pass.  
6. Do not add real `fetch()` to missing backends without graceful offline/mock fallback — failed network UI is not acceptable in demos.  
7. Do not remove RBAC guards when adding pages.  
8. Map realtime work: isolate in `useVehiclePositions` + `LiveMap`; leave chart/table code alone.

---

## 14b. PRE-UPLOAD / PRODUCTION HARDENING (mandatory)

**Before any public / online / production deploy, remove developer-only affordances from the running app:**

1. **Delete “Download full source (.zip)” (and any equivalent) from the UI**  
   - Was under Header profile menu → **must not ship to end users**.  
   - Related helpers that must not be wired in production UI:  
     - `src/lib/downloadSource.ts`  
     - `public/mining-command-fms-source.zip` / `public/download.html`  
     - root `mining-command-fms-source.tar.gz` if present  
   - Keep source packaging in private repos / CI artifacts only — never as an in-app button for operators.  
2. **Smoke-test every button** on Dashboard + primary modules (Fleet, Dispatch, Alerts, Settings, Copilot actions, table `…` menus, exports). No dead controls.  
3. Confirm **Settings → Language (EN/ID)** and **Theme (Dark/Light)** persist (`localStorage` key `mineops_fms_prefs_v1`) and that **Ops Copilot** follows locale (see `copilotEngine.ts` + `settings.locale`).  
4. Do not reintroduce source-download entries in Header, Settings help text, or ModalsHost copy.

---

## 15. Known intentional limitations

- Production dual-tone chart uses **client mock** totals that may not sum to `PRODUCTION_TOTAL` exactly — OK for UI demo.  
- Vehicle positions do not drift (static map policy).  
- PDF/Excel export is simulated via CSV/metadata download.  
- Copilot is **rule-based** (`copilotEngine.ts`), not an LLM API; supports **EN + ID** intent normalization + reply framing via `settings.locale`.  
- Some legacy panels under `components/panels/` may be partially superseded by `pages/*` — prefer pages for new work.  
- Theme light mode uses CSS variable remaps over existing dark utility classes (not a full redesign).

---

## 16. Suggested next engineering milestones

1. **API client + env config** — `VITE_API_URL`, typed fetch wrapper, error toast.  
2. **JWT auth** — replace `authUsers` passwords; keep role module matrix.  
3. **Fleet & alerts live read** — REST first, then sockets.  
4. **Dispatch write path** — optimistic UI + rollback.  
5. **Map GPS layer** — subscribe positions; replay/history later.  
6. **Report service** — server-side PDF/XLSX.  
7. **E2E smoke** — login → dashboard gauges visible → fleet export → ack alert.

---

## 17. Quick file jump (common tasks)

| Task | Start here |
|------|------------|
| Change gauge labels/colors | `mockData.ts` `INITIAL_KPIS`, `GaugeCard.tsx` |
| Change production bars | `mockData.ts` `INITIAL_PRODUCTION`, `DailyProduction.tsx` |
| Add fleet column | `FleetPage.tsx` + `FleetAsset` type |
| New role | `authUsers.ts` |
| New global modal | `OpsContext.tsx` + `ModalsHost.tsx` |
| Sidebar IA | `Sidebar.tsx` |
| Top bar controls | `Header.tsx` |
| Copilot answers | `lib/copilotEngine.ts` |

---

*Last structured for agent handoff: Mining Command FMS SPA, mock-first, enterprise shell complete, dashboard layout frozen unless product owner reopens it.*
