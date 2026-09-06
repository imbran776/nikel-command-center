<div align="center">

<img src="https://readme-typing-svg.demolab.com?font=IBM+Plex+Mono&weight=700&size=32&pause=1000&color=F59E0B&center=true&vCenter=true&width=600&lines=Nikel+Command+Center;Fleet+%26+Operations+Management;Real-Time+Mining+Intelligence" alt="Typing SVG" />

<br/>

![Version](https://img.shields.io/badge/version-1.0.0-F59E0B?style=for-the-badge&labelColor=1a1a1a)
![React](https://img.shields.io/badge/React_19-61DAFB?style=for-the-badge&logo=react&logoColor=black&labelColor=1a1a1a)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white&labelColor=1a1a1a)
![Node.js](https://img.shields.io/badge/Node.js-339933?style=for-the-badge&logo=nodedotjs&logoColor=white&labelColor=1a1a1a)
![Socket.IO](https://img.shields.io/badge/Socket.IO-010101?style=for-the-badge&logo=socketdotio&logoColor=white&labelColor=1a1a1a)
![MySQL](https://img.shields.io/badge/MySQL-4479A1?style=for-the-badge&logo=mysql&logoColor=white&labelColor=1a1a1a)

<br/>

[![Live Demo](https://img.shields.io/badge/🚀_Live_Demo-nikel--command--center.vercel.app-F59E0B?style=for-the-badge&labelColor=1a1a1a)](https://nikel-command-center.vercel.app)

<br/>

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="separator" width="100%"/>

</div>

<br/>

## ⚡ Overview

**Nikel Command Center** adalah platform manajemen operasional tambang nikel skala enterprise berbasis web. Sistem ini menyediakan visibilitas real-time terhadap armada alat berat, produksi harian, konsumsi bahan bakar, status perawatan, dan aktivitas operasional — semua dalam satu dashboard terpadu.

Dibangun dengan arsitektur full-stack modern: frontend React di Vercel, backend REST API + Socket.IO realtime di Railway, dan database MySQL yang dikelola penuh di cloud.

<br/>

<div align="center">
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/aqua.png" alt="separator" width="100%"/>
</div>

<br/>

## ✨ Fitur Utama

<table>
  <tr>
    <td width="50%">

### 🗺️ Live Operations Map
Peta operasional real-time dengan pelacakan GPS armada. Visualisasi posisi setiap unit alat berat secara langsung menggunakan Leaflet + Socket.IO.

### 📊 Production Dashboard
Monitoring produksi harian, target vs realisasi, grafik tren, dan ringkasan KPI operasional seluruh area tambang.

### 🚛 Fleet Management
Manajemen armada lengkap: status unit, utilisasi, riwayat operasi, dan penugasan operator per shift.

### ⛽ Fuel Monitoring
Pencatatan dan analisis konsumsi BBM per unit, per shift, dan per area. Deteksi anomali konsumsi secara otomatis.

    </td>
    <td width="50%">

### 🔧 Maintenance Tracking
Jadwal perawatan preventif dan korektif, riwayat servis, manajemen spare part, dan notifikasi jatuh tempo servis.

### 📡 Device Registration & Tracking
Registrasi perangkat GPS tracker dengan QR code, manajemen SIM card, dan konfigurasi interval pengiriman data.

### 👥 User & Role Management
Sistem RBAC (Role-Based Access Control) dengan role: Admin, Supervisor, Operator, Dispatcher, dan Maintenance.

### 📋 Audit Logs & Reports
Log aktivitas pengguna teraudit, laporan produksi harian/mingguan, dan export data untuk keperluan pelaporan.

    </td>
  </tr>
</table>

<br/>

<div align="center">
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/fire.png" alt="separator" width="100%"/>
</div>

<br/>

## 🏗️ Arsitektur

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT BROWSER                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
┌──────────────────────────▼──────────────────────────────────┐
│              VERCEL  (nikel-command-center.vercel.app)       │
│              React 19 + TypeScript + Tailwind CSS            │
└────────────┬─────────────────────────────┬──────────────────┘
             │ REST API (HTTPS)             │ WebSocket (WSS)
┌────────────▼───────────┐    ┌────────────▼───────────────────┐
│   RAILWAY: ncc-backend │    │   RAILWAY: ncc-realtime         │
│   Node.js + Express    │    │   Node.js + Socket.IO           │
│   JWT Auth + RBAC      │    │   Live GPS Broadcast            │
│   Rate Limiting        │    │   Event-scoped Rooms            │
└────────────┬───────────┘    └────────────────────────────────┘
             │ mysql2 (internal network)
┌────────────▼───────────┐
│   RAILWAY: ncc-mysql   │
│   MySQL 9.4            │
│   Private Network Only │
└────────────────────────┘
```

<br/>

## 🛠️ Tech Stack

| Layer | Teknologi |
|-------|-----------|
| **Frontend** | React 19, TypeScript, Tailwind CSS v4, Vite 7, Framer Motion |
| **Peta** | Leaflet, React Leaflet |
| **Realtime** | Socket.IO Client v4 |
| **UI Components** | Lucide React, Sonner (notifications) |
| **Backend API** | Node.js, Express.js, JWT Auth, Helmet, Rate Limiter |
| **Realtime Server** | Socket.IO v4, Express |
| **Database** | MySQL 9.4, mysql2 |
| **Hosting Frontend** | Vercel |
| **Hosting Backend** | Railway |
| **Security** | gitleaks (pre-commit scan), CORS whitelist, Parameterized queries |

<br/>

<div align="center">
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="separator" width="100%"/>
</div>

<br/>

## 🚀 Menjalankan Secara Lokal

### Prasyarat

- Node.js >= 20
- MySQL 8+ (lokal atau Docker)
- npm

### 1. Clone repo

```bash
git clone https://github.com/imbran776/nikel-command-center.git
cd nikel-command-center
```

### 2. Setup Frontend

```bash
npm install
cp .env.example .env.local
# Isi VITE_API_URL dan VITE_REALTIME_URL di .env.local
npm run dev
```

### 3. Setup Backend API

```bash
cd backend
npm install
cp .env.example .env
# Isi DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, CORS_ORIGINS
node src/index.js
```

### 4. Setup Realtime Server

```bash
cd realtime-server
npm install
# Set PORT=4000, CORS_ORIGINS, INTERNAL_SECRET di env
node src/index.js
```

<br/>

<div align="center">
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/aqua.png" alt="separator" width="100%"/>
</div>

<br/>

## 🔒 Security

- Semua credential disimpan di environment variables — tidak ada yang di-hardcode
- `.env` dan file sensitif dikecualikan dari git via `.gitignore`
- JWT authentication wajib di semua endpoint backend
- CORS dikonfigurasi dengan whitelist domain eksplisit
- Socket.IO menggunakan auth token di handshake — tidak ada koneksi anonim
- Parameterized queries (mysql2) untuk mencegah SQL injection
- Rate limiting pada endpoint publik dan autentikasi
- Pre-commit scan dengan `gitleaks`

<br/>

<div align="center">
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/fire.png" alt="separator" width="100%"/>
</div>

<br/>

## 📁 Struktur Project

```
nikel-command-center/
├── src/                        # Frontend React
│   ├── components/             # UI components (LiveMap, Header, Sidebar, ...)
│   ├── pages/                  # Halaman aplikasi (Dashboard, Fleet, Production, ...)
│   ├── contexts/               # React Context (OpsContext, AuthContext)
│   └── lib/                    # API client, utilities
├── backend/                    # REST API (Node.js + Express)
│   └── src/
│       ├── routes/             # auth, gps, health
│       ├── middleware/         # auth JWT, CORS, rate limiter
│       └── db/                 # pool MySQL, init schema
├── realtime-server/            # Socket.IO server
│   └── src/
│       └── index.js            # Socket.IO + broadcast endpoint
├── public/                     # Static assets
└── .env.example                # Template environment variables
```

<br/>

<div align="center">
<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/rainbow.png" alt="separator" width="100%"/>
</div>

<br/>

## 👤 Author

<div align="center">

<img src="https://github.com/imbran776.png" width="100" style="border-radius: 50%;" alt="Imbran Darwis"/>

### **Imbran Darwis**

[![GitHub](https://img.shields.io/badge/GitHub-imbran776-181717?style=for-the-badge&logo=github&logoColor=white&labelColor=1a1a1a)](https://github.com/imbran776)
[![Email](https://img.shields.io/badge/Email-imbrandarwis8@gmail.com-EA4335?style=for-the-badge&logo=gmail&logoColor=white&labelColor=1a1a1a)](mailto:imbrandarwis8@gmail.com)

</div>

<br/>

<div align="center">

<img src="https://raw.githubusercontent.com/andreasbm/readme/master/assets/lines/aqua.png" alt="separator" width="100%"/>

**© 2026 Imbran Darwis — Nikel Command Center**

*Built with ❤️ for the Indonesian mining industry*

</div>
