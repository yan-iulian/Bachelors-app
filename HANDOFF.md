# AerYan — Handoff pentru AI următor

## CITEȘTE ÎNTÂI
Fișierul `DEVELOPMENT.md` din același folder conține **toată documentația tehnică**: schema DB, relații, endpoint-uri API, componente React, design system, conturi test, comenzi. **Citește-l complet înainte de a scrie orice cod.**

## Context rapid
AerYan = aplicație web de management dealership auto (licență universitară).
- **Stack:** Node.js + Express + Sequelize + PostgreSQL (backend) | React 19 + Vite + Redux Toolkit + Tailwind CSS v4 (frontend)
- **3 roluri:** Director, Client, Mecanic — fiecare cu interfață proprie
- **Documentația proiectului** (cerințe, UML, BPMN) este în: `c:\Users\YAN\Desktop\LICENTA 2\Introducere + cap1+cap2+cap3.txt`
- **Interfețe gata făcute** (HTML + PNG) sunt în: `c:\Users\YAN\Desktop\LICENTA 2\INTERFETE\` (vezi secțiunea dedicată mai jos)

## Structura proiectului
```
c:\Users\YAN\Desktop\LICENTA 2\aeryan\
├── server/                    ← Backend
│   ├── server.js              ← Entry point (PORT=3001)
│   ├── app.js                 ← Express config
│   ├── .env                   ← DB credentials + JWT secret
│   ├── data-preload.js        ← Script populare DB
│   ├── models/                ← 8 modele Sequelize (index.js = relații + sync)
│   ├── routers/               ← auth-router.js + api-router.js
│   └── middleware/             ← JWT auth + role guard
├── client/                    ← Frontend
│   ├── index.html             ← HTML + Google Fonts
│   ├── vite.config.js         ← Vite + React + Tailwind
│   └── src/
│       ├── main.jsx           ← React entry
│       ├── index.css          ← Tailwind + design tokens
│       ├── config/api.js      ← API_URL = localhost:3001
│       ├── store/             ← Redux (authSlice, masiniSlice, store)
│       └── components/        ← 6 componente (App, AuthGuard, Dashboard, Login, Navbar, Placeholder)
├── DEVELOPMENT.md             ← Documentație tehnică completă
└── HANDOFF.md                 ← Acest fișier
```

## Cum pornești

**Prerequisite:** PostgreSQL trebuie să ruleze cu baza de date `AerYanDataBase` (user: `postgres`, pass: `superuser`, port: `5432`)

```bash
# Terminal 1 — Server (din /aeryan/server)
node server.js
# Output așteptat: "Baza de date sincronizata cu succes!" + "Server AerYan pornit pe portul 3001"

# Terminal 2 — Client (din /aeryan/client)
npm run dev
# Output așteptat: Vite dev server pe http://localhost:5173

# (Opțional) Populare date test — rulează O SINGURĂ DATĂ
node data-preload.js
```

## Ce e GATA ✅

### Backend (Server)
- 8 modele Sequelize: Utilizator, Masina, Tranzactie, TestDrive, Reparatie, Piesa, PiesaReparatie, AuditLog
- Toate relațiile (1:N, N:M) configurate în `models/index.js`
- Auth: POST `/auth/register` + POST `/auth/login` (JWT 24h, bcrypt)
- Middleware: authMiddleware (JWT), rolMiddleware (verificare rol), genericErrorMiddleware
- CRUD Mașini: GET/POST/PUT/DELETE `/api/masini`
- Test Drive: POST/GET/PUT aproba/respinge `/api/testdrive`
- Tranzacții: POST/GET/PUT aproba `/api/tranzactii`
- Discount: POST/GET/PUT aproba/respinge `/api/discount` (folosește tabelul Tranzactie cu tip='Discount')
- Reparații: GET/POST/PUT `/api/reparatii`
- Piese: GET `/api/piese`
- Utilizatori: GET `/api/utilizatori`
- Audit Log: GET `/api/audit-log`
- Dashboard Stats: GET `/api/dashboard/stats` (KPI-uri reale din DB)
- Date test: `node data-preload.js` → 4 utilizatori, 5 mașini, piese, reparații, test drives, tranzacții

### Frontend (Client)
- **LoginForm** — glassmorphism, 3 butoane demo credentials (Director/Client/Mecanic)
- **Navbar** — glassmorphism header, nav links pe rol, notificări, avatar, logout
- **AuthGuard** — protecție rute per rol
- **DirectorDashboard** — KPI cards (Vânzări, Stoc, Pending 10, Clienți), grafic SVG, cereri aprobare (test drive + discount + tranzacție cu icoane distincte), tranzacții recente, acțiuni rapide
- **Placeholder** — componentă generică pentru pagini neimplementate

### Design System
- Tailwind CSS v4 cu `@tailwindcss/vite` plugin
- Design tokens în `:root` din `index.css`
- Clase custom: `.glass-panel`, `.glass-card`, `.glass-header`
- Font: Inter | Icoane: Material Symbols Outlined
- Tema: dark, primary=#895af6 (mov)

## Ce NU e gata — DE IMPLEMENTAT ❌

### Prioritate 1 — Pagini Director (frontend, backend existent)
Rutele există, sunt Placeholder. Trebuie componente reale.

1. **`/director/masini`** — CRUD Mașini
   - Tabel cu toate mașinile (GET `/api/masini`)
   - Butoane: Adaugă (POST), Editează (PUT), Șterge (DELETE)
   - Modal/formular cu toate câmpurile mașinii
   - Endpoint-uri backend EXISTĂ deja

2. **`/director/test-drive`** — Cereri Test Drive
   - Tabel cereri (GET `/api/testdrive`)
   - Butoane Aprobă/Respinge pe fiecare rând
   - Endpoint-uri backend EXISTĂ deja

3. **`/director/discount`** — Cereri Discount
   - Tabel cereri (GET `/api/discount`)
   - Butoane Aprobă/Respinge
   - Endpoint-uri backend EXISTĂ deja

4. **`/director/audit-log`** — Audit Log
   - Tabel readonly (GET `/api/audit-log`)
   - Afișează: cine, ce, când
   - Endpoint backend EXISTĂ deja

5. **Dashboard date reale** — Conectare KPI-uri la GET `/api/dashboard/stats`

### Prioritate 2 — Interfața Client (frontend + backend parțial)
Conform documentației (secțiunea 2.1.2 din `Introducere + cap1+cap2+cap3.txt`):

1. **Catalog Grid** (`/client/catalog`)
   - Card-uri mașini cu poză, marca, model, preț, AI Match %
   - GET `/api/masini` (existent)
   - Filtre sidebar: marcă, preț (range), an, combustibil, caroserie
   - Sortare: preț, an, AI recommendation
   - Paginare

2. **Pagina Mașină** (`/client/masina/:id`)
   - Hero gallery cu thumbnails
   - Grid specificații (8 carduri)
   - Descriere + accordions
   - AI Match Card + Radar Chart
   - Butoane: Solicită Test Drive, Adaugă Wishlist, Solicită Discount
   - Mașini similare carousel

3. **Wishlist** (`/client/wishlist`)
   - Backend: câmpul `wishlist` pe Utilizator există, dar NU are endpoint-uri
   - Trebuie: POST/GET/DELETE `/api/wishlist`

### Prioritate 3 — Interfața Mecanic (frontend + backend parțial)
Conform documentației (secțiunea 2.1.3):

1. **Lista Reparații** (`/mecanic`) — GET `/api/reparatii` (existent)
2. **Workspace Reparație** — update status, adaugă piese, note tehnice
3. **Piese** (`/mecanic/piese`) — GET `/api/piese` (existent)
4. **Alerte Stoc** — piese cu stoc scăzut

### Prioritate 4 — Modulul AI
- PCA (reducere dimensionalitate din cele 10 scoruri pe mașină)
- KNN (K-Nearest Neighbors, distanță euclidiană)
- Radar chart (grafic compatibilitate)
- Match score procentual
- Câmpurile scor* pe mașină EXISTĂ deja în DB

### Prioritate 5 — Polish
- Notificări cross-rol (director vede cereri noi, client vede răspunsuri)
- Export PDF (fișă tehnică, factură, raport)
- Audit log middleware automat (loghează fiecare acțiune)

## Reguli de stil
1. **Tailwind CSS** — nu CSS vanilla, nu CSS Modules
2. **Glassmorphism dark theme** — urmează stilul din DirectorDashboard.jsx
3. **Material Symbols Outlined** — pentru toate icoanele
4. **Limba UI** — mix RO/EN (ca în dashboard-ul existent)
5. **La final, actualizează `DEVELOPMENT.md`** — changelog + orice schimbare în schema/rute/componente

## IMPORTANT — Interfețe GATA FĂCUTE (cod + mockup)
Directorul `c:\Users\YAN\Desktop\LICENTA 2\INTERFETE\` conține **cod HTML gata făcut și screenshot-uri** pentru fiecare interfață. **TREBUIE** să le folosești ca referință directă când implementezi componentele React:

```
INTERFETE/
├── I Director/
│   ├── code.html     ← cod HTML/CSS al interfeței Director (22KB)
│   └── screen.png    ← screenshot mockup
├── I Client/
│   ├── code.html     ← cod HTML/CSS al interfeței Client (41KB)
│   └── screen.png    ← screenshot mockup
├── I Masina/
│   ├── code.html     ← cod HTML/CSS al paginii individuale mașină (30KB)
│   └── screen.png    ← screenshot mockup
└── I Mecanic/
    ├── code.html     ← cod HTML/CSS al interfeței Mecanic (21KB)
    └── screen.png    ← screenshot mockup
```

**Cum le folosești:**
1. Deschide `code.html` din interfața pe care o implementezi
2. Citește structura HTML și stilurile CSS
3. Convertește-le în componente React cu Tailwind CSS, păstrând același layout și design
4. Folosește `screen.png` ca referință vizuală finală

**Codul existent din `DirectorDashboard.jsx` a fost construit pe baza `I Director/code.html`** — urmează același proces pentru Client, Mașină și Mecanic.

De asemenea, fișierul `c:\Users\YAN\Desktop\LICENTA 2\Introducere + cap1+cap2+cap3.txt` conține **descrierile funcționale** ale fiecărei interfețe (secțiunile 2.1.1, 2.1.2, 2.1.3).

## Conturi test
| Rol | Email | Parolă |
|-----|-------|--------|
| Director | director@aeryan.ro | parola123 |
| Client | maria@email.com | parola123 |
| Client | andrei@email.com | parola123 |
| Mecanic | mecanic@aeryan.ro | parola123 |
