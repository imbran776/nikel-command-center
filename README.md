# Mining Command – Central Operations (FMS)

Aplikasi web **Mining Fleet Management System** untuk operasi tambang: dashboard command center, fleet, dispatch, production, maintenance, fuel, operators, alerts, reports, analytics, dan administrasi (users/roles/audit).

Desain: dark industrial (`#0D1116`), aksen **cyan** `#1ADBDE` + **amber** `#F6A214`, layout siap layar laptop operasi.

---

## Mulai cepat

### Prasyarat
- Node.js 20+ (disarankan)
- npm

### Instalasi & jalan lokal

```bash
npm install
npm run dev
```

Buka URL yang ditampilkan Vite (biasanya `http://localhost:5173`).

### Build produksi

```bash
npm run build
npm run preview
```

Deploy: output di folder `dist/` (cocok untuk Vercel / static hosting).

---

## Login (demo)

Aplikasi memakai **login lokal (mock)** — tidak mengirim kredensial ke server. Session disimpan di `sessionStorage`.

| Peran | Email | Password | Fokus modul |
|--------|--------|----------|-------------|
| System Admin | `admin@mineops.local` | `admin123` | Semua modul + Users / Roles / Audit |
| Ops Lead | `alex.r@mineops.local` | `ops123` | Dashboard, ops, fleet, production, reports |
| Dispatcher | `j.brooks@mineops.local` | `dispatch123` | Live ops, dispatch, fleet, alerts |
| Maintenance | *(lihat kartu demo di login)* | `maint123` | Maintenance, spare parts, equipment |
| Analyst | *(lihat kartu demo di login)* | `analyst123` | Reports, analytics, production |

Di halaman login Anda bisa:
1. Isi email + password, atau  
2. Klik **kartu demo role** untuk masuk sekali klik.

Logout: menu profil (pojok kanan atas) → **End shift session**.

---

## Navigasi utama

Sidebar kiri (bisa di-collapse):

| Area | Modul | Kegunaan singkat |
|------|--------|------------------|
| — | **Dashboard** | Peta pit + tabel equipment + 4 gauge telemetry + daily production |
| Operations | Live Operations | Board status Loading / Hauling / Dumping / Waiting / Idle / Breakdown |
| Operations | Dispatch | Antrian assign truck ↔ excavator, load/dump point |
| — | **Fleet** | Direktori aset lengkap (status, fuel, health, operator, export) |
| — | **Production** | Target vs actual (hourly/daily/weekly/monthly) |
| Assets | Equipment | Master list + detail (sensor, fault code, history) |
| Assets | Maintenance | Work order preventive/corrective |
| Assets | Fuel Management | Sisa BBM, efisiensi, riwayat isi |
| Assets | Spare Parts | Inventori suku cadang (jika role mengizinkan) |
| Assets | Operators | Profil operator, shift, performance, safety |
| — | **Alerts** | Critical / Warning / Info + acknowledge |
| Insights | Reports | Paket laporan CSV/Excel/PDF (demo download) |
| Insights | Analytics | Tren, ranking, MTBF/MTTR |
| Admin | Users / Roles / Audit | Hanya admin |
| — | **Settings** | Preferensi site/shift/telemetry |

Modul yang tidak diizinkan role Anda menampilkan **Access Restricted**.

---

## Dashboard (tampilan command center)

Layout final:

**Kolom kiri**
- **Live Map Panel** — peta pit (statis untuk integrasi GPS nanti), legenda zona, list haul truck / excavator, toolbar zoom/layer.
- **Equipment Status Table** — UNIT / TYPE / STATUS / DRIVER / HEALTH; sort, filter, menu aksi per baris.

**Kolom kanan**
- **Telemetry KPI Cards** (2×2, warna sesuai desain):
  1. Fuel Usage — gauge **amber**
  2. Operating Efficiency — gauge **cyan**
  3. Fuel Usage (warning) — gauge **cyan**
  4. Downtime — gauge **amber** (`Hrs` + Alert)
- **Daily Production** — batang tipis **per jam**; tiap jam = stack **cyan (ore) + amber (waste)**, label jam di bawah.

---

## Top bar

- **Mine selector** / **Shift selector** — konteks site & shift.
- **Global search** — cari unit, operator, lokasi (Enter).
- **Status sistem** + **last sync**.
- **Quick actions** — dispatch baru, work order, radio, shift report.
- **Notification center** — notifikasi shift; lompat ke Alerts.
- **Profil** — report, settings, end session.

---

## Aksi operasional yang sering dipakai

### Fleet
- Klik baris → detail equipment.
- Menu `⋯`: Track, Assign, Maintenance, Fuel, History, Export.
- Filter status, search, pagination, bulk flag.

### Dispatch
- **New assignment** — pilih truck, excavator, load point, dump point, priority.
- Activate / Complete / Reassign pada job.

### Alerts
- Filter Open / Critical / Warning / Info.
- **Acknowledge** satu atau **Ack all**.
- Klik unit → buka detail aset (jika diizinkan).

### Maintenance
- Filter Preventive / Corrective.
- Complete work order; buat WO dari Quick action atau detail unit.

### Reports
- Centang jenis laporan → pilih format (CSV / Excel / PDF demo) → Generate.

### Ops Copilot
- Panel samping (jika terbuka) untuk tanya status shift, navigasi modul, atau aksi cepat berbasis data mock.

---

## Ekspor data

Beberapa layar mendukung unduh **CSV** di browser (tanpa backend):
- Equipment / fleet table  
- Production hourly  
- Fuel log  
- Shift report / multi-report package  

File memakai timestamp UTC di nama file.

---

## Tips pemakaian di ruang kontrol

1. Login sebagai **Ops Lead** untuk overview penuh non-admin.  
2. Pantau **Alerts** (badge merah di sidebar) di awal shift.  
3. Gunakan **Live Operations** + **Dispatch** untuk antrian haul.  
4. **Dashboard** untuk situational awareness (peta + KPI + production).  
5. Maintenance/fuel pakai role terkait agar menu tidak “restricted”.  
6. Jangan mengandalkan angka mock untuk keputusan produksi nyata sampai backend live terhubung.

---

## Batasan demo saat ini

- Data **mock lokal** (bukan MySQL/API live).  
- Peta **statis** (belum GPS realtime / WebSocket).  
- Auth **bukan** JWT production — hanya demo RBAC.  
- PDF/Excel export = unduhan demo (CSV/metadata), bukan generator full enterprise.

---

## Bantuan teknis

Untuk arsitektur, struktur folder, cara ganti mock → API/Socket.IO, skema data, dan panduan untuk developer / AI agent berikutnya, baca:

**[DEVELOPER.md](./DEVELOPER.md)**
