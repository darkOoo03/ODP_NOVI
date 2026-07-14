# Queen Tracker - Platforma za praćenje kvaliteta pčelinjih matica

**Queen Tracker** je fullstack web aplikacija namenjena pčelarima za digitalnu evidenciju košnica, praćenje porekla i kretanja matica, kao i ocenjivanje i analizu njihovog kvaliteta kroz vreme.

Aplikacija je razvijena u sklopu predmeta *Osnove distribuiranog programiranja*.

---

## 🛠️ Tehnološki Stack

- **Frontend**: React (TypeScript), Vite, Vanilla CSS (napredan beekeeping dark-gold dizajn, stakleni paneli - glassmorphic).
- **Backend**: Node.js, Express.js.
- **Baza podataka**: MySQL (konekcija preko `mysql2/promise` pool-a).
- **Autentifikacija**: JWT (JSON Web Tokens) i `bcrypt` za heširanje lozinki.
- **Validacija**: Troslojna validacija (klijent, Express middleware pomoću `express-validator`, i bazični integritet).

---

## 🐝 Ključne Funkcionalnosti

1. **Autentifikacija i Profil**:
   * Registracija pčelara sa profilnom slikom (Multer biblioteka).
   * Prijava i generisanje JWT tokena (rok važenja 24h).
   * Bezbedna odjava koja beleži logout aktivnost u audit log.
2. **Javni Vodič za Matice (👁️ Gost)**:
   * Detaljan opis sistema i vodič za standardno obeležavanje boja matica po godinama.
   * Interaktivni kalkulator za proračun boje na osnovu unete godine izleganja (podržava godine 2000-2100).
3. **Moje Košnice**:
   * Prikaz košnica u vidu staklenih kartica sa oznakama (format SLOVO-BROJ), lokacijom i aktivnom maticom.
   * Filtriranje po pčelinjaku, lokaciji i tipu košnice.
   * Logičko arhiviranje (soft delete) koje automatski zatvara aktivne dodele.
4. **Moje Matice**:
   * Upravljanje maticama (oznaka u formatu `Q-GODINA-BROJ`, rasa, godina izleganja, poreklo, status).
   * Automatsko predlaganje boje oznake pri unosu godine rođenja.
   * Detaljan prikaz sa istorijom kretanja i grafikonom trenda kvaliteta.
5. **Dodele Matica Košnicama (M:N relacija)**:
   * Pčelar dodeljuje maticu košnici.
   * Sistem osigurava da jedna košnica/matica može imati samo jednu aktivnu dodelu. 
   * Premeštanje matice automatski zatvara staru dodelu i kreira novu.
6. **Kontrole Kvaliteta**:
   * Ocenjivanje 5 dimenzija (kvalitet legla, intenzitet zaleganja, mirnoća, prinos i zdravlje) ocenama od 1 do 5.
   * Automatski proračun ukupne prosečne ocene.
   * **Automatske preporuke**:
     * Ako matica nije viđena -> *Dodati novu maticu*
     * Prosečna ocena $\ge$ 4.0 -> *Zadržati*
     * Prosečna ocena 3.0 - 3.9 -> *Pratiti*
     * Prosečna ocena 2.0 - 2.9 -> *Zameniti*
     * Prosečna ocena < 2.0 -> *Hitno zameniti*
7. **Dashboard Pčelara**:
   * Brza statistika pčelinjaka i upozorenja (stare matice > 2 god, loše ocenjene matice, košnice bez matica, matice bez pregleda > 30 dana).
   * Rang lista najboljih matica i pregled poslednjih 5 kontrola.
8. **Administrativni Panel (⭐ Admin)**:
   * Upravljanje korisnicima (promena uloga, aktivacija/deaktivacija naloga).
   * CRUD upravljanje šifrarnicima (rase matica i tipovi košnica).
   * Pregled kompletne evidencije aktivnosti sistema (Audit Log).

---

## 💾 Struktura Baze Podataka

Šema se automatski inicijalizuje iz [schema.sql](backend/src/config/schema.sql) na startu servera:
* `users` - Korisnički nalozi sa ulogama (`pcelar`, `admin`).
* `hive_types` - Katalog tipova košnica (npr. Dadan-Blat, Langstrot-Rut).
* `queen_breeds` - Katalog rasa matica (npr. Kranjska, Buckfast).
* `hives` - Podaci o košnicama.
* `queens` - Centralna tabela matica.
* `queen_hive_assignments` - Istorija i aktivne dodele matica u košnice.
* `queen_quality_checks` - Pregledi i ocene kvaliteta matica.
* `audit_logs` - Sistemski logovi aktivnosti.

---

## 🚀 Pokretanje Projekta

### 🔑 Podrazumevani Admin Kredencijali
* **Korisničko ime**: `admin`
* **Lozinka**: `Admin12345`

### 1. Serverski Deo (Backend)
Pre nego što pokrenete backend, proverite da li Vam je MySQL server uključen na portu `3306` sa pristupnim parametrima u datoteci `backend/.env` (podrazumevano podešeno na user: `root` i password: `root`).

```bash
cd backend
npm install
npm start
```
*Server će se pokrenuti na portu `5000` i sam će kreirati bazu `queen_tracker` i napuniti kataloge početnim podacima.*

### 2. Klijentski Deo (Frontend)
```bash
cd frontend
npm install
npm run dev
```
*Aplikacija će biti dostupna na adresi `http://localhost:5173` (ili onoj koju Vite ispiše).*
