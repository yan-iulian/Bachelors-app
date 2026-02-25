-- ============================================================
--  AerYan — SEED COMPLET (toate tabelele)
--  Rulează în pgAdmin → Query Tool pe baza AerYanDataBase
--
--  ORDINE OBLIGATORIE:
--    1. Pornește serverul (npm start) ca să creeze tabelele
--    2. Oprește serverul
--    3. Deschide pgAdmin → AerYanDataBase → Query Tool
--    4. Lipește TOT acest fișier → Execute (F5)
--
--  Parola pentru toți utilizatorii: parola123
-- ============================================================


-- ╔══════════════════════════════════════════════════╗
-- ║  0. CURATA DATELE EXISTENTE (ordine FK)         ║
-- ╚══════════════════════════════════════════════════╝

DELETE FROM audit_log;
DELETE FROM piesa_reparatie;
DELETE FROM test_drives;
DELETE FROM tranzactii;
DELETE FROM reparatii;
DELETE FROM piese;
DELETE FROM masini;
DELETE FROM utilizatori;


-- ╔══════════════════════════════════════════════════╗
-- ║  1. UTILIZATORI (5 persoane)                    ║
-- ╚══════════════════════════════════════════════════╝
-- Parola: parola123 → bcrypt hash

INSERT INTO utilizatori (
    "idUtilizator", nume, prenume, email, adresa, parola, telefon,
    activ, "dataInregistrare", wishlist, specializare, rol
) VALUES
(1, 'Yan', 'Adrian', 'directorYan@aeryan.ro',
 'Str. Dealului 10, București', '$2b$10$RY2IEmu6f/k4DqBQikqtleN0H001mq.AYkvj77w1MvKpZtFLHH4..',
 '0720-100-001', true, '2024-03-01 09:00:00', 0, NULL, 'Director'),

(2, 'Popescu', 'Ales', 'popescu.ales@email.com',
 'Str. Victoriei 15, București', '$2b$10$RY2IEmu6f/k4DqBQikqtleN0H001mq.AYkvj77w1MvKpZtFLHH4..',
 '0721-555-001', true, '2025-06-15 14:30:00', 0, NULL, 'Client'),

(3, 'Ionescu', 'Maria', 'ionescu.maria@email.com',
 'Bd. Unirii 42, București', '$2b$10$RY2IEmu6f/k4DqBQikqtleN0H001mq.AYkvj77w1MvKpZtFLHH4..',
 '0731-555-002', true, '2025-09-20 10:15:00', 0, NULL, 'Client'),

(4, 'Dumitrescu', 'Andrei', 'mecanicYan1@aeryan.ro',
 'Str. Industriilor 8, București', '$2b$10$RY2IEmu6f/k4DqBQikqtleN0H001mq.AYkvj77w1MvKpZtFLHH4..',
 '0740-200-001', true, '2024-03-15 08:00:00', 0, 'Motor și Transmisie', 'Mecanic'),

(5, 'Constantinescu', 'Radu', 'mecanicYan2@aeryan.ro',
 'Str. Fabricii 22, București', '$2b$10$RY2IEmu6f/k4DqBQikqtleN0H001mq.AYkvj77w1MvKpZtFLHH4..',
 '0740-200-002', true, '2024-06-01 08:00:00', 0, 'Suspensie și Electrică', 'Mecanic');


-- ╔══════════════════════════════════════════════════╗
-- ║  2. MAȘINI — 55 pentru vânzare                  ║
-- ╚══════════════════════════════════════════════════╝
-- combustibil: 0=Benzină, 1=Diesel, 2=Hibrid, 3=Electric
-- categorieAuto: 0=Sedan, 1=SUV, 2=Coupe, 3=Hatchback, 4=Cabrio, 5=Break
-- status: 'Disponibil' | 'Rezervat' | 'Vandut' | 'În service'

INSERT INTO masini (
    "idMasina", marca, model, "anFabricatie", km, combustibil,
    "pretEuro", "pretPromotional", "esteInPromotie", status,
    "categorieAuto", "locParcare", "imaginePrincipala", descriere,
    "scorViteza", "scorConfort", "scorConsum", "scorManevrabilitate", "scorPret",
    "scorDesignInterior", "scorDesignExterior", "scorSpatiu", "scorAcceleratieCuplu", "scorFrana",
    "idDirector"
) VALUES

-- ── BMW (4 modele) ──────────────────────────────────
(1, 'BMW', 'X5 M50i', 2022, 48200, 0,
 62500, 58900, true, 'Disponibil', 1, 'A-01', '/images/masini/bmw-x5.jpg',
 'SUV premium cu motor V8 biturbo de 530 CP. Tracțiune integrală xDrive, suspensie adaptivă și pachet M Sport Pro.',
 9.2, 8.8, 5.5, 7.5, 6.0, 9, 9, 8, 9.5, 8.5, 1),

(2, 'BMW', 'Seria 3 330i', 2023, 18500, 0,
 45900, NULL, false, 'Disponibil', 0, 'A-02', '/images/masini/bmw-x5.jpg',
 'Sedan sportiv cu motor turbo de 258 CP. Transmisie automată ZF 8 trepte, digital cockpit și asistent de parcare.',
 8.5, 8.0, 7.0, 8.8, 7.5, 8, 8, 7, 8.5, 8.0, 1),

(3, 'BMW', 'X3 xDrive30d', 2021, 62000, 1,
 38900, 36500, true, 'Disponibil', 1, 'A-03', '/images/masini/bmw-x5.jpg',
 'SUV compact diesel cu 286 CP. Tracțiune integrală, navigație profesională și sistem audio Harman Kardon.',
 7.8, 8.2, 7.5, 8.0, 7.8, 8, 8, 7, 7.5, 8.0, 1),

(4, 'BMW', 'M4 Competition', 2023, 8500, 0,
 89900, NULL, false, 'Rezervat', 2, 'A-04', '/images/masini/bmw-x5.jpg',
 'Coupe de performanță cu motor biturbo de 510 CP. Suspensie M Adaptive, diferențial activ M și carbon ceramic brakes.',
 9.8, 7.0, 4.5, 9.0, 5.0, 9, 10, 5, 9.8, 9.5, 1),

-- ── Mercedes-Benz (5 modele) ────────────────────────
(5, 'Mercedes-Benz', 'S-Class W223 S400d', 2021, 42000, 1,
 79900, NULL, false, 'Disponibil', 0, 'B-01', '/images/masini/mercedes-s-class.jpg',
 'Limuzina de lux cu motor diesel de 330 CP. MBUX cu ecran OLED, scaune cu masaj, suspensie pneumatică AIRMATIC.',
 7.5, 10.0, 7.0, 7.0, 5.0, 10, 9, 10, 7.0, 7.5, 1),

(6, 'Mercedes-Benz', 'C-Class C300', 2023, 15000, 0,
 47500, 44900, true, 'Disponibil', 0, 'B-02', '/images/masini/mercedes-s-class.jpg',
 'Sedan premium cu motor turbo de 258 CP, mild hybrid. Display vertical MBUX 11.9", ambient lighting 64 culori.',
 8.0, 8.5, 7.5, 8.0, 7.0, 9, 9, 7, 8.0, 8.0, 1),

(7, 'Mercedes-Benz', 'GLE 450 4MATIC', 2022, 35000, 0,
 68900, NULL, false, 'Disponibil', 1, 'B-03', '/images/masini/mercedes-s-class.jpg',
 'SUV de lux cu motor 6 cilindri inline de 367 CP. Tracțiune integrală, E-Active Body Control și pachet AMG Line.',
 8.2, 9.0, 6.0, 7.5, 6.0, 9, 9, 9, 8.0, 8.0, 1),

(8, 'Mercedes-Benz', 'E-Class E220d', 2023, 22000, 1,
 52900, NULL, false, 'Disponibil', 0, 'B-04', '/images/masini/mercedes-s-class.jpg',
 'Business sedan cu motor diesel de 197 CP. Consum economic, navigație augmented reality și Digital Light.',
 7.0, 9.0, 8.5, 7.5, 7.0, 9, 8, 8, 7.0, 7.5, 1),

(9, 'Mercedes-Benz', 'GLC 300 Coupe', 2022, 28000, 0,
 55900, 52500, true, 'Disponibil', 2, 'B-05', '/images/masini/mercedes-s-class.jpg',
 'SUV Coupe cu motor turbo de 258 CP. Design sportiv, toit panoramic și sistem audio Burmester 3D.',
 8.0, 8.0, 7.0, 8.0, 6.5, 8, 9, 7, 8.0, 7.5, 1),

-- ── Audi (4 modele) ─────────────────────────────────
(10, 'Audi', 'Q7 50 TDI quattro', 2020, 87000, 1,
 42900, NULL, false, 'Disponibil', 1, 'C-01', '/images/masini/audi-q7.jpg',
 'SUV premium cu motor V6 diesel de 286 CP. Quattro permanent, 7 locuri, virtual cockpit plus și Bang & Olufsen 3D.',
 7.5, 9.0, 6.5, 7.0, 6.5, 9, 8, 10, 7.5, 7.5, 1),

(11, 'Audi', 'A6 Avant 45 TFSI', 2022, 31000, 0,
 48500, NULL, false, 'Vandut', 5, 'C-02', '/images/masini/audi-q7.jpg',
 'Break premium cu motor turbo de 265 CP. Portbagaj 565L, matrix LED, head-up display și cruise control adaptiv.',
 8.0, 8.5, 7.0, 7.5, 7.0, 9, 8, 9, 8.0, 7.5, 1),

(12, 'Audi', 'Q5 Sportback 40 TDI', 2023, 19000, 1,
 51900, 48900, true, 'Disponibil', 1, 'C-03', '/images/masini/audi-q7.jpg',
 'SUV Coupe compact cu motor diesel de 204 CP. Quattro, S line exterior, audi virtual cockpit și park assist plus.',
 7.5, 8.0, 8.0, 8.2, 7.0, 8, 9, 7, 7.5, 7.5, 1),

(13, 'Audi', 'e-tron GT RS', 2023, 5200, 3,
 109900, NULL, false, 'Rezervat', 2, 'C-04', '/images/masini/audi-q7.jpg',
 'Gran Turismo electric cu 646 CP. Accelerare 0-100 în 3.3s, autonomie 472 km WLTP și încărcare rapidă 270 kW.',
 9.8, 8.0, 9.5, 8.5, 4.0, 9, 10, 6, 10.0, 9.0, 1),

-- ── Porsche (4 modele) ──────────────────────────────
(14, 'Porsche', 'Cayenne E-Hybrid', 2023, 15000, 2,
 85900, NULL, false, 'Disponibil', 1, 'D-01', '/images/masini/porsche-cayenne.jpg',
 'SUV hibrid plug-in cu 470 CP combinat. Suspensie pneumatică, PASM, Porsche Communication Management și Bose surround.',
 8.5, 8.5, 7.0, 8.0, 5.0, 9, 9, 8, 8.5, 8.5, 1),

(15, 'Porsche', 'Macan S', 2022, 32000, 0,
 65900, 62500, true, 'Disponibil', 1, 'D-02', '/images/masini/porsche-cayenne.jpg',
 'SUV compact sportiv cu motor V6 biturbo de 380 CP. Sport Chrono, PDLS Plus și Porsche Active Suspension Management.',
 8.8, 7.5, 5.5, 9.0, 6.0, 8, 9, 6, 8.8, 8.5, 1),

(16, 'Porsche', '911 Carrera S', 2021, 22000, 0,
 129900, NULL, false, 'Disponibil', 2, 'D-03', '/images/masini/porsche-cayenne.jpg',
 'Iconicul 911 cu motor boxer 3.0 biturbo de 450 CP. PDK 8 trepte, Sport Exhaust, rear-axle steering și PCCB.',
 9.8, 7.0, 5.0, 9.5, 4.5, 9, 10, 4, 9.8, 9.8, 1),

(17, 'Porsche', 'Taycan 4S', 2023, 12000, 3,
 98900, NULL, false, 'Disponibil', 0, 'D-04', '/images/masini/porsche-cayenne.jpg',
 'Sedan electric cu 530 CP. Autonomie 464 km, încărcare 800V, Performance Battery Plus și Porsche Electric Sport Sound.',
 9.5, 8.5, 9.0, 8.5, 5.0, 9, 9, 7, 9.5, 8.5, 1),

-- ── Volkswagen (4 modele) ───────────────────────────
(18, 'Volkswagen', 'Golf 8 R', 2023, 22000, 0,
 48900, NULL, false, 'Disponibil', 3, 'E-01', '/images/masini/vw-golf-r.jpg',
 'Hot hatch cu motor turbo de 320 CP. Tracțiune 4MOTION, cutie DSG 7 trepte, drift mode și Akrapovič exhaust.',
 9.0, 7.5, 6.0, 9.0, 6.5, 8, 8, 6, 9.0, 8.5, 1),

(19, 'Volkswagen', 'Tiguan R-Line 2.0 TDI', 2022, 45000, 1,
 35900, 33500, true, 'Disponibil', 1, 'E-02', '/images/masini/vw-golf-r.jpg',
 'SUV compact diesel cu 200 CP. Pachet R-Line, IQ.DRIVE, Digital Cockpit Pro și Harman Kardon sound system.',
 7.0, 8.0, 8.0, 7.5, 8.0, 8, 8, 8, 7.0, 7.5, 1),

(20, 'Volkswagen', 'Passat Variant 2.0 TDI', 2021, 68000, 1,
 28900, NULL, false, 'Disponibil', 5, 'E-03', '/images/masini/vw-golf-r.jpg',
 'Break executiv cu motor diesel de 200 CP. Portbagaj 650L, Travel Assist, matrix LED și climatronic 3 zone.',
 7.0, 8.5, 8.5, 7.0, 8.5, 8, 7, 9, 7.0, 7.0, 1),

(21, 'Volkswagen', 'ID.4 GTX', 2023, 11000, 3,
 49900, 47500, true, 'Disponibil', 1, 'E-04', '/images/masini/vw-golf-r.jpg',
 'SUV electric cu 299 CP, tracțiune integrală. Autonomie 480 km WLTP, încărcare rapidă 135 kW și head-up display AR.',
 8.0, 8.0, 9.0, 7.5, 7.0, 8, 8, 8, 8.0, 7.5, 1),

-- ── Tesla (4 modele) ────────────────────────────────
(22, 'Tesla', 'Model 3 Long Range', 2023, 18000, 3,
 44900, NULL, false, 'Disponibil', 0, 'F-01', '/images/masini/tesla-model3.jpg',
 'Sedan electric cu 498 CP dual motor. Autonomie 602 km WLTP, Autopilot, ecran central 15.4" și over-the-air updates.',
 9.0, 8.0, 10.0, 8.0, 7.5, 8, 8, 7, 9.5, 8.0, 1),

(23, 'Tesla', 'Model Y Performance', 2023, 9000, 3,
 56900, 54500, true, 'Disponibil', 1, 'F-02', '/images/masini/tesla-model3.jpg',
 'Crossover electric cu 534 CP. 0-100 în 3.7s, autonomie 514 km, glass roof panoramic și Full Self-Driving capability.',
 9.2, 8.0, 9.5, 8.0, 6.5, 8, 8, 8, 9.5, 8.0, 1),

(24, 'Tesla', 'Model S Plaid', 2022, 15000, 3,
 109900, NULL, false, 'Rezervat', 0, 'F-03', '/images/masini/tesla-model3.jpg',
 'Sedan de performanță cu 1020 CP tri-motor. 0-100 în 2.1s, autonomie 637 km, yoke steering și sistem audio 22 speakers.',
 10.0, 8.5, 9.0, 8.0, 4.0, 9, 9, 8, 10.0, 8.5, 1),

(25, 'Tesla', 'Model X Long Range', 2022, 28000, 3,
 89900, NULL, false, 'Disponibil', 1, 'F-04', '/images/masini/tesla-model3.jpg',
 'SUV electric cu uși falcon-wing și 670 CP. 6 locuri, autonomie 576 km, HEPA air filtration și Autopilot Enhanced.',
 8.5, 9.0, 9.0, 7.5, 5.0, 9, 9, 9, 8.5, 8.0, 1),

-- ── Land Rover (4 modele) ───────────────────────────
(26, 'Land Rover', 'Range Rover Sport D300', 2022, 35000, 1,
 78900, NULL, false, 'Disponibil', 1, 'G-01', '/images/masini/range-rover.jpg',
 'SUV sportiv cu motor diesel inline-6 de 300 CP. Terrain Response 2, Dynamic Air Suspension și Meridian Surround.',
 8.0, 9.0, 6.5, 7.5, 5.5, 9, 9, 8, 7.5, 7.5, 1),

(27, 'Land Rover', 'Range Rover Velar P400', 2023, 18000, 0,
 72500, 68900, true, 'Disponibil', 1, 'G-02', '/images/masini/range-rover.jpg',
 'SUV premium cu motor 6 cilindri mild hybrid de 400 CP. Design minimalist, dual touchscreen Pivi Pro și wade sensing.',
 8.5, 8.5, 6.0, 7.0, 5.5, 9, 10, 7, 8.5, 7.5, 1),

(28, 'Land Rover', 'Range Rover Evoque D200', 2023, 12000, 1,
 45900, NULL, false, 'Disponibil', 1, 'G-03', '/images/masini/range-rover.jpg',
 'SUV compact premium cu motor diesel de 204 CP. ClearSight mirror, 360° Surround Camera și matrix LED adaptive.',
 7.0, 8.0, 7.5, 7.5, 7.0, 8, 9, 6, 7.0, 7.5, 1),

(29, 'Land Rover', 'Defender 110 V8', 2022, 25000, 0,
 98900, NULL, false, 'Disponibil', 1, 'G-04', '/images/masini/range-rover.jpg',
 'Off-road iconic cu motor V8 supraalimentat de 525 CP. Reductoare, diferențiale cu blocare, wade depth 900mm.',
 8.5, 7.5, 4.0, 6.5, 5.0, 7, 8, 9, 8.5, 7.0, 1),

-- ── Toyota (4 modele) ───────────────────────────────
(30, 'Toyota', 'GR Supra 3.0', 2023, 8000, 0,
 59900, NULL, false, 'Disponibil', 2, 'H-01', '/images/masini/toyota-supra.jpg',
 'Coupe sportiv cu motor BMW B58 de 340 CP. Propulsie spate, diferențial activ, launch control și Alcantara interior.',
 9.0, 6.5, 5.5, 9.0, 6.0, 8, 9, 4, 9.0, 8.5, 1),

(31, 'Toyota', 'RAV4 Hybrid AWD', 2022, 42000, 2,
 34900, 32500, true, 'Vandut', 1, 'H-02', '/images/masini/toyota-supra.jpg',
 'SUV hibrid cu 222 CP combinat. Tracțiune integrală electrică, Toyota Safety Sense 2.5+ și JBL Premium Audio.',
 7.0, 8.0, 9.0, 7.5, 8.5, 7, 7, 8, 7.0, 7.0, 1),

(32, 'Toyota', 'Corolla 2.0 Hybrid', 2023, 15000, 2,
 26900, NULL, false, 'Disponibil', 3, 'H-03', '/images/masini/toyota-supra.jpg',
 'Hatchback hibrid cu 196 CP. Consum de 4.5L/100km, multimedia 10.5", wireless CarPlay și cruise control adaptiv.',
 7.5, 7.5, 9.5, 8.0, 9.0, 7, 7, 7, 7.0, 7.0, 1),

(33, 'Toyota', 'Land Cruiser 300 3.3D', 2023, 12000, 1,
 89900, NULL, false, 'Disponibil', 1, 'H-04', '/images/masini/toyota-supra.jpg',
 'SUV legendar cu motor V6 diesel de 309 CP. TNGA-F, Multi-Terrain Select, crawl control și diferențiale cu blocare.',
 7.5, 8.5, 5.5, 6.5, 5.0, 8, 8, 10, 7.5, 7.0, 1),

-- ── Volvo (4 modele) ────────────────────────────────
(34, 'Volvo', 'XC90 T8 Recharge', 2022, 38000, 2,
 68900, 64900, true, 'Disponibil', 1, 'I-01', '/images/masini/volvo-xc90.jpg',
 'SUV hibrid plug-in cu 455 CP. 7 locuri, Bowers & Wilkins, suspensie pneumatică și Pilot Assist nivel 2.',
 8.0, 9.5, 7.5, 7.0, 6.0, 9, 8, 10, 8.0, 7.5, 1),

(35, 'Volvo', 'XC60 B5 AWD', 2023, 20000, 0,
 52500, NULL, false, 'Disponibil', 1, 'I-02', '/images/masini/volvo-xc90.jpg',
 'SUV compact premium cu motor mild hybrid de 250 CP. Google Built-In, Advanced Air Cleaner și ADAS complet.',
 7.5, 8.5, 7.5, 8.0, 7.0, 9, 8, 7, 7.5, 7.5, 1),

(36, 'Volvo', 'S60 T8 Polestar', 2022, 25000, 2,
 55900, NULL, false, 'Disponibil', 0, 'I-03', '/images/masini/volvo-xc90.jpg',
 'Sedan sportiv hibrid cu 405 CP optimizat Polestar. Suspensie Öhlins, ambreiaj activ și eșapament sport.',
 8.5, 8.0, 7.0, 8.5, 6.5, 8, 8, 7, 8.5, 8.0, 1),

(37, 'Volvo', 'V60 Cross Country B5', 2023, 30000, 1,
 47900, 44500, true, 'Disponibil', 5, 'I-04', '/images/masini/volvo-xc90.jpg',
 'Break offroadizat cu motor diesel mild hybrid de 235 CP. Gardă la sol mărită, tracțiune integrală și portbagaj 529L.',
 7.0, 8.5, 8.0, 7.5, 7.5, 8, 7, 9, 7.0, 7.0, 1),

-- ── Ford (4 modele) ─────────────────────────────────
(38, 'Ford', 'Mustang GT 5.0 V8', 2023, 5000, 0,
 55900, NULL, false, 'Disponibil', 2, 'J-01', '/images/masini/ford-mustang.jpg',
 'Muscle car cu motor V8 Coyote de 450 CP. Transmisie manuală 6 trepte, MagneRide, launch control și mode sport.',
 9.0, 6.5, 3.5, 7.5, 6.5, 7, 9, 5, 9.0, 7.5, 1),

(39, 'Ford', 'Kuga 2.5 PHEV', 2022, 35000, 2,
 32900, 30500, true, 'Disponibil', 1, 'J-02', '/images/masini/ford-mustang.jpg',
 'SUV plug-in hybrid cu 225 CP. Autonomie electrică 56 km, SYNC 4, matrix LED și Ford Co-Pilot360.',
 7.0, 7.5, 8.5, 7.5, 8.0, 7, 7, 8, 7.0, 7.0, 1),

(40, 'Ford', 'Explorer 3.0 V6 PHEV', 2023, 15000, 2,
 68900, NULL, false, 'Disponibil', 1, 'J-03', '/images/masini/ford-mustang.jpg',
 'SUV mare cu V6 plug-in hybrid de 457 CP. 7 locuri, tracțiune integrală, B&O sound system și head-up display.',
 8.0, 8.5, 6.5, 7.0, 5.5, 8, 8, 9, 8.0, 7.5, 1),

(41, 'Ford', 'Puma ST', 2023, 12000, 0,
 32500, NULL, false, 'Vandut', 1, 'J-04', '/images/masini/ford-mustang.jpg',
 'Crossover sportiv cu motor EcoBoost de 200 CP. MegaBox 80L, FordPass Connect, matrix LED și Bang & Olufsen audio.',
 8.0, 7.0, 7.0, 8.5, 8.0, 7, 8, 6, 8.0, 7.5, 1),

-- ── Jaguar (3 modele) ───────────────────────────────
(42, 'Jaguar', 'F-PACE SVR', 2022, 20000, 0,
 89900, NULL, false, 'Disponibil', 1, 'K-01', '/images/masini/jaguar.jpg',
 'SUV de performanță cu motor V8 supraalimentat de 550 CP. 0-100 în 4.0s, eșapament quad, suspensie adaptivă.',
 9.2, 7.5, 4.0, 8.0, 5.0, 8, 9, 7, 9.2, 8.5, 1),

(43, 'Jaguar', 'F-TYPE R-Dynamic', 2023, 8000, 0,
 79500, 75900, true, 'Disponibil', 2, 'K-02', '/images/masini/jaguar.jpg',
 'Coupe sportiv cu motor V8 de 450 CP. Active exhaust, torque vectoring, configurable dynamics și Meridian 770W.',
 9.5, 7.0, 4.5, 9.0, 5.5, 8, 10, 4, 9.5, 9.0, 1),

(44, 'Jaguar', 'I-PACE EV400', 2022, 32000, 3,
 62900, NULL, false, 'Disponibil', 1, 'K-03', '/images/masini/jaguar.jpg',
 'SUV electric cu 400 CP dual motor. Autonomie 470 km, încărcare rapidă 100 kW, air suspension și InControl Touch Pro.',
 8.5, 8.0, 9.0, 8.0, 6.0, 8, 9, 7, 8.5, 8.0, 1),

-- ── Mazda (3 modele) ────────────────────────────────
(45, 'Mazda', 'CX-5 2.5 Turbo AWD', 2023, 18000, 0,
 38900, NULL, false, 'Disponibil', 1, 'L-01', '/images/masini/mazda.jpg',
 'SUV compact cu motor turbo de 256 CP. Tracțiune integrală i-ACTIV, interior Nappa, head-up display și Bose audio.',
 8.0, 8.0, 6.5, 8.0, 7.5, 8, 8, 7, 8.0, 7.5, 1),

(46, 'Mazda', 'MX-5 RF 2.0', 2023, 5000, 0,
 35900, 33900, true, 'Disponibil', 4, 'L-02', '/images/masini/mazda.jpg',
 'Roadster cu toit retractabil și motor SkyActiv-G de 184 CP. Doar 1100 kg, distribuție 50:50 și LSD Torsen.',
 8.0, 6.0, 7.5, 9.5, 8.0, 7, 9, 3, 8.0, 7.5, 1),

(47, 'Mazda', 'CX-60 3.3 e-Skyactiv D', 2023, 10000, 1,
 46900, NULL, false, 'Disponibil', 1, 'L-03', '/images/masini/mazda.jpg',
 'SUV premium cu motor inline-6 diesel de 254 CP. Platformă propulsie spate, interior Takumi și driver personalization.',
 7.5, 8.5, 8.0, 7.5, 7.0, 9, 8, 8, 7.5, 7.5, 1),

-- ── Nissan (3 modele) ───────────────────────────────
(48, 'Nissan', 'GT-R Nismo', 2022, 3000, 0,
 189900, NULL, false, 'Rezervat', 2, 'M-01', '/images/masini/nissan.jpg',
 'Supercar cu motor V6 biturbo de 600 CP. Bose Performance audio, carbon ceramic brakes, Bilstein DampTronic.',
 10.0, 6.0, 3.5, 9.0, 3.0, 8, 9, 4, 10.0, 9.5, 1),

(49, 'Nissan', 'Qashqai e-POWER', 2023, 14000, 2,
 34500, 32500, true, 'Disponibil', 1, 'M-02', '/images/masini/nissan.jpg',
 'Crossover cu sistem e-POWER (motor electric + generator benzină). 190 CP, ProPILOT Assist și around view monitor.',
 7.0, 7.5, 8.5, 7.5, 8.0, 7, 7, 7, 7.0, 7.0, 1),

(50, 'Nissan', 'Ariya 87kWh AWD', 2023, 8000, 3,
 52900, NULL, false, 'Disponibil', 1, 'M-03', '/images/masini/nissan.jpg',
 'Crossover electric cu 394 CP dual motor. Autonomie 460 km, e-4ORCE AWD, ProPILOT 2.0 și haptic controls.',
 8.0, 8.0, 9.0, 7.5, 6.5, 8, 8, 7, 8.0, 7.5, 1),

-- ── Hyundai (3 modele) ──────────────────────────────
(51, 'Hyundai', 'Ioniq 5 N', 2024, 2000, 3,
 62900, NULL, false, 'Disponibil', 3, 'N-01', '/images/masini/hyundai.jpg',
 'Hot hatch electric cu 650 CP dual motor. 0-100 în 3.4s, N e-shift, N Active Sound+, drift mode și autonomie 448 km.',
 9.5, 7.5, 8.5, 8.5, 5.5, 8, 9, 7, 9.8, 8.5, 1),

(52, 'Hyundai', 'Tucson 1.6 T-GDi HEV', 2023, 22000, 2,
 36500, 34500, true, 'Disponibil', 1, 'N-02', '/images/masini/hyundai.jpg',
 'SUV compact hibrid cu 230 CP. Design parametric, Digital Cockpit 10.25", SmartSense complet și mate grey paint.',
 7.5, 8.0, 8.5, 7.5, 8.0, 8, 8, 7, 7.5, 7.0, 1),

(53, 'Hyundai', 'Kona N 2.0 Turbo', 2023, 16000, 0,
 35900, NULL, false, 'Disponibil', 1, 'N-03', '/images/masini/hyundai.jpg',
 'SUV sportiv cu motor turbo de 280 CP. N DCT 8 trepte, launch control, variable exhaust și N Corner Carving Diff.',
 8.5, 7.0, 6.0, 8.5, 7.5, 7, 8, 6, 8.5, 8.0, 1),

-- ── Lexus (2 modele) ────────────────────────────────
(54, 'Lexus', 'RX 500h F SPORT', 2023, 10000, 2,
 72900, NULL, false, 'Disponibil', 1, 'O-01', '/images/masini/lexus.jpg',
 'SUV hibrid turbo cu 371 CP. DIRECT4 AWD, suspensie adaptivă AVS, Mark Levinson 21 speakers și Lexus Safety System+.',
 8.0, 9.0, 7.5, 8.0, 5.5, 9, 9, 8, 8.0, 8.0, 1),

(55, 'Lexus', 'LC 500 V8', 2022, 12000, 0,
 99900, NULL, false, 'Rezervat', 2, 'O-02', '/images/masini/lexus.jpg',
 'Gran Turismo cu motor V8 aspirat de 464 CP. Cutie 10 trepte, sport+ mode, carbon roof și Mark Levinson Reference.',
 9.0, 8.0, 4.5, 8.5, 5.0, 9, 10, 5, 9.0, 8.5, 1),


-- ╔══════════════════════════════════════════════════╗
-- ║  3. MAȘINI — 13 pentru reparații (NU de vânzare) ║
-- ╚══════════════════════════════════════════════════╝
-- 8 în lucru / așteptare piese  +  5 în evaluare profitabilitate

-- 8 mașini în reparație activă (status = 'În service')
(56, 'BMW', '520d F10', 2017, 182000, 1,
 14500, NULL, false, 'În service', 0, 'S-01', '/images/masini/bmw-x5.jpg',
 'Sedan diesel cu 190 CP. Necesită înlocuire kit distribuție complet și pompă de apă. Motor N47 cu 182.000 km.',
 7.0, 7.5, 7.5, 7.0, 8.0, 7, 7, 7, 7.0, 7.0, 1),

(57, 'Mercedes-Benz', 'C220d W205', 2016, 195000, 1,
 13200, NULL, false, 'În service', 0, 'S-02', '/images/masini/mercedes-s-class.jpg',
 'Sedan diesel cu 170 CP. Cutie automată 9G-Tronic cu probleme de schimbare. Necesită reconditionare completă.',
 6.5, 7.5, 7.5, 7.0, 8.5, 7, 7, 7, 6.5, 7.0, 1),

(58, 'Audi', 'A4 2.0 TDI B9', 2018, 145000, 1,
 15800, NULL, false, 'În service', 0, 'S-03', '/images/masini/audi-q7.jpg',
 'Sedan diesel cu 190 CP. Turbosuflantă defectă, intercooler fisurat. Motor EA288 necesită reconditionare turbo.',
 7.0, 7.5, 7.0, 7.5, 8.0, 7, 7, 7, 7.0, 7.0, 1),

(59, 'Volkswagen', 'Passat 2.0 TDI B8', 2015, 220000, 1,
 9800, NULL, false, 'În service', 5, 'S-04', '/images/masini/vw-golf-r.jpg',
 'Break diesel cu 150 CP. Filtru particule DPF colmatat, supapă EGR blocată. Necesită regenerare/înlocuire.',
 6.5, 7.5, 7.0, 6.5, 9.0, 7, 6, 8, 6.5, 6.5, 1),

(60, 'Toyota', 'Corolla 1.6 Valvematic', 2017, 168000, 0,
 8500, NULL, false, 'În service', 0, 'S-05', '/images/masini/toyota-supra.jpg',
 'Sedan benzină cu 132 CP. Ambreiaj uzat, volantă bimasa cu joc. Necesită kit ambreiaj complet cu volantă.',
 6.0, 7.0, 7.5, 7.0, 9.0, 6, 6, 7, 6.0, 6.5, 1),

(61, 'Ford', 'Focus ST 2.0 EcoBoost', 2019, 98000, 0,
 16500, NULL, false, 'În service', 3, 'S-06', '/images/masini/ford-mustang.jpg',
 'Hatchback sportiv cu 250 CP. Suspensie față deteriorată complet: amortizoare, bielete, bucșe și rulmenți.',
 8.0, 6.0, 6.0, 7.0, 7.5, 7, 7, 6, 8.0, 7.0, 1),

(62, 'Volvo', 'V40 D3 Cross Country', 2016, 185000, 1,
 10200, NULL, false, 'În service', 3, 'S-07', '/images/masini/volvo-xc90.jpg',
 'Hatchback diesel cu 150 CP. Probleme sistem electric: alternator defect, senzori ABS eronați, releu principal.',
 6.5, 7.0, 7.0, 7.0, 8.5, 7, 6, 6, 6.5, 6.5, 1),

(63, 'Nissan', 'Qashqai 1.5 dCi J11', 2018, 135000, 1,
 11500, NULL, false, 'În service', 1, 'S-08', '/images/masini/nissan.jpg',
 'SUV compact diesel cu 115 CP. Kit ambreiaj uzat și volantă bimasa cu zgomote. Necesită înlocuire completă.',
 6.0, 7.0, 8.0, 7.0, 8.5, 6, 6, 7, 6.0, 6.5, 1),

-- 5 mașini în evaluare profitabilitate (tot 'În service', statusReparatie=0)
(64, 'Hyundai', 'i30 N Performance', 2019, 88000, 0,
 14900, NULL, false, 'În service', 3, 'S-09', '/images/masini/hyundai.jpg',
 'Evaluare: Motor cu bătăi la turație mare. Posibilă înlocuire completă motor. Cost estimat ridicat vs. valoare.',
 7.5, 6.5, 6.0, 8.0, 7.0, 7, 7, 6, 7.5, 7.0, 1),

(65, 'Mazda', '6 2.2 Skyactiv-D', 2016, 210000, 1,
 7200, NULL, false, 'În service', 0, 'S-10', '/images/masini/mazda.jpg',
 'Evaluare: Rugină avansată pe șasiu și lonjeroane. Necesită sudură extensivă și tratament anticoroziv complet.',
 6.5, 7.0, 7.5, 7.0, 8.5, 7, 6, 7, 6.5, 7.0, 1),

(66, 'Lexus', 'IS 300h F Sport', 2015, 230000, 2,
 9500, NULL, false, 'În service', 0, 'S-11', '/images/masini/lexus.jpg',
 'Evaluare: Sistem hibrid defect, baterie NiMH degradată sub 40%. Înlocuire baterie — cost vs. valoare reziduală.',
 6.5, 7.5, 6.0, 7.0, 7.5, 8, 7, 6, 6.5, 7.0, 1),

(67, 'Land Rover', 'Discovery Sport TD4', 2017, 175000, 1,
 12800, NULL, false, 'În service', 1, 'S-12', '/images/masini/range-rover.jpg',
 'Evaluare: Cutie transfer defectă, suspensie pneumatică compromisă pe 2 colțuri. Multiple sisteme afectate.',
 6.5, 6.5, 6.0, 6.0, 7.5, 7, 7, 8, 6.5, 6.0, 1),

(68, 'Porsche', 'Panamera 4.0 V8', 2015, 195000, 0,
 22000, NULL, false, 'În service', 0, 'S-13', '/images/masini/porsche-cayenne.jpg',
 'Evaluare: Motor V8 biturbo cu consum excesiv de ulei, turbo stânga cu joc axial. Reparație costisitoare.',
 7.5, 7.5, 4.0, 7.0, 5.5, 8, 8, 7, 7.5, 7.0, 1);


-- ╔══════════════════════════════════════════════════╗
-- ║  4. REPARAȚII (13 total)                        ║
-- ╚══════════════════════════════════════════════════╝
-- statusReparatie: 0=In Asteptare, 1=In Lucru, 2=Finalizat

INSERT INTO reparatii (
    "idReparatie", "dataInceput", "dataFinalizare",
    "listaPieseNecesare", cost, "statusReparatie",
    "descriereProblema", "idMasina", "idMecanic"
) VALUES
-- 8 reparații active
(1, '2026-01-20 08:30:00', NULL, 4, 1850,  1,
 'Înlocuire kit distribuție complet, pompă de apă, filtru ulei și filtru aer. Motor N47 cu 182k km.',
 56, 4),

(2, '2026-01-25 09:00:00', NULL, 2, 3200,  1,
 'Reconditionare cutie automată 9G-Tronic: înlocuire corp valve, ulei și filtre cutie.',
 57, 5),

(3, '2026-02-01 10:15:00', NULL, 4, 2400,  1,
 'Înlocuire turbosuflantă reconditionată, intercooler nou, filtru aer și filtru ulei motor.',
 58, 4),

(4, '2026-02-03 08:00:00', NULL, 3, 1650,  1,
 'Regenerare DPF chimică, curățare supapă EGR, înlocuire sondă lambda și filtru combustibil.',
 59, 5),

(5, '2026-02-05 11:00:00', NULL, 2, 980,   0,
 'Înlocuire kit ambreiaj complet (disc, placa, rulment) și volantă bimasa. Așteptare piesă — volantă în comandă.',
 60, 4),

(6, '2026-02-07 09:30:00', NULL, 5, 1420,  1,
 'Reparație suspensie față completă: 2 amortizoare, 2 bielete antiruliu, bucșe braț și 2 rulmenți roată.',
 61, 5),

(7, '2026-02-10 08:00:00', NULL, 3, 890,   0,
 'Diagnosticare sistem electric: alternator defect, senzor ABS eronat, releu multifuncțional de înlocuit. Așteptare piese.',
 62, 4),

(8, '2026-02-11 10:00:00', NULL, 3, 1100,  1,
 'Înlocuire kit ambreiaj complet cu volantă bimasa și filtru ulei motor. Nissan 1.5 dCi.',
 63, 5),

-- 5 în evaluare profitabilitate (statusReparatie=0, fără mecanic asignat)
(9,  '2026-02-12 14:00:00', NULL, 0, 0,     0,
 'EVALUARE PROFITABILITATE: Motor cu bătăi la turație mare. Posibilă înlocuire completă motor 2.0T. Cost estimat: 4500-6000€ vs. valoare mașină 14900€.',
 64, NULL),

(10, '2026-02-12 14:30:00', NULL, 0, 0,     0,
 'EVALUARE PROFITABILITATE: Rugină avansată pe șasiu și lonjeroane. Sudură extensivă + tratament anticoroziv. Cost estimat: 3000-4000€ vs. valoare mașină 7200€.',
 65, NULL),

(11, '2026-02-13 09:00:00', NULL, 0, 0,     0,
 'EVALUARE PROFITABILITATE: Baterie hibridă NiMH degradată sub 40%. Înlocuire baterie nouă ~5000€ vs. valoare mașină 9500€.',
 66, NULL),

(12, '2026-02-13 09:30:00', NULL, 0, 0,     0,
 'EVALUARE PROFITABILITATE: Cutie transfer + suspensie pneumatică 2 colturi. Cost estimat: 5500-7000€ vs. valoare mașină 12800€.',
 67, NULL),

(13, '2026-02-13 10:00:00', NULL, 0, 0,     0,
 'EVALUARE PROFITABILITATE: Motor V8 biturbo — consum excesiv ulei + turbo stânga defectă. Cost estimat: 8000-12000€ vs. valoare mașină 22000€.',
 68, NULL);


-- ╔══════════════════════════════════════════════════╗
-- ║  5. PIESE (100 intrări, ~15 furnizori)          ║
-- ╚══════════════════════════════════════════════════╝

INSERT INTO piese (
    "idPiesa", denumire, categorie, pret, stoc, compatibilitate,
    "furnizorNume", "furnizorTelefon", "timpLivrareOre"
) VALUES
-- ── Motor ───────────────────────────────────────────
(1,  'Filtru ulei motor',               'Motor',       35,   48, 'Universal BMW/Audi/VW',   'FilterTech SRL',         '0212-100-001', 24),
(2,  'Filtru ulei motor',               'Motor',       42,   30, 'Universal Mercedes/Volvo', 'Bosch Romania',          '0212-200-002', 24),
(3,  'Filtru aer motor',                'Motor',       55,   35, 'Universal',                'FilterTech SRL',         '0212-100-001', 24),
(4,  'Filtru aer motor',                'Motor',       62,   22, 'BMW/Mini',                 'Hella Romania',          '0212-300-003', 48),
(5,  'Bujie aprindere standard',        'Aprindere',   18,   120,'Universal benzină',        'NGK Romania',            '0212-400-004', 12),
(6,  'Bujie aprindere iridium',         'Aprindere',   45,   60, 'Universal benzină',        'NGK Romania',            '0212-400-004', 12),
(7,  'Bujie aprindere platinum',        'Aprindere',   38,   45, 'Universal benzină',        'Bosch Romania',          '0212-200-002', 24),
(8,  'Bujie aprindere performanță',     'Aprindere',   52,   25, 'Motoare turbo',            'Denso Romania',          '0212-500-005', 48),
(9,  'Bobină aprindere',                'Aprindere',   85,   18, 'BMW/VW/Audi',              'Bosch Romania',          '0212-200-002', 24),
(10, 'Bobină aprindere',                'Aprindere',   92,   12, 'Mercedes/Toyota',          'Denso Romania',          '0212-500-005', 48),
(11, 'Curea distribuție',               'Motor',       45,   28, 'Universal diesel',         'Continental Auto',       '0212-600-006', 24),
(12, 'Curea distribuție',               'Motor',       52,   20, 'Universal diesel',         'Valeo Romania',          '0212-700-007', 24),
(13, 'Kit distribuție complet',         'Motor',       185,  15, 'BMW/VW/Audi diesel',       'Continental Auto',       '0212-600-006', 48),
(14, 'Pompă de apă',                    'Motor',       120,  14, 'Universal',                'Valeo Romania',          '0212-700-007', 48),
(15, 'Termostat motor',                 'Motor',       65,   22, 'Universal',                'Valeo Romania',          '0212-700-007', 24),
(16, 'Senzor temperatură lichid răcire','Motor',       45,   30, 'Universal',                'Bosch Romania',          '0212-200-002', 24),
(17, 'Senzor presiune ulei',            'Motor',       55,   18, 'Universal',                'Bosch Romania',          '0212-200-002', 24),
(18, 'Garnitură chiulasă',              'Motor',       210,  8,  'BMW N47/N57',              'MotorTech Import',       '0212-800-008', 72),
(19, 'Supapă admisie (set 4)',          'Motor',       165,  6,  'BMW/VW 2.0 TDI',          'MotorTech Import',       '0212-800-008', 96),
(20, 'Segmenți piston (set motor)',     'Motor',       195,  5,  'BMW N47/N57',              'MotorTech Import',       '0212-800-008', 96),

-- ── Frâne ───────────────────────────────────────────
(21, 'Plăcuțe frână față ceramice',     'Frâne',       85,   24, 'BMW/Audi/VW',              'Brembo International',   '0212-900-009', 48),
(22, 'Plăcuțe frână față',              'Frâne',       55,   35, 'Universal',                'TRW Automotive',         '0213-100-010', 24),
(23, 'Plăcuțe frână față',              'Frâne',       42,   50, 'Universal',                'FranaPlus SRL',          '0213-200-011', 24),
(24, 'Plăcuțe frână spate ceramice',    'Frâne',       72,   20, 'BMW/Audi/Mercedes',        'Brembo International',   '0212-900-009', 48),
(25, 'Plăcuțe frână spate',             'Frâne',       48,   30, 'Universal',                'TRW Automotive',         '0213-100-010', 24),
(26, 'Disc frână față ventilat',        'Frâne',       135,  16, 'BMW/Audi/VW',              'Brembo International',   '0212-900-009', 48),
(27, 'Disc frână față ventilat',        'Frâne',       95,   22, 'Universal',                'TRW Automotive',         '0213-100-010', 24),
(28, 'Disc frână spate',                'Frâne',       110,  14, 'BMW/Audi/Mercedes',        'Brembo International',   '0212-900-009', 48),
(29, 'Disc frână spate',                'Frâne',       75,   20, 'Universal',                'FranaPlus SRL',          '0213-200-011', 24),
(30, 'Etrier frână față recondiționat', 'Frâne',       225,  6,  'Universal',                'TRW Automotive',         '0213-100-010', 72),
(31, 'Lichid frână DOT 4 (1L)',         'Frâne',       28,   60, 'Universal',                'FranaPlus SRL',          '0213-200-011', 12),
(32, 'Furtun frână flexibil',           'Frâne',       35,   40, 'Universal',                'FranaPlus SRL',          '0213-200-011', 24),
(33, 'Cablu frână de mână',             'Frâne',       42,   15, 'VW/Audi/Skoda',            'FranaPlus SRL',          '0213-200-011', 24),

-- ── Suspensie ───────────────────────────────────────
(34, 'Amortizor față pneumatic',        'Suspensie',   280,  8,  'BMW/Mercedes SUV',         'Monroe Auto',            '0213-300-012', 72),
(35, 'Amortizor față sport',            'Suspensie',   195,  12, 'Universal',                'Sachs Parts',            '0213-400-013', 48),
(36, 'Amortizor spate',                 'Suspensie',   165,  14, 'Universal',                'Monroe Auto',            '0213-300-012', 48),
(37, 'Amortizor spate sport',           'Suspensie',   185,  10, 'Universal',                'Sachs Parts',            '0213-400-013', 48),
(38, 'Arc spiral față',                 'Suspensie',   95,   16, 'BMW/VW/Audi',              'Sachs Parts',            '0213-400-013', 48),
(39, 'Arc spiral spate',                'Suspensie',   85,   18, 'BMW/VW/Audi',              'Sachs Parts',            '0213-400-013', 48),
(40, 'Bieleta antiruliu față',          'Suspensie',   45,   30, 'Universal',                'TRW Automotive',         '0213-100-010', 24),
(41, 'Bieleta antiruliu spate',         'Suspensie',   42,   28, 'Universal',                'TRW Automotive',         '0213-100-010', 24),
(42, 'Bucșă braț suspensie',            'Suspensie',   25,   40, 'Universal',                'AutoParts SRL',          '0213-500-014', 24),
(43, 'Pivot roată',                     'Suspensie',   55,   20, 'BMW/VW/Ford',              'TRW Automotive',         '0213-100-010', 24),
(44, 'Rulment roată față',              'Suspensie',   65,   22, 'Universal',                'AutoParts SRL',          '0213-500-014', 24),
(45, 'Rulment roată spate',             'Suspensie',   60,   20, 'Universal',                'AutoParts SRL',          '0213-500-014', 24),

-- ── Electrică ───────────────────────────────────────
(46, 'Alternator 14V 150A',             'Electrică',   320,  6,  'BMW/VW/Audi',              'Bosch Romania',          '0212-200-002', 72),
(47, 'Alternator 14V 180A',             'Electrică',   385,  4,  'Mercedes/Volvo',           'Denso Romania',          '0212-500-005', 96),
(48, 'Electromotor 12V',                'Electrică',   290,  8,  'BMW/VW/Audi diesel',       'Bosch Romania',          '0212-200-002', 72),
(49, 'Electromotor 12V',                'Electrică',   310,  5,  'Mercedes/Toyota diesel',   'Denso Romania',          '0212-500-005', 96),
(50, 'Baterie auto 72Ah AGM',           'Electrică',   420,  10, 'Universal Start-Stop',     'Bosch Romania',          '0212-200-002', 24),
(51, 'Baterie auto 85Ah AGM',           'Electrică',   520,  6,  'SUV/Premium',              'Bosch Romania',          '0212-200-002', 24),
(52, 'Senzor ABS',                      'Electrică',   95,   16, 'Universal',                'Bosch Romania',          '0212-200-002', 24),
(53, 'Senzor parcare ultrasonic',       'Electrică',   65,   24, 'BMW/Audi/VW',              'Bosch Romania',          '0212-200-002', 24),
(54, 'Senzor parcare ultrasonic',       'Electrică',   72,   18, 'Mercedes/Volvo',           'Valeo Romania',          '0212-700-007', 24),
(55, 'Modul ECU (recondiționat)',       'Electrică',   650,  3,  'BMW seria 3/5',            'Bosch Romania',          '0212-200-002', 120),
(56, 'Releu multifuncțional',           'Electrică',   35,   30, 'Universal',                'Hella Romania',          '0212-300-003', 24),
(57, 'Senzor MAP presiune',             'Electrică',   78,   14, 'Universal turbo',          'Bosch Romania',          '0212-200-002', 24),

-- ── Transmisie ──────────────────────────────────────
(58, 'Kit ambreiaj complet',            'Transmisie',  380,  8,  'VW/Audi/Skoda 2.0',       'Sachs Parts',            '0213-400-013', 72),
(59, 'Kit ambreiaj complet',            'Transmisie',  395,  6,  'BMW/Ford/Toyota',          'Valeo Romania',          '0212-700-007', 72),
(60, 'Volantă bimasa',                  'Transmisie',  450,  5,  'Universal diesel',         'Sachs Parts',            '0213-400-013', 96),
(61, 'Ulei cutie automată ATF (1L)',    'Transmisie',  32,   40, 'Mercedes 9G/BMW ZF',       'EuroPiese Distribution', '0213-600-015', 24),
(62, 'Sincronizator treapta 3-4',       'Transmisie',  185,  4,  'VW/Audi MQ250',           'MotorTech Import',       '0212-800-008', 120),
(63, 'Garnitură carter ulei',           'Transmisie',  28,   25, 'Universal',                'AutoParts SRL',          '0213-500-014', 24),
(64, 'Planetară CV joint',              'Transmisie',  145,  10, 'BMW/VW/Audi',              'EuroPiese Distribution', '0213-600-015', 48),
(65, 'Capăt bară direcție',             'Direcție',    48,   26, 'Universal',                'TRW Automotive',         '0213-100-010', 24),
(66, 'Cremailieră direcție recondiț.',  'Direcție',    520,  3,  'BMW seria 3/5/X3',         'TRW Automotive',         '0213-100-010', 120),

-- ── Răcire ──────────────────────────────────────────
(67, 'Radiator motor aluminiu',         'Răcire',      245,  7,  'BMW/VW/Audi',              'Valeo Romania',          '0212-700-007', 72),
(68, 'Radiator motor aluminiu',         'Răcire',      265,  5,  'Mercedes/Volvo',           'Denso Romania',          '0212-500-005', 72),
(69, 'Ventilator radiator electric',    'Răcire',      180,  8,  'Universal',                'Valeo Romania',          '0212-700-007', 48),
(70, 'Furtun radiator superior',        'Răcire',      38,   20, 'BMW/VW',                   'AutoParts SRL',          '0213-500-014', 24),
(71, 'Furtun radiator inferior',        'Răcire',      35,   22, 'BMW/VW',                   'AutoParts SRL',          '0213-500-014', 24),
(72, 'Lichid răcire G12 concentrat 5L', 'Răcire',      65,   30, 'VW/Audi/Skoda',            'EuroPiese Distribution', '0213-600-015', 12),
(73, 'Intercooler',                     'Răcire',      195,  6,  'Universal turbo',          'MotorTech Import',       '0212-800-008', 72),
(74, 'Pompă lichid răcire electrică',   'Răcire',      155,  5,  'BMW/Mercedes mild hybrid', 'Bosch Romania',          '0212-200-002', 72),

-- ── Iluminare ───────────────────────────────────────
(75, 'Far LED stânga',                  'Iluminare',   520,  4,  'BMW seria 3/5',            'Hella Romania',          '0212-300-003', 120),
(76, 'Far LED dreapta',                 'Iluminare',   520,  4,  'BMW seria 3/5',            'Hella Romania',          '0212-300-003', 120),
(77, 'Far xenon stânga',                'Iluminare',   380,  5,  'Audi/VW',                  'Valeo Romania',          '0212-700-007', 96),
(78, 'Bec H7 halogen (set 2)',          'Iluminare',   22,   60, 'Universal',                'Hella Romania',          '0212-300-003', 12),
(79, 'Bec LED H1 (set 2)',              'Iluminare',   65,   30, 'Universal',                'Bosch Romania',          '0212-200-002', 24),
(80, 'Stop spate LED stânga',           'Iluminare',   185,  6,  'BMW/Mercedes',             'Hella Romania',          '0212-300-003', 72),
(81, 'Stop spate LED dreapta',          'Iluminare',   185,  6,  'BMW/Mercedes',             'Hella Romania',          '0212-300-003', 72),
(82, 'Proiector ceață',                 'Iluminare',   95,   12, 'Universal',                'Valeo Romania',          '0212-700-007', 48),

-- ── Evacuare ────────────────────────────────────────
(83, 'Catalizator',                     'Evacuare',    450,  4,  'VW/Audi 2.0 TDI',         'EuroPiese Distribution', '0213-600-015', 96),
(84, 'Catalizator sport',               'Evacuare',    680,  3,  'BMW/VW benzină',           'MotorTech Import',       '0212-800-008', 120),
(85, 'Filtru particule DPF',            'Evacuare',    850,  3,  'Universal diesel',         'MotorTech Import',       '0212-800-008', 120),
(86, 'Turbosuflantă reconditionată',    'Evacuare',    780,  4,  'VW/Audi EA288 diesel',     'MotorTech Import',       '0212-800-008', 120),
(87, 'Sondă lambda',                    'Evacuare',    95,   16, 'Universal',                'Bosch Romania',          '0212-200-002', 24),
(88, 'Sondă lambda',                    'Evacuare',    105,  10, 'BMW/Toyota',               'Denso Romania',          '0212-500-005', 48),

-- ── Caroserie / Accesorii ───────────────────────────
(89, 'Ștergătoare parbriz (set)',       'Caroserie',   42,   30, 'Universal',                'Bosch Romania',          '0212-200-002', 12),
(90, 'Ștergătoare parbriz (set)',       'Caroserie',   35,   40, 'Universal',                'Valeo Romania',          '0212-700-007', 12),
(91, 'Oglindă retrovizoare electrică',  'Caroserie',   165,  8,  'BMW/Mercedes',             'AutoParts SRL',          '0213-500-014', 72),
(92, 'Macara geam electric stânga',     'Caroserie',   125,  6,  'VW/Audi',                  'AutoParts SRL',          '0213-500-014', 48),
(93, 'Macara geam electric dreapta',    'Caroserie',   125,  6,  'VW/Audi',                  'AutoParts SRL',          '0213-500-014', 48),
(94, 'Balamale capotă (set)',           'Caroserie',   55,   10, 'Universal',                'EuroPiese Distribution', '0213-600-015', 24),

-- ── Filtre suplimentare ─────────────────────────────
(95, 'Filtru combustibil diesel',       'Filtre',      48,   25, 'Universal diesel',         'FilterTech SRL',         '0212-100-001', 24),
(96, 'Filtru combustibil benzină',      'Filtre',      42,   20, 'Universal benzină',        'Bosch Romania',          '0212-200-002', 24),
(97, 'Filtru habitaclu standard',       'Filtre',      28,   45, 'Universal',                'FilterTech SRL',         '0212-100-001', 12),
(98, 'Filtru habitaclu carbon activ',   'Filtre',      48,   30, 'Universal',                'FilterTech SRL',         '0212-100-001', 12),
(99, 'Filtru habitaclu',                'Filtre',      35,   25, 'Toyota/Lexus/Nissan',      'Denso Romania',          '0212-500-005', 24),
(100,'Separator ulei motor (OCV)',      'Filtre',      85,   10, 'BMW/VW turbo',             'FilterTech SRL',         '0212-100-001', 48);


-- ╔══════════════════════════════════════════════════╗
-- ║  6. PIESA_REPARATIE (legătura piese ↔ reparații) ║
-- ╚══════════════════════════════════════════════════╝

INSERT INTO piesa_reparatie ("idPiesa", "idReparatie") VALUES
-- Reparație 1 (BMW 520d — distribuție): curea, kit, pompa apă, filtru ulei, filtru aer
(13, 1), (14, 1), (1, 1), (3, 1),
-- Reparație 2 (Mercedes C220d — cutie automată): ulei cutie x2, garnitură carter
(61, 2), (63, 2),
-- Reparație 3 (Audi A4 — turbo): turbo recondiționată, intercooler, filtru aer, filtru ulei
(86, 3), (73, 3), (3, 3), (1, 3),
-- Reparație 4 (VW Passat — DPF/EGR): DPF, sondă lambda, filtru combustibil
(85, 4), (87, 4), (95, 4),
-- Reparație 5 (Toyota Corolla — ambreiaj): kit ambreiaj, volantă bimasa
(59, 5), (60, 5),
-- Reparație 6 (Ford Focus — suspensie): amortizoare, bielete, bucșe, rulmenți
(35, 6), (36, 6), (40, 6), (42, 6), (44, 6),
-- Reparație 7 (Volvo V40 — electric): alternator, senzor ABS, releu
(46, 7), (52, 7), (56, 7),
-- Reparație 8 (Nissan Qashqai — ambreiaj): kit ambreiaj, volantă, filtru ulei
(58, 8), (60, 8), (1, 8);


-- ╔══════════════════════════════════════════════════╗
-- ║  7. TEST DRIVE-URI (8 cereri)                   ║
-- ╚══════════════════════════════════════════════════╝
-- status: 0=Solicitare, 1=Aprobat, 2=Respins, 3=Efectuat

INSERT INTO test_drives (
    id, "dataSolicitare", "dataProgramata", status,
    "motivRespingere", "idClient", "idDirector", "idMasina"
) VALUES
(1, '2025-12-10 10:00:00', '2025-12-15 14:00:00', 3,
 NULL, 2, 1, 1),        -- Popescu → BMW X5 → Efectuat

(2, '2025-12-18 11:30:00', '2025-12-22 10:00:00', 3,
 NULL, 3, 1, 22),       -- Ionescu → Tesla Model 3 → Efectuat

(3, '2026-01-08 09:00:00', '2026-01-12 15:00:00', 3,
 NULL, 3, 1, 10),       -- Ionescu → Audi Q7 → Efectuat

(4, '2026-01-20 14:00:00', '2026-01-25 11:00:00', 3,
 NULL, 2, 1, 5),        -- Popescu → Mercedes S-Class → Efectuat

(5, '2026-02-01 10:00:00', '2026-02-06 14:00:00', 1,
 NULL, 2, 1, 16),       -- Popescu → Porsche 911 → Aprobat

(6, '2026-02-05 16:00:00', NULL, 2,
 'Mașina este momentan rezervată. Vă vom contacta când devine disponibilă.',
 3, 1, 4),              -- Ionescu → BMW M4 → Respins (Rezervat)

(7, '2026-02-10 11:00:00', NULL, 0,
 NULL, 3, NULL, 27),    -- Ionescu → Range Rover Velar → Solicitare nouă

(8, '2026-02-13 09:30:00', NULL, 0,
 NULL, 2, NULL, 43);    -- Popescu → Jaguar F-TYPE → Solicitare nouă


-- ╔══════════════════════════════════════════════════╗
-- ║  8. TRANZACȚII (10 intrări)                     ║
-- ╚══════════════════════════════════════════════════╝
-- status: 'Processing' | 'Sold' | 'Cancelled'
-- tip:    'Vanzare' | 'Discount'

INSERT INTO tranzactii (
    "idTranzactie", suma, "dataTranzactie", "tipPlata", status,
    tip, "discountProcent", "motivDiscount",
    "contractPDF", "facturaPDF",
    "idClient", "idDirector", "idMasina"
) VALUES
-- Vânzări finalizate
(1, 48500,  '2026-01-15 10:30:00', 'Cash',  'Sold',
 'Vanzare', NULL, NULL, NULL, NULL, 2, 1, 11),
 -- Popescu cumpără Audi A6 Avant (id=11, marcat Vandut)

(2, 32500,  '2026-01-22 14:00:00', 'Card',  'Sold',
 'Vanzare', NULL, NULL, NULL, NULL, 3, 1, 41),
 -- Ionescu cumpără Ford Puma ST (id=41, marcat Vandut)

(3, 32500,  '2026-01-28 11:00:00', 'Rate',  'Sold',
 'Vanzare', NULL, NULL, NULL, NULL, 2, 1, 31),
 -- Popescu cumpără Toyota RAV4 Hybrid (id=31, marcat Vandut)

-- Vânzări în procesare
(4, 44900,  '2026-02-10 16:00:00', 'Card',  'Processing',
 'Vanzare', NULL, NULL, NULL, NULL, 3, 1, 22),
 -- Ionescu vrea Tesla Model 3 → Processing

(5, 98900,  '2026-02-12 09:00:00', 'Cash',  'Processing',
 'Vanzare', NULL, NULL, NULL, NULL, 2, 1, 29),
 -- Popescu vrea Defender V8 → Processing

-- Vânzare anulată
(6, 89900,  '2026-01-05 12:00:00', 'Rate',  'Cancelled',
 'Vanzare', NULL, NULL, NULL, NULL, 3, 1, 42),
 -- Ionescu a renunțat la Jaguar F-PACE SVR

-- Cereri discount
(7, 62500,  '2026-02-11 10:30:00', 'Cash',  'Processing',
 'Discount', 10, 'Client fidel — a mai cumpărat 2 mașini de la noi. Solicităm reducere 10%.',
 NULL, NULL, 3, 1, 1),
 -- Ionescu cere discount 10% pe BMW X5

(8, 129900, '2026-02-12 14:00:00', 'Cash',  'Processing',
 'Discount', 5,  'Plată cash integrală pentru Porsche 911. Solicităm reducere 5%.',
 NULL, NULL, 2, 1, 16),
 -- Popescu cere discount 5% pe Porsche 911

(9, 52900,  '2026-02-06 09:00:00', 'Card',  'Sold',
 'Discount', 8,  'Negociere — mașina are km peste medie. Discount aprobat de director.',
 NULL, NULL, 3, 1, 8),
 -- Ionescu a primit discount 8% pe Mercedes E-Class → Aprobat/Sold

(10, 109900,'2026-02-03 11:00:00', 'Cash',  'Cancelled',
 'Discount', 20, 'Cerere nejustificată — discount prea mare solicitat.',
 NULL, NULL, 2, 1, 13);
 -- Popescu a cerut 20% discount pe Audi e-tron GT RS → Respins/Cancelled


-- ╔══════════════════════════════════════════════════╗
-- ║  9. AUDIT LOG (15 intrări)                      ║
-- ╚══════════════════════════════════════════════════╝

INSERT INTO audit_log (
    "idLog", actiune, detalii, "dataOra", ip, "idUtilizator"
) VALUES
(1,  'LOGIN',              'Director Yan Adrian s-a autentificat în sistem.',
     '2026-02-14 08:00:00', '192.168.1.10', 1),

(2,  'ADAUGARE_MASINA',    'BMW X5 M50i (2022) adăugat în stoc. Preț: 62.500€. Loc: A-01.',
     '2026-02-14 08:15:00', '192.168.1.10', 1),

(3,  'APROBARE_TEST_DRIVE','Test drive aprobat: Popescu Ales → Porsche 911 Carrera S. Data: 06.02.2026.',
     '2026-02-01 11:00:00', '192.168.1.10', 1),

(4,  'RESPINGERE_TEST_DRIVE','Test drive respins: Ionescu Maria → BMW M4 Competition. Motiv: mașină rezervată.',
     '2026-02-05 16:30:00', '192.168.1.10', 1),

(5,  'LOGIN',              'Client Popescu Ales s-a autentificat.',
     '2026-02-10 09:00:00', '192.168.1.25', 2),

(6,  'SOLICITARE_TEST_DRIVE','Popescu Ales a solicitat test drive: Jaguar F-TYPE R-Dynamic.',
     '2026-02-13 09:30:00', '192.168.1.25', 2),

(7,  'CERERE_DISCOUNT',    'Ionescu Maria a solicitat discount 10% pentru BMW X5 M50i. Motiv: client fidel.',
     '2026-02-11 10:30:00', '192.168.1.30', 3),

(8,  'LOGIN',              'Mecanic Dumitrescu Andrei s-a autentificat.',
     '2026-02-10 07:55:00', '192.168.1.50', 4),

(9,  'INCEPUT_REPARATIE',  'Reparație începută: BMW 520d F10 — Kit distribuție + pompă apă. Mecanic: Dumitrescu.',
     '2026-01-20 08:30:00', '192.168.1.50', 4),

(10, 'FINALIZARE_REPARATIE','Exemplu finalizare anterioară: VW Golf 7 reparat — ambreiaj + volantă.',
     '2025-12-15 16:00:00', '192.168.1.50', 4),

(11, 'MODIFICARE_PRET',    'Director a modificat prețul BMW X3: 38.900€ → promoție 36.500€.',
     '2026-02-01 09:00:00', '192.168.1.10', 1),

(12, 'VIZUALIZARE_MASINA', 'Ionescu Maria a vizualizat detalii: Tesla Model 3 Long Range.',
     '2026-02-09 18:45:00', '192.168.1.30', 3),

(13, 'EXPORT_RAPORT',      'Director a exportat raportul de stoc auto — 55 vehicule, valoare totală: 3.2M€.',
     '2026-02-13 17:00:00', '192.168.1.10', 1),

(14, 'COMANDA_PIESE',      'Mecanic Constantinescu a comandat piese: Kit ambreiaj Sachs + Volantă bimasa pentru Nissan Qashqai.',
     '2026-02-11 10:30:00', '192.168.1.51', 5),

(15, 'APROBARE_DISCOUNT',  'Director a aprobat discount 8% pentru Ionescu Maria — Mercedes E-Class E220d.',
     '2026-02-06 09:15:00', '192.168.1.10', 1);


-- ╔══════════════════════════════════════════════════╗
-- ║  10. RESETARE SECVENȚE AUTO-INCREMENT            ║
-- ╚══════════════════════════════════════════════════╝

SELECT setval(pg_get_serial_sequence('utilizatori', 'idUtilizator'), (SELECT MAX("idUtilizator") FROM utilizatori));
SELECT setval(pg_get_serial_sequence('masini',      'idMasina'),     (SELECT MAX("idMasina")     FROM masini));
SELECT setval(pg_get_serial_sequence('reparatii',   'idReparatie'),  (SELECT MAX("idReparatie")  FROM reparatii));
SELECT setval(pg_get_serial_sequence('piese',       'idPiesa'),      (SELECT MAX("idPiesa")      FROM piese));
SELECT setval(pg_get_serial_sequence('test_drives', 'id'),           (SELECT MAX(id)             FROM test_drives));
SELECT setval(pg_get_serial_sequence('tranzactii',  'idTranzactie'), (SELECT MAX("idTranzactie") FROM tranzactii));
SELECT setval(pg_get_serial_sequence('audit_log',   'idLog'),        (SELECT MAX("idLog")        FROM audit_log));


-- ============================================================
--  REZUMAT DATE INSERATE:
--  • 5 utilizatori (1 director, 2 clienți, 2 mecanici)
--  • 68 mașini (55 vânzare + 13 service/evaluare)
--  • 13 reparații (8 active + 5 evaluare profitabilitate)
--  • 100 piese de la 15 furnizori
--  • 26 legături piese ↔ reparații
--  • 8 cereri test drive (diverse statusuri)
--  • 10 tranzacții (3 sold, 2 processing, 1 cancelled, 4 discount)
--  • 15 log-uri audit
--
--  Credențiale:
--  • directorYan@aeryan.ro     / parola123  (Director)
--  • popescu.ales@email.com    / parola123  (Client)
--  • ionescu.maria@email.com   / parola123  (Client)
--  • mecanicYan1@aeryan.ro     / parola123  (Mecanic)
--  • mecanicYan2@aeryan.ro     / parola123  (Mecanic)
-- ============================================================
