# VERSO SERVICE - Guida Completa

Gestionale web single-file per magazzino, eventi, team e QR.

## 1. Obiettivo del progetto

L'app serve a gestire tutto il ciclo operativo di un service:
- inventario articoli
- pianificazione e gestione eventi
- verifica disponibilita per data
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

Le regole incluse permettono lettura/scrittura solo a utenti autenticati:

```json
{
  "rules": {
    ".read": "auth != null",
    ".write": "auth != null"
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

La UI e in ascolto realtime (`onValue`) su questi nodi; quando cambia un dato in DB, la pagina si aggiorna automaticamente.

## 6. Mappa pagine (come funziona il sito)

### Magazzino
- CRUD articoli
- ricerca/filtro per categoria
- update rapido quantita con `+/-`
- badge "in evento" calcolato dagli eventi attivi
- export CSV inventario

### Eventi
- CRUD evento con date, stato, note, materiale
- stati: `planned` -> `active` -> `returned`
- stato aggiornabile manualmente e anche automaticamente in base alle date
- ogni evento contiene lista articoli con quantita

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

## 7. Modello dati (schema pratico)

### `inventario/<itemId>`

```json
{
  "id": "abc123",
  "nome": "Moving Head",
  "brand": "Chauvet",
  "modello": "Intimidator",
  "categoria": "Luci",
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

## 8. Storage: cosa usa davvero il progetto

### Realtime Database (principale)
- E il database reale dell'app.
- Tutti i dati persistenti stanno qui (`inventario`, `services`, `team`).
- Il piano gratuito Spark e sufficiente per uso leggero/medio: se superi i limiti il servizio puo bloccarsi temporaneamente, non cancellare automaticamente i dati.

### Backup JSON
- Dal pulsante **Backup** nell'header scarichi un file JSON con `inventario`, `services` e `team`.
- Dal pulsante **Ripristina** puoi ricaricare un backup JSON, con conferma prima di sovrascrivere i dati attuali.
- Conserva periodicamente i backup fuori da Firebase (es. Drive, disco esterno, repo privato).

### `sessionStorage` (browser)
- Usato solo per ricordare l'email dell'utente nella sessione browser.
- Chiavi:
  - `vs_auth_user_v1`
- La sessione reale e gestita da Firebase Authentication.

### Firebase Storage bucket
- `storageBucket` e configurato in `firebaseConfig`.
- Ma nel codice corrente non viene usato nessun upload/download su Firebase Storage.

### Local storage / IndexedDB
- Non usati esplicitamente dal codice applicativo.

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
5. Backup JSON scaricato periodicamente.

## 11. Dove mettere mano quando devi modificare il codice

In `index.html` la logica e organizzata per blocchi. Mappa rapida:
- Login/sessione: funzioni `checkSession`, `doLogin`, `showApp`
- Firebase sync base: listener `onValue` su `inventario/services/team`
- Magazzino: `renderMagazzino`, `saveItem`, `changeQty`, `deleteItem`
- Eventi: `renderService`, `saveService`, `setServiceStato`
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
