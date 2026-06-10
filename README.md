# VERSO SERVICE - Guida Completa

Gestionale web single-file per magazzino, eventi, costi, ordini, camion, team e QR.

## 1. Obiettivo del progetto

L'app serve a gestire tutto il ciclo operativo di un service:
- inventario articoli
- pianificazione e gestione eventi
- verifica disponibilita per data
- gestione costi, entrate e spese operative
- tracciamento ordini/acquisti con costo
- storico assegnazioni camion per data
- rimborsi team e collegamenti economici evento/ordine
- assegnazioni team e ore lavorate
- generazione/scansione QR per movimenti rapidi

## 2. Stack e architettura

- Frontend: HTML + CSS + JavaScript vanilla
- File principale: `index.html` (UI + logica applicativa nello stesso file)
- Backend dati: Firebase Realtime Database
- Login: Firebase Authentication (Email/Password)
- Librerie esterne:
  - `qrcodejs` (generazione QR)
  - `jsQR` (fallback scansione QR da camera)
- Manifest PWA: `manifest.webmanifest`

Nota importante: non c'e un backend custom. Tutte le operazioni CRUD partono dal client verso Firebase.

## 3. Struttura repository

```text
verso-service/
  index.html
  manifest.webmanifest
  icons/
    icon-16.png
    icon-32.png
    icon-192.png
    icon-512.png
    apple-touch-icon.png
  README.md
```

## 4. Avvio locale

Esegui un server statico dalla root progetto.

Esempio con Python:

```bash
python3 -m http.server 5500
```

Apri:

```text
http://localhost:5500/
```

Perche non `file://`:
- camera/scanner non affidabile
- alcune API browser richiedono contesto sicuro
- il progetto mostra un warning dedicato

## 5. Configurazione Firebase

La config Firebase e in testa a `index.html` (`firebaseConfig`).

Per uso online con GitHub Pages:
1. In Firebase Console abilita **Authentication -> Sign-in method -> Email/Password**.
2. Crea manualmente gli utenti autorizzati da **Authentication -> Users**.
3. Pubblica le regole in `database.rules.json` sul Realtime Database.
4. Verifica che GitHub Pages sia tra i domini autorizzati in **Authentication -> Settings -> Authorized domains**.

Le regole incluse permettono lettura/scrittura solo a utenti autenticati e solo sui rami dati usati dall'app (`inventario`, `services`, `team`, `categories`, `finance`, `orders`, `truck`). Qualsiasi altro ramo del Realtime Database resta negato di default:

```json
{
  "rules": {
    "inventario": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "services": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "team": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "categories": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "finance": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "orders": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    "truck": {
      ".read": "auth != null",
      ".write": "auth != null"
    },
    ".read": false,
    ".write": false
  }
}
```

Deploy regole con Firebase CLI:

```bash
firebase login
firebase use verso-service
firebase deploy --only database
```

In alternativa puoi copiare il contenuto di `database.rules.json` nella sezione **Realtime Database -> Rules** della console Firebase.

Path Realtime Database usati:
- `inventario/`
- `services/`
- `team/`
- `categories/`
- `finance/`
- `orders/`
- `truck/`

La UI e in ascolto realtime (`onValue`) su questi nodi; quando cambia un dato in DB, la pagina si aggiorna automaticamente.

## 6. Mappa pagine (come funziona il sito)

### Magazzino
- CRUD articoli
- ricerca/filtro per categoria
- categorie base + categorie personalizzate aggiungibili durante la creazione articolo
- tipo gestione articolo: `reusable` per materiale che rientra, `consumable` per materiale a consumo
- update rapido quantita con `+/-`
- badge "in evento" calcolato dagli eventi attivi
- export CSV inventario

### Eventi
- CRUD evento con date, stato, note, materiale
- stati: `planned` -> `active` -> `returned`
- stato aggiornabile manualmente e anche automaticamente in avanti in base alle date
- vista evento compatta/espandibile per gestire liste lunghe
- ogni evento contiene lista articoli con quantita, raggruppata per categoria quando espanso
- quando un evento passa a `returned`, l'app propone di scalare dal magazzino i consumabili usati
- da evento/preventivo puoi registrare l'incasso nella sezione Costi
- export **Lista carico** in `.txt` con solo materiale e quantita, separato dal preventivo

### Disponibilita
- selezioni una data
- per ogni articolo calcola `disponibili = qty totale - qty impegnata su eventi sovrapposti`
- considera eventi pianificati/in corso, ignora i rientrati

### Scanner
- acquisizione da fotocamera (BarcodeDetector, fallback jsQR)
- input manuale / scanner USB (invio con Enter)
- dopo scansione puoi:
  - aggiornare quantita articolo
  - aprire modifica articolo
  - vedere QR
  - assegnare quantita a un evento
- se assegni da scanner a evento `planned`, evento auto-passa a `active`

### QR Codes
- genera QR per ogni articolo (`VS:<itemId>`)
- dettaglio QR, download PNG, stampa singola o stampa pagina

### Team
- CRUD membri
- assegnazione membri agli eventi
- ore lavorate per membro/evento
- report mensile ore (input mese + export CSV)

### Costi
- CRUD movimenti economici
- tipo movimento: entrata o spesa
- filtro per mese e ricerca libera
- riepilogo entrate, spese, saldo e rimborsi aperti
- collegamento opzionale a evento e ordine
- spese anticipate da membri del team con stato rimborso `open` / `paid`
- grafico annuale entrate/spese mese per mese
- export CSV dei movimenti filtrati

### Ordini
- CRUD ordini/acquisti
- stati: `pending`, `ordered`, `paid`, `received`, `cancelled`
- fornitore, riferimento, oggetto, quantita e costo totale
- riepilogo totale ordini, pagato/arrivato e righe da seguire
- dagli ordini pagati/arrivati puoi registrare la spesa nella sezione Costi
- export CSV ordini

### Camion
- storico semplice di chi prende il camion in una data
- campi: data, nome, note opzionali
- vista mobile-first con date future in alto e storico passato sotto

## 7. Modello dati (schema pratico)

### `inventario/<itemId>`

```json
{
  "id": "abc123",
  "nome": "Moving Head",
  "brand": "Chauvet",
  "modello": "Intimidator",
  "categoria": "Luci",
  "type": "reusable",
  "qty": 8,
  "posizione": "Scaffale A3",
  "seriale": "SN-001",
  "note": "...",
  "updatedAt": 1710000000000
}
```

### `services/<serviceId>`

```json
{
  "id": "svc001",
  "nome": "Evento Piazza",
  "luogo": "Milano",
  "dataOut": "2026-03-10",
  "dataIn": "2026-03-12",
  "stato": "planned",
  "cliente": "Mario Rossi",
  "note": "...",
  "items": {
    "abc123": { "id": "abc123", "qty": 2 }
  },
  "consumablesDeductedAt": 1710000000000,
  "team": {
    "member01": { "id": "member01", "ruolo": "Fonico", "ore": 8 }
  },
  "updatedAt": 1710000000000
}
```

### `team/<memberId>`

```json
{
  "id": "member01",
  "nome": "Luca Bianchi",
  "ruolo": "Tecnico Luci",
  "telefono": "3331234567",
  "note": "..."
}
```

### `categories/<categoryId>`

```json
{
  "id": "cat01",
  "name": "Laser",
  "icon": "✨",
  "order": 7,
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000
}
```

### `finance/<movementId>`

```json
{
  "id": "mov001",
  "type": "expense",
  "date": "2026-06-08",
  "description": "Carburante",
  "category": "Trasporti",
  "amount": 85.5,
  "payment": "Carta",
  "eventId": "svc001",
  "orderId": "",
  "paidByMemberId": "member01",
  "reimbursementStatus": "open",
  "sourceType": "event_income",
  "sourceId": "svc001",
  "note": "...",
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000
}
```

### `orders/<orderId>`

```json
{
  "id": "ord001",
  "date": "2026-06-08",
  "status": "pending",
  "supplier": "Fornitore",
  "reference": "ORD-123",
  "item": "Cavi XLR",
  "qty": 10,
  "amount": 120,
  "note": "...",
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000
}
```

### `truck/<truckEntryId>`

```json
{
  "id": "truck001",
  "date": "2026-06-21",
  "person": "Michi",
  "note": "Ritiro mattina",
  "createdAt": 1710000000000,
  "updatedAt": 1710000000000
}
```

## 8. Storage: cosa usa davvero il progetto

### Realtime Database (principale)
- E il database reale dell'app.
- Tutti i dati persistenti stanno qui (`inventario`, `services`, `team`, `categories`, `finance`, `orders`, `truck`).
- Il piano gratuito Spark e sufficiente per uso leggero/medio: se superi i limiti il servizio puo bloccarsi o rifiutare operazioni, ma non e pensato come sistema di backup pluriennale.
- Su Spark non hai i backup automatici gestiti di Realtime Database. Per zero sorprese operative, conserva sempre copie JSON fuori da Firebase.

### Backup JSON
- Dal pulsante **Backup** nell'header scarichi un file JSON con `inventario`, `services`, `team`, `categories`, `finance`, `orders` e `truck`.
- Il backup include data di export, motivo e conteggi dei rami dati.
- Il download viene consentito solo dopo la prima sincronizzazione completa di magazzino, eventi, team, categorie, costi, ordini e camion.
- Dal pulsante **Ripristina** puoi ricaricare un backup JSON completo, con doppia conferma prima di sovrascrivere i dati attuali.
- Anche il ripristino viene consentito solo dopo la sincronizzazione completa, per poter scaricare una copia corretta dello stato corrente.
- Prima di ogni ripristino l'app scarica automaticamente una copia `verso_pre_ripristino_*.json`.
- Conserva periodicamente i backup fuori da Firebase (es. Drive, disco esterno, repo privato). Consigliato: almeno settimanale, e sempre prima di lavori importanti.

### `sessionStorage` (browser)
- Usato solo per ricordare l'email dell'utente nella sessione browser.
- Chiavi:
  - `vs_auth_user_v1`
- La sessione reale e gestita da Firebase Authentication.

### Firebase Storage bucket
- `storageBucket` e configurato in `firebaseConfig`.
- Ma nel codice corrente non viene usato nessun upload/download su Firebase Storage.

### Local storage / IndexedDB
- `localStorage` viene usato solo per ricordare quando e stato scaricato l'ultimo backup manuale/pre-ripristino:
  - `vs_last_backup_download_v1`
- IndexedDB non e usato esplicitamente dal codice applicativo.

### File generati lato client
- CSV e PNG vengono generati in memoria (Blob/canvas) e scaricati dal browser.
- Non vengono salvati automaticamente nel DB.

### Offline/PWA
- Esiste il `manifest.webmanifest` e le icone.
- Non c'e service worker nel repo: quindi non c'e cache offline applicativa gestita dal progetto.

## 9. Logiche automatiche importanti

### Auto-sync stato eventi
- In base alla data corrente:
  - oggi < `dataOut` -> `planned`
  - oggi tra `dataOut` e `dataIn` -> `active`
  - oggi > `dataIn` -> `returned`
- Sync lanciato dopo login/caricamento dati e controllato periodicamente (anche oltre mezzanotte).

### Calcolo disponibilita articolo
- "Impegnato ora": somma qty articolo su eventi `active`.
- "Impegnato su data": somma qty su eventi che coprono la data selezionata (`dataOut <= data <= dataIn`) e non `returned`.

### Scanner e prelievo evento
- Codice QR atteso: `VS:<itemId>` (supporta anche payload testuali che contengono questa forma).
- Assegnazione da scanner scrive direttamente in `services/<id>/items/<itemId>`.

## 10. Sicurezza attuale (da conoscere prima del deploy pubblico)

Situazione corrente:
- login con Firebase Authentication, senza password hardcoded nel client
- Firebase config pubblica lato client (normale per app Firebase web)
- sicurezza reale affidata a Firebase Auth + regole Realtime Database

Prima del deploy pubblico controlla:
1. Email/Password abilitato in Firebase Auth.
2. Utenti creati manualmente e nessun flusso pubblico di registrazione nell'app.
3. Regole `database.rules.json` pubblicate.
4. Dominio GitHub Pages autorizzato in Firebase Auth.
5. Backup JSON scaricato periodicamente e conservato fuori da Firebase.

## 11. Dove mettere mano quando devi modificare il codice

In `index.html` la logica e organizzata per blocchi. Mappa rapida:
- Login/sessione: funzioni `checkSession`, `doLogin`, `showApp`
- Firebase sync base: listener `onValue` su `inventario/services/team/categories/finance/orders/truck`
- Magazzino: `renderMagazzino`, `saveItem`, `changeQty`, `deleteItem`, `saveCategory`
- Eventi: `renderService`, `saveService`, `setServiceStato`
- Lista carico eventi: `downloadServiceLoadList`, `buildServiceLoadListText`
- Costi: `renderFinance`, `saveFinanceEntry`, `deleteFinanceEntry`, `markFinanceReimbursed`, `recordEventIncome`, `recordOrderExpense`, `exportFinanceCsv`
- Ordini: `renderOrders`, `saveOrder`, `deleteOrder`, `recordOrderExpense`, `exportOrdersCsv`
- Camion: `renderTruck`, `saveTruckEntry`, `deleteTruckEntry`
- Disponibilita: `renderDisponibilita`, `getItemsBusyOnDate`
- Team: `renderTeam`, `saveMember`, `saveAssignment`, `saveAssignmentHours`
- QR: `showQrModal`, `renderQrCodes`, `downloadQr`, `printQr`
- Scanner: `startCamera`, `startBarcodeDetector`, `startJsQrDetector`, `processQrCode`, `scanAssignToEvent`
- Routing UI: `switchPage`, `refreshFabForCurrentPage`

## 12. Limiti noti e migliorie suggerite

- File unico molto grande (`index.html`): manutenzione difficile.
- Assenza test automatici.
- Nessun service worker/offline reale.
- Autenticazione non robusta.

Roadmap minima consigliata:
1. Separare `index.html` in `app.js`, `styles.css`, componenti/moduli.
2. Introdurre Firebase Auth + ruoli.
3. Aggiungere test smoke end-to-end (almeno flussi CRUD + scanner manuale).
4. Definire ambienti `dev`/`prod` con config separate.

## 13. Deploy su GitHub Pages

1. Push del repo su GitHub.
2. `Settings -> Pages`.
3. Source: branch `main`, cartella root (`/`).
4. Attendi pubblicazione.

Ricorda: per funzioni camera su mobile serve HTTPS (GitHub Pages lo fornisce).

---

Se riprendi il progetto dopo mesi, parti da:
1. sezione "Storage" (capire dove stanno i dati)
2. sezione "Mappa pagine"
3. sezione "Dove mettere mano"

Queste tre sezioni ti danno subito visione funzionale + tecnica.
