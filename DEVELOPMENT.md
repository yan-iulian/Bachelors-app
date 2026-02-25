# AerYan — Documentație Tehnică de Dezvoltare

> **Ultima actualizare:** 2026-02-14
> Acest fișier servește ca referință completă pentru toată logica, structura și deciziile din proiect.

---

## 1. Arhitectură Generală

```
aeryan/
├── server/          → Backend (Node.js + Express + Sequelize + PostgreSQL)
│   ├── server.js    → Entry point (port 3001)
│   ├── app.js       → Express config (CORS, JSON parser, rute)
│   ├── .env         → Variabile mediu
│   ├── models/      → Modele Sequelize (7 tabele)
│   ├── routers/     → API routes (auth + api)
│   ├── middleware/   → JWT auth + role guard + error handler
│   └── data-preload.js → Script populare DB cu date test
│
├── client/          → Frontend (React + Vite + Redux Toolkit + Tailwind CSS)
│   ├── index.html   → HTML principal + Google Fonts (Inter, Material Symbols)
│   ├── vite.config.js → Vite + React + Tailwind plugin
│   └── src/
│       ├── main.jsx       → Entry point React (Provider + App)
│       ├── index.css      → Tailwind + Design tokens + Glass utilities
│       ├── config/api.js  → API_URL = 'http://localhost:3001'
│       ├── store/         → Redux (authSlice, masiniSlice, store.js)
│       └── components/    → React components
│
└── DEVELOPMENT.md   → ACEST FIȘIER
```

---

## 2. Baza de Date (PostgreSQL)

**Nume:** `AerYanDataBase`
**Credențiale:** `postgres` / `superuser` @ `localhost:5432`
**ORM:** Sequelize cu `{ alter: true }` la sync

### 2.1 Tabele și Câmpuri

#### Utilizator (tabelă unică pentru toate rolurile)
| Câmp | Tip | Note |
|------|-----|------|
| idUtilizator | INTEGER, PK, AUTO | |
| nume, prenume | STRING | |
| email | STRING, UNIQUE | |
| parola | STRING | bcrypt hashed (salt 10) |
| telefon | STRING | |
| adresa | STRING | |
| rol | ENUM('Director','Client','Mecanic') | Determină interfața |
| wishlist | TEXT | Doar pentru Client |
| specializare | STRING | Doar pentru Mecanic |
| activ | BOOLEAN, default true | Pentru dezactivare cont |

#### Masina
| Câmp | Tip | Note |
|------|-----|------|
| idMasina | INTEGER, PK, AUTO | |
| marca, model | STRING | |
| anFabricatie | INTEGER | |
| km | INTEGER | Kilometraj |
| combustibil | INTEGER | 0=Benzină, 1=Diesel, 2=Electric, 3=Hibrid |
| pretEuro | FLOAT | |
| status | STRING | 'Disponibil', 'Vândut', 'Rezervat', 'În service' |
| categorieAuto | INTEGER | 0=Sedan, 1=Hatchback, 2=Coupe, 3=Break, 4=SUV, 5=Cabrio, 6=Combi |
| locParcare | STRING | Ex: 'A-12' |
| descriere | TEXT | |
| esteInPromotie | BOOLEAN | Afișare preț redus |
| pretPromotional | FLOAT | |
| scorViteza...scorFrana | FLOAT (10 scoruri) | Pentru AI Match |
| idDirector | FK → Utilizator | Cine a adăugat |

#### Tranzactie
| Câmp | Tip | Note |
|------|-----|------|
| idTranzactie | INTEGER, PK, AUTO | |
| suma | FLOAT | |
| dataTranzactie | DATE | |
| tipPlata | STRING | 'Cash', 'Card', 'Rate', 'Nealocat' |
| status | STRING | 'Processing', 'Completed', 'Cancelled', 'Sold', 'Approved', 'Rejected' |
| tip | STRING | **'Vanzare'** (default) sau **'Discount'** |
| discountProcent | FLOAT, nullable | Ex: 10.0 = 10% discount |
| motivDiscount | TEXT, nullable | Motivul cererii |
| contractPDF, facturaPDF | STRING | Căi fișiere generate |
| idClient | FK → Utilizator | |
| idMasina | FK → Masina | |
| idDirector | FK → Utilizator | Cine aprobă |

#### TestDrive
| Câmp | Tip | Note |
|------|-----|------|
| idTestDrive | INTEGER, PK, AUTO | |
| dataSolicitare | DATE | |
| dataProgramata | DATE | Nullable până la aprobare |
| status | INTEGER | 0=Solicitare, 1=Aprobat, 2=Respins, 3=Efectuat |
| motivRespingere | STRING | |
| idClient | FK → Utilizator | |
| idMasina | FK → Masina | |
| idDirector | FK → Utilizator | Cine aprobă/respinge |

#### Reparatie
| Câmp | Tip | Note |
|------|-----|------|
| idReparatie | INTEGER, PK, AUTO | |
| dataInceput | DATE | |
| dataFinalizare | DATE | |
| descriereProblema | TEXT | |
| cost | FLOAT | |
| statusReparatie | INTEGER | 0=În așteptare, 1=În lucru, 2=Finalizat |
| noteTehnice | TEXT | Comunicare Mecanic→Director |
| idMasina | FK → Masina | |
| idMecanic | FK → Utilizator | |

#### Piesa
| Câmp | Tip | Note |
|------|-----|------|
| idPiesa | INTEGER, PK, AUTO | |
| denumire | STRING | |
| categorie | STRING | 'Filtre', 'Frâne', 'Motor', etc. |
| pret | FLOAT | |
| stoc | INTEGER | |
| compatibilitate | STRING | |
| furnizorNume | STRING | |
| furnizorTelefon | STRING | |
| timpLivrareOre | INTEGER | |

#### PiesaReparatie (N:M joncțiune)
| Câmp | Tip |
|------|-----|
| idPiesa | FK → Piesa |
| idReparatie | FK → Reparatie |

#### AuditLog
| Câmp | Tip | Note |
|------|-----|------|
| idLog | INTEGER, PK, AUTO | |
| actiune | STRING | Ex: 'Aprobare test drive' |
| detalii | TEXT | Informații suplimentare |
| dataOra | DATE | Timestamp acțiune |
| ip | STRING(45) | IP-ul utilizatorului |
| idUtilizator | FK → Utilizator | Cine a făcut acțiunea |

### 2.2 Relații

```
Director (1) ──────── (N) Masina         [hasMany/belongsTo, FK: idDirector]
Client   (1) ──────── (N) TestDrive      [hasMany/belongsTo, FK: idClient]
Director (1) ──────── (N) TestDrive      [hasMany/belongsTo, FK: idDirector]
Masina   (1) ──────── (N) TestDrive      [hasMany/belongsTo, FK: idMasina]
Client   (1) ──────── (N) Tranzactie    [hasMany/belongsTo, FK: idClient]
Director (1) ──────── (N) Tranzactie    [hasMany/belongsTo, FK: idDirector]
Masina   (1) ──────── (N) Tranzactie    [hasMany/belongsTo, FK: idMasina]
Masina   (1) ──────── (N) Reparatie     [hasMany/belongsTo, FK: idMasina]
Mecanic  (1) ──────── (N) Reparatie     [hasMany/belongsTo, FK: idMecanic]
Piesa    (N) ──────── (M) Reparatie     [belongsToMany, through: PiesaReparatie]
Utilizat.(1) ──────── (N) AuditLog      [hasMany/belongsTo, FK: idUtilizator]
```

---

## 3. API Endpoints

**Base URL:** `http://localhost:3001`

### 3.1 Auth (public, fără token)

| Metodă | Ruta | Parametri Body | Returnează |
|--------|------|---------------|------------|
| POST | `/auth/register` | nume, prenume, email, parola, telefon, adresa, rol | { message, utilizator } |
| POST | `/auth/login` | email, parola | { message, token, utilizator } |

### 3.2 API (protejate cu JWT)

**Header necesar:** `Authorization: Bearer <token>`

#### Mașini
| Metodă | Ruta | Acces | Descriere |
|--------|------|-------|-----------|
| GET | `/api/masini` | Toți | Lista tuturor mașinilor |
| GET | `/api/masini/:id` | Toți | Detalii mașină |
| POST | `/api/masini` | Director | Adaugă mașină (auto-setează idDirector) |
| PUT | `/api/masini/:id` | Director | Actualizează mașină |
| DELETE | `/api/masini/:id` | Director | Șterge mașină |

#### Test Drive
| Metodă | Ruta | Acces | Descriere |
|--------|------|-------|-----------|
| POST | `/api/testdrive` | Client | Solicită test drive |
| GET | `/api/testdrive` | Director | Lista tuturor cererilor |
| PUT | `/api/testdrive/:id/aproba` | Director | Aprobă (status=1, set dataProgramata) |
| PUT | `/api/testdrive/:id/respinge` | Director | Respinge (status=2, set motivRespingere) |

#### Tranzacții
| Metodă | Ruta | Acces | Descriere |
|--------|------|-------|-----------|
| POST | `/api/tranzactii` | Client | Inițiază tranzacție (status='Processing') |
| GET | `/api/tranzactii` | Director | Lista todas tranzacții |
| PUT | `/api/tranzactii/:id/aproba` | Director | Aprobă (status='Sold', mașină='Vandut') |

#### Cereri Discount (prin Tranzacție cu tip='Discount')
| Metodă | Rută | Acces | Descriere |
|--------|------|-------|----------|
| POST | `/api/discount` | Client | Solicită discount (creează Tranzacție tip='Discount') |
| GET | `/api/discount` | Director/Client | Lista cereri discount (Client=doar ale sale) |
| PUT | `/api/discount/:id/aproba` | Director | Aprobă + aplică preț promoțional pe mașină |
| PUT | `/api/discount/:id/respinge` | Director | Respinge cererea |

#### Reparații
| Metodă | Ruta | Acces | Descriere |
|--------|------|-------|-----------|
| GET | `/api/reparatii` | Mecanic | Lista reparații + Masina asociată |
| POST | `/api/reparatii` | Director | Înregistrează reparație nouă |

#### Piese
| Metodă | Ruta | Acces | Descriere |
|--------|------|-------|-----------|
| GET | `/api/piese` | Mecanic | Lista piese (toate) |

#### Utilizatori
| Metodă | Ruta | Acces | Descriere |
|--------|------|-------|-----------|
| GET | `/api/utilizatori` | Director | Lista utilizatori (fără parola) |

#### Audit Log
| Metodă | Rută | Acces | Descriere |
|--------|------|-------|----------|
| GET | `/api/audit-log` | Director | Ultimele 100 acțiuni cu utilizator |

#### Dashboard Stats
| Metodă | Rută | Acces | Descriere |
|--------|------|-------|----------|
| GET | `/api/dashboard/stats` | Director | KPI-uri reale (mașini stoc, clienți, pending-uri, vânzări) |

---

## 4. Frontend — Componente React

### 4.1 Structura

```
src/components/
├── App/App.jsx              → Router principal + AuthGuard pe fiecare rută
├── AuthGuard/AuthGuard.jsx  → Protecție rute (verifică token + rol)
├── Navbar/Navbar.jsx        → Header glassmorphism, nav links pe rol
├── LoginForm/LoginForm.jsx  → Login cu demo credentials
├── Dashboard/DirectorDashboard.jsx → Dashboard complet director
├── Director/
│   ├── GestiuneMasini.jsx   → CRUD mașini (tabel, modal adaugă/editează, ștergere)
│   ├── CereriTestDrive.jsx  → Tabel cereri test drive + aprobare/respingere
│   ├── CereriDiscount.jsx   → Carduri cereri discount + aprobare/respingere
│   ├── Tranzactii.jsx       → Tabel tranzacții + aprobare vânzări
│   └── AuditLog.jsx         → Tabel readonly istoric acțiuni
├── Client/
│   ├── ClientHome.jsx       → Dashboard client (KPI, recomandări AI, quick actions)
│   ├── CatalogMasini.jsx    → Catalog grid cu filtre sidebar, sort, paginare
│   ├── PaginaMasina.jsx     → Pagină individuală mașină (hero, specs, AI match, radar)
│   └── WishlistMasini.jsx   → Wishlist cu grid carduri + elimină
└── Placeholder/Placeholder.jsx    → Componentă temporară pentru pagini neimplementate
```

### 4.2 Rute Active

#### Director
| Rută | Componentă | Status |
|------|-----------|--------|
| `/director` | DirectorDashboard | ✅ Implementat |
| `/director/masini` | GestiuneMasini | ✅ Implementat |
| `/director/tranzactii` | Tranzactii | ✅ Implementat |
| `/director/test-drive` | CereriTestDrive | ✅ Implementat |
| `/director/discount` | CereriDiscount | ✅ Implementat |
| `/director/audit-log` | AuditLog | ✅ Implementat |

#### Client
| Rută | Componentă | Status |
|------|-----------|--------|
| `/client` | ClientHome | ✅ Implementat |
| `/client/catalog` | CatalogMasini | ✅ Implementat |
| `/client/masina/:id` | PaginaMasina | ✅ Implementat |
| `/client/wishlist` | WishlistMasini | ✅ Implementat |

#### Mecanic
| Rută | Componentă | Status |
|------|-----------|--------|
| `/mecanic` | MecanicHome | ✅ Implementat |
| `/mecanic/piese` | GestiunePiese | ✅ Implementat |
| `/mecanic/programari` | Placeholder | ⏳ De implementat |

### 4.3 Redux Store

```
store/
├── store.js       → configureStore({ auth, masini })
├── authSlice.js   → login, register, logout, clearError, clearRegisterSuccess
│                    State: { user, token, loading, error, registerSuccess }
│                    Persistă în localStorage: token + user
└── masiniSlice.js → fetchMasini, fetchMasina, addMasina, updateMasina, deleteMasina
                     State: { masini[], masina, loading, error }
```

---

## 5. Design System (Tailwind CSS)

### 5.1 Culori Principale
| Token | Hex | Utilizare |
|-------|-----|-----------|
| `primary` | #895af6 | Brand color (mov/purpuriu) |
| `primary-dark` | #7040d6 | Hover states |
| `secondary` | #2e2249 | Panel backgrounds |
| `bg-dark` | #151022 | Body background |
| `accent-gold` | #D4AF37 | Promoții, prețuri |
| `accent-teal` | #2DD4BF | Succese, clienți |
| `accent-emerald` | #10b981 | Disponibil, sold |
| `accent-coral` | #fb7185 | Erori |
| `accent-amber` | #f59e0b | Warnings, pending |
| `accent-red` | #ef4444 | Respins, delete |

### 5.2 CSS Utility Classes
| Clasă | Efect |
|-------|-------|
| `.glass-panel` | Semi-transparent bg + blur(16px) + subtle border |
| `.glass-card` | Mov semi-transparent bg + border |
| `.glass-header` | Header bg cu blur + bottom border |
| `.text-gradient-gold` | Gradient text auriu |

### 5.3 Fonturi și Icoane
- **Font:** Inter (Google Fonts) — body + display
- **Icoane:** Material Symbols Outlined (Google Fonts)
- **Sintaxă:** `<span className="material-symbols-outlined">icon_name</span>`

---

## 6. Conturi de Test

| Rol | Email | Parolă | Nume |
|-----|-------|--------|------|
| Director | director@aeryan.ro | parola123 | Popescu Ion |
| Client | maria@email.com | parola123 | Ionescu Maria |
| Client | andrei@email.com | parola123 | Georgescu Andrei |
| Mecanic | mecanic@aeryan.ro | parola123 | Dumitrescu Vasile |

**Script:** `node data-preload.js` (din folder `server/`)

---

## 7. Comenzi Importante

```bash
# Start Server (din /server)
node server.js                 # → http://localhost:3001

# Start Client (din /client)
npm run dev                    # → http://localhost:5173

# Populare baza de date
node data-preload.js           # Inserare date test

# Build producție
npx vite build                 # Output: dist/

# Instalare dependențe
npm install                    # Rulat separat în /server și /client
```

---

## 8. Funcționalități Planificate (din Documentație)

### Director (conform secț. 2.1.1)
- [x] Dashboard KPI (Vânzări, Stoc, Pending, Clienți)
- [x] Grafic vânzări SVG
- [x] Cereri aprobare (test drive + discount + tranzacții)
- [x] Tranzacții recente
- [x] Acțiuni rapide
- [ ] Audit Log (toate acțiunile cu data + ora)
- [ ] CRUD Mașini (adaugă/editează/șterge)
- [ ] Export PDF rapoarte
- [ ] Vizualizare clienți activi + mașinile vizualizate

### Client (conform secț. 2.1.2)
- [ ] Catalog cu carduri (poză, specs, preț, promoție)
- [ ] Filtre sidebar (marcă, preț, an, combustibil, caroserie)
- [ ] Sortare AI Recommendation
- [ ] Cerere discount (formular cu valoare dorită)
- [ ] Cerere test drive (alege mașină, dată, oră)
- [ ] Simulare credit (salariu, perioadă, avans)
- [ ] Wishlist (favorite)
- [ ] Notificări (răspunsuri director)

### Mecanic (conform secț. 2.1.3)
- [x] Lista reparații active (filtre: Toate/În Lucru/Urgent)
- [x] Workspace reparație (header, problemă, piese, fotografii)
- [ ] Constatare tehnică + raport rentabilitate
- [x] Comandă piese de la furnizori
- [x] Alerte stoc + furnizor principal
- [x] Note tehnice către director

### Modul AI (conform secț. 2.1.4)
- [ ] PCA (reducere dimensionalitate scoruri)
- [ ] KNN (K-Nearest Neighbors cu distanță euclidiană)
- [ ] Radar chart (grafic compatibilitate)
- [ ] Match score procentual pe fiecare mașină

---

## 9. Endpoint-uri API Lipsă (de creat)

| Endpoint | Metodă | Acces | Descriere |
|----------|--------|-------|-----------|
| `/api/discount` | POST | Client | Solicită discount |
| `/api/discount` | GET | Director | Lista cereri discount |
| `/api/discount/:id/aproba` | PUT | Director | Aprobă discount |
| `/api/discount/:id/respinge` | PUT | Director | Respinge discount |
| `/api/audit-log` | GET | Director | Istoric acțiuni |
| `/api/dashboard/stats` | GET | Director | KPI-uri reale |
| `/api/dashboard/chart` | GET | Director | Date grafic vânzări |
| `/api/ai/match` | POST | Client | Calcul compatibilitate AI |
| `/api/masini/:id/pdf` | GET | Toți | Generare fișă tehnică PDF |
| `/api/tranzactii/:id/factura` | GET | Director | Generare factură PDF |

---

## 10. Decizii de Arhitectură

1. **Un singur tabel Utilizator** cu câmpul `rol` — nu tabele separate per rol
2. **Scoruri AI pe mașină** (10 scoruri float) — populate de director la adăugare
3. **PiesaReparatie** = tabelă de joncțiune N:M (singura relație N:M din schema)
4. **JWT 24h expiry** — stocat în localStorage pe client
5. **Tailwind CSS v4** — cu `@tailwindcss/vite` plugin, fără `tailwind.config.js`
6. **Design tokens** în `:root` din `index.css` — nu în config Tailwind
7. **Glass utilities** (panel, card, header) — clase CSS custom, refolosite peste tot
8. **Sequelize `alter: true`** — sincronizare automată schema la restart server

---

## 11. Dependențe

### Server (`/server/package.json`)
| Pachet | Versiune | Rol |
|--------|----------|-----|
| express | ^4.21.2 | Web framework |
| sequelize | ^6.37.5 | ORM PostgreSQL |
| pg / pg-hstore | ^8.13.0 | Driver PostgreSQL |
| bcrypt | ^5.1.1 | Hash parole |
| jsonwebtoken | ^9.0.2 | JWT auth |
| cors | ^2.8.5 | Cross-Origin (permite localhost:5173) |
| dotenv | ^16.4.7 | Variabile mediu din .env |
| nodemon | ^3.1.0 | Auto-restart server la modificări |

### Client (`/client/package.json`)
| Pachet | Versiune | Rol |
|--------|----------|-----|
| react | ^19.2.0 | UI framework |
| react-dom | ^19.2.0 | DOM renderer |
| react-router-dom | ^7.13.0 | Client-side routing |
| @reduxjs/toolkit | ^2.11.2 | State management |
| react-redux | ^9.2.0 | React bindings Redux |
| tailwindcss | ^4.1.18 | Utility-first CSS |
| @tailwindcss/vite | ^4.1.18 | Tailwind plugin Vite |
| vite | ^7.3.1 | Build tool |
| @vitejs/plugin-react | ^5.1.1 | React support Vite |

---

## 12. Logica Componentelor Cheie

### AuthGuard
- Verifică dacă există `token` și `user` în Redux state
- Dacă NU → redirect la `/login`
- Dacă DA, dar rolul NU este în `roluriPermise` → redirect la `/acces-interzis`
- Dacă totul e OK → renderizează `children`
- Folosit: `<AuthGuard roluriPermise={['Director']}><Component /></AuthGuard>`

### LoginForm
- Formular cu email + parolă
- 3 butoane rapide "Demo Credentials" (Director, Client, Mecanic) → auto-completează câmpurile
- La submit → dispatch `login()` thunk → fetch POST `/auth/login`
- La succes → salvează token + user în localStorage → redirect la ruta rolului
- Loading state cu spinner pe butonul Submit

### DirectorDashboard (date mock)
- **KPI Cards:** Vânzări €1.2M (+12%), Stoc 45 (12 new), Pending 10 (5 TD + 3 Discount + 2 Tranzacții), Clienți 124
- **Grafic:** SVG cu curbă + gradient fill, label-uri Jan-Dec
- **Cereri Aprobare:** 5 iteme (2 Test Drive, 2 Discount, 1 Tranzacție) cu icoane diferite per tip
- **Tranzacții:** 3 rânduri (Bentley=Sold, Tesla=Reserved, RangeRover=Processing)
- **Acțiuni Rapide:** Add Vehicle, Export Reports, Manage Users, Settings
- **Toast:** Fixed bottom-right, "System Updated" cu animație bounce

### Navbar
- Links diferite per rol (Director=6, Client=3, Mecanic=3)
- Active link detectat cu `useLocation().pathname`
- Logo AerYan cu icon `diamond` + gradient
- Subtitle per rol: "Dashboard Director" / "Premium Client" / "Service & Reparații"

### ClientHome (Client Dashboard)
- **KPI Cards:** Mașini Disponibile (42), Wishlist (3), Test Drives Programate (1)
- **Quick Actions:** 4 butoane navigare (Catalog, Wishlist, Test Drives, Asistență)
- **Recomandări AI:** Grid 3 coloane cu carduri mașini recomandate (Porsche Panamera 94%, Tesla Model S 91%, Mercedes AMG GT 88%)
- Fiecare card: imagine, badge status, AI match circle (conic-gradient), preț gold, buton Vezi Detalii
- Mesaj personalizat cu prenumele utilizatorului din Redux store

### CatalogMasini
- **Sidebar Filtre:** AI Match Score (slider), Brand (checkboxes), Price Range (range slider), Year (range slider), Fuel Type (pill buttons), Tip Caroserie (grid 3x2 SVG icons)
- **Sort dropdown:** AI Recommendation, Price Low/High, Newest
- **Grid carduri mașini** (3 coloane desktop): imagine cu gradient overlay, badge status (Disponibil/Vândut/PROMO), buton wishlist (heart toggle), AI Match % (conic-gradient circle), titlu, specs, preț €, butoane "Vezi Detalii" + "Test Drive"
- **Mașini vândute:** grayscale + opacity-70 + buton "Indisponibil" disabled
- **6 mașini hardcodate:** Porsche Panamera GTS (94%, promo), Mercedes-AMG GT (88%), Audi RS7 (Vândut), BMW M4 Competition (76%), Range Rover Velar (65%, promo), Tesla Model S Plaid (91%, electric)
- **Paginare:** Butoane 1-3...8
- **Vehicule Vizualizate Recent:** Carousel orizontal cu mini card-uri (180px wide)

### PaginaMasina
- **Hero section:** Full-width (60-75vh), imagine, badges (DISPONIBIL, PROMOȚIE -15%), navigation arrows, thumbnails gallery, buton 360°
- **Left column (8/12):** Titlu + rating stars (4.8/5), Price box glass cu preț promoțional + economie, Grid specificații tehnice 2x4, Descriere text, 3 accordions (Interior, Tehnologie, Siguranță)
- **Right column (4/12):** AI Match Card (circular progress SVG + radar chart SVG pentagon 5 axe), Butoane acțiune (Test Drive, Wishlist + Fișă PDF, Contactează Director), Contact card cu avatar + "Online Acum"
- **Mașini Similare:** Carousel orizontal cu 4 card-uri (280px wide)
- **Date hardcodate:** BMW 5 Series F10 520d (€18,500, AI 94%, specs complete)

### WishlistMasini
- **Header:** Titlu cu icon heart, contorizare vehicule + valoare totală
- **Stats:** 3 card-uri (Vehicule Salvate, Valoare Totală, AI Match Mediu)
- **Empty State:** Icon heart_broken, mesaj descriptiv, buton "Explorează Catalogul"
- **Grid carduri:** Similar cu catalagul dar cu buton "Elimină din Wishlist" (heart_broken roșu)
- **3 mașini hardcodate:** Porsche Panamera GTS, Tesla Model S Plaid, BMW M4 Competition

---

## 13. Changelog

| Data | Ce s-a făcut |
|------|-------------|
| 2026-02-13 | Setup Tailwind CSS v4 cu `@tailwindcss/vite` plugin |
| 2026-02-13 | Design tokens în `:root` (culori, glass effects, scrollbar) |
| 2026-02-13 | Rebuild Navbar cu Tailwind (glassmorphism, nav links pe rol) |
| 2026-02-13 | Rebuild LoginForm cu Tailwind (glassmorphism card, demo credentials) |
| 2026-02-13 | Implementare DirectorDashboard complet (KPI, grafic, approval, tranzacții) |
| 2026-02-13 | Rebuild Placeholder cu Tailwind + icon prop |
| 2026-02-13 | Actualizare App.jsx cu rute corecte per rol |
| 2026-02-13 | Ștergere CSS vechi (Dashboard.css, LoginForm.css, Navbar.css, App.css) |
| 2026-02-13 | Adăugare Cereri Discount în KPI Pending + lista de aprobare |
| 2026-02-13 | Adăugare rute `/director/discount` + `/director/audit-log` |
| 2026-02-13 | Adăugare linkuri Discount + Audit Log în Navbar Director |
| 2026-02-13 | Fix `@theme` → `:root` + `background-clip` (warnings CSS) |
| 2026-02-13 | Creare DEVELOPMENT.md (acest fișier) |
| 2026-02-13 | Creare model `AuditLog` (tabel nou: idLog, actiune, detalii, dataOra, ip) |
| 2026-02-13 | Adăugare câmpuri discount în `Tranzactie` (tip, discountProcent, motivDiscount) |
| 2026-02-13 | Relație Utilizator→AuditLog (1:N) în `models/index.js` |
| 2026-02-13 | Endpoint-uri noi: POST/GET/PUT `/api/discount`, GET `/api/audit-log`, GET `/api/dashboard/stats` |
| 2026-02-14 | Implementare `GestiuneMasini.jsx` — CRUD complet (tabel, search, filtre status, modal adaugă/editează, confirmare ștergere, stats) |
| 2026-02-14 | Implementare `CereriTestDrive.jsx` — tabel cereri, stats, filtre, modal aprobare (cu dată programată), modal respingere (cu motiv) |
| 2026-02-14 | Implementare `CereriDiscount.jsx` — carduri discount, stats, filtre, aprobare/respingere directă, calcul preț redus |
| 2026-02-14 | Implementare `Tranzactii.jsx` — tabel tranzacții, search, filtre, modal confirmare aprobare, total vânzări |
| 2026-02-14 | Implementare `AuditLog.jsx` — tabel readonly cu icoane pe tip acțiune, filtre per rol, search, formatare dată/oră |
| 2026-02-14 | Update `App.jsx` — toate rutele Director folosesc componente reale (nu mai sunt Placeholder) |
| 2026-02-14 | Toate componentele Director funcționează cu date hardcodate (fără API) |
| 2026-02-14 | Implementare `ClientHome.jsx` — pagină bun venit Client cu KPI cards, quick actions, recomandări AI grid |
| 2026-02-14 | Implementare `CatalogMasini.jsx` — catalog complet cu sidebar filtre (AI Match, Brand, Price, Year, Fuel, Caroserie), grid carduri, sort, paginare, carousel recent viewed |
| 2026-02-14 | Implementare `PaginaMasina.jsx` — pagină individuală mașină cu hero gallery, specs grid, price box, descriere, accordions, AI Match card cu radar chart SVG, acțiuni, mașini similare |
| 2026-02-14 | Implementare `WishlistMasini.jsx` — wishlist cu grid carduri, stats, empty state, buton elimină din wishlist |
| 2026-02-14 | Update `App.jsx` — toate rutele Client folosesc componente reale + rută nouă `/client/masina/:id` |
| 2026-02-14 | Toate componentele Client funcționează cu date hardcodate (fără API) |
| 2026-02-14 | Implementare `MecanicHome.jsx` — dashboard mecanic 3-coloane: lista reparații (filtre Toate/În Lucru/Urgent, search VIN), workspace reparație (header mașină, status toggle, descriere, piese tabel, note tehnice expandabile, acțiuni sticky), alerte stoc + acțiuni rapide + furnizor |
| 2026-02-14 | Implementare `GestiunePiese.jsx` — inventar piese cu KPI cards, tabel cu search/filtre categorie/stoc/sort, panel detalii piesă selectată cu furnizor și timp livrare |
| 2026-02-14 | Update `App.jsx` — rutele `/mecanic` și `/mecanic/piese` folosesc componente reale (MecanicHome, GestiunePiese) |
| 2026-02-14 | Toate componentele Mecanic funcționează cu date hardcodate (fără API) |
