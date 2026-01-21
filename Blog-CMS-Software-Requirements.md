# Blog/CMS Software - Vollständige Requirements

**Version:** 1.0  
**Datum:** 18. Januar 2026  
**Projekt:** Custom Blog/CMS-Plattform  
**Zielgruppe:** Entwickler, KI-Assistenten

---

## 🎯 Projekt-Übersicht

Entwicklung einer vollständigen, selbst-gehosteten Blog/CMS-Software mit Fokus auf:
- Performance & Skalierbarkeit
- Rechtliche DSGVO/Cookie-Konformität
- API-First Architektur für KI-Integration
- Umfassendes Benutzermanagement
- SEO-Optimierung

---

## 📋 Funktionale Anforderungen

### 1. Content Management

#### 1.1 Beitrags-Editor
- **Rich-Text WYSIWYG-Editor** (z.B. TinyMCE, CKEditor, Quill)
- **Markdown-Unterstützung** als Alternative
- **Code-Syntax-Highlighting** für technische Beiträge
- **Drag & Drop für Medien** (Bilder, Videos)
- **Auto-Save Funktionalität** (alle 30 Sekunden)
- **Versionierung** - Wiederherstellung früherer Versionen
- **Vorschau-Modus** (Desktop/Tablet/Mobile)
- **Zeitgesteuerte Veröffentlichung** (Scheduling)
- **Entwürfe, Geplant, Veröffentlicht, Archiviert** Status

#### 1.2 Medien-Management
- **Upload-Formate:**
  - Bilder: JPG, PNG, WEBP, GIF, SVG
  - Videos: MP4, WEBM, OGG
  - Dokumente: PDF
- **Automatische Bildoptimierung** (Kompression, WebP-Konvertierung)
- **Responsive Bilder** (srcset-Generierung)
- **Thumbnail-Generierung** (verschiedene Größen)
- **Video-Thumbnails** automatisch extrahieren
- **CDN-Integration** optional
- **Mediathek** mit Kategorisierung und Suche
- **Maximale Upload-Größe:** Konfigurierbar (Standard: 50MB)

#### 1.3 Seiten & Struktur
- **Statische Seiten** (Impressum, Datenschutz, About, etc.)
- **Kategorien & Tags** für Beiträge
- **Menü-Builder** (Header, Footer, Sidebar)
- **Custom URLs** (Slugs) mit automatischer Vorschlagslogik
- **Breadcrumbs** automatisch
- **Landingpages** mit Custom-Templates

### 2. Admin-Bereich

#### 2.1 Dashboard
- **Übersicht:**
  - Heute veröffentlichte Beiträge
  - Seitenaufrufe (heute/Woche/Monat)
  - Neue Kommentare/Interaktionen
  - System-Status (Speicher, Backups, Updates)
- **Schnellzugriff** auf häufige Aktionen
- **Benachrichtigungen** (Kommentare, System-Warnungen)

#### 2.2 Benutzeroberfläche
- **Responsive Design** (Desktop/Tablet/Mobile)
- **Dark/Light Mode**
- **Mehrsprachiges Interface** (DE, EN)
- **Accessibility** (WCAG 2.1 AA konform)
- **Tastatur-Shortcuts** für Power-User

### 3. Benutzermanagement

#### 3.1 Rollen & Rechte
- **Super Admin** - Voller Zugriff
- **Admin** - Alle Inhalte, Benutzer (außer Super Admin)
- **Editor** - Bearbeitung aller Beiträge
- **Autor** - Eigene Beiträge erstellen/bearbeiten
- **Contributor** - Entwürfe erstellen (benötigt Freigabe)
- **Subscriber** - Nur Lesen (für Member-Bereich)

#### 3.2 Authentifizierung
- **Login mit E-Mail/Passwort**
- **2FA (Two-Factor Authentication)** optional
- **OAuth-Integration** (Google, GitHub, etc.) optional
- **Passwort-Reset** via E-Mail
- **Session-Management** mit konfigurierbarer Timeout
- **Login-Versuche limitieren** (Brute-Force-Schutz)

#### 3.3 Benutzer-Features
- **Profil-Seiten** mit Avatar, Bio, Social Links
- **Aktivitäts-Log** (wer hat was wann geändert)
- **Bulk-Aktionen** (Benutzer aktivieren/deaktivieren)

### 4. API & Integration

#### 4.1 REST API - Vollständige CRUD-Operationen
```
# Beiträge
POST   /api/v1/posts              - Neuen Beitrag erstellen
GET    /api/v1/posts              - Beiträge abrufen (mit Pagination, Filter)
GET    /api/v1/posts/{id}         - Einzelnen Beitrag abrufen
PUT    /api/v1/posts/{id}         - Beitrag aktualisieren
PATCH  /api/v1/posts/{id}         - Beitrag teilweise aktualisieren
DELETE /api/v1/posts/{id}         - Beitrag löschen
POST   /api/v1/posts/bulk         - Mehrere Beiträge erstellen
DELETE /api/v1/posts/bulk         - Mehrere Beiträge löschen

# Medien - Upload, Bearbeiten, Löschen
POST   /api/v1/media              - Medien hochladen (Multipart oder Base64)
GET    /api/v1/media              - Medien abrufen
GET    /api/v1/media/{id}         - Einzelne Mediendatei abrufen
PUT    /api/v1/media/{id}         - Medien-Metadaten aktualisieren (Alt-Text, etc.)
DELETE /api/v1/media/{id}         - Medien löschen
POST   /api/v1/media/bulk-upload  - Mehrere Dateien hochladen

# Kategorien - Vollständige Verwaltung
GET    /api/v1/categories         - Kategorien abrufen
POST   /api/v1/categories         - Kategorie erstellen
PUT    /api/v1/categories/{id}    - Kategorie aktualisieren
DELETE /api/v1/categories/{id}    - Kategorie löschen

# Tags/Stichwörter - Vollständige Verwaltung
GET    /api/v1/tags               - Tags abrufen
POST   /api/v1/tags               - Tag erstellen
PUT    /api/v1/tags/{id}          - Tag aktualisieren
DELETE /api/v1/tags/{id}          - Tag löschen

# Gesicherte Downloads
POST   /api/v1/downloads          - Download-Datei hochladen
GET    /api/v1/downloads          - Downloads abrufen
DELETE /api/v1/downloads/{id}     - Download löschen
GET    /dl/{token}                - Geschützte Download-URL (Frontend)

# Authentifizierung
POST   /api/v1/auth/login         - Login
POST   /api/v1/auth/logout        - Logout
GET    /api/v1/auth/me            - Aktueller Benutzer
POST   /api/v1/auth/refresh       - Token erneuern
```

#### 4.2 API-Authentifizierung
- **JWT (JSON Web Tokens)** für API-Zugriff
- **API-Keys** für permanenten Zugriff (Webhooks, etc.)
- **Rate Limiting** (z.B. 100 Requests/Minute)
- **CORS-Konfiguration**

#### 4.3 Webhooks
- **Event-basierte Webhooks:**
  - `post.created`
  - `post.updated`
  - `post.published`
  - `post.deleted`
  - `comment.created`

#### 4.4 KI-Integration
- **API-Endpunkte für KI:**
  - Beitrag erstellen/aktualisieren via API
  - Medien hochladen via Base64 oder URL
  - Kategorien/Tags automatisch zuweisen
- **Bulk-Upload** für mehrere Beiträge
- **Markdown-Import** für KI-generierte Inhalte

### 12. Werbung & Monetarisierung

#### 12.1 Werbe-System
- **Ad-Zones** definierbar (Header, Sidebar, In-Content, Footer)
- **Ad-Manager** im Admin-Bereich:
  - HTML/JavaScript Code einfügen
  - Bilder hochladen für Banner
  - Rotation mehrerer Anzeigen
  - Zeitgesteuerte Kampagnen (Start/End-Datum)
- **Ad-Blocker Detection** (optional Warnung anzeigen)
- **Performance-Tracking:**
  - Impressions
  - Clicks
  - CTR (Click-Through-Rate)

#### 12.2 Externe Ad-Netzwerke
- **Google AdSense** Integration
- **Amazon Associates** Integration
- **Custom Ad-Networks** via Code-Snippet
- **A/B-Testing** für Anzeigen

#### 12.3 DSGVO-Konformität
- **Consent Mode** für Werbung (Cookie-Banner Integration)
- **Opt-Out Option** für personalisierte Werbung
- **Transparenz** über Werbepartner in Datenschutzerklärung

---

## 13. Suche & Navigation

#### 13.1 Eigene Suchfunktion
- **Volltext-Suche** in:
  - Beitragstitel
  - Beitragsinhalt
  - Kategorien
  - Tags
  - Autor-Namen
- **Such-Ranking:**
  - Titel-Treffer höher gewichtet
  - Neuere Beiträge bevorzugt
  - View-Count einbeziehen
- **Filter:**
  - Nach Kategorie
  - Nach Tag
  - Nach Datum (Bereich)
  - Nach Autor
- **Autocomplete/Suggest** während Eingabe
- **Such-Historie** speichern (Analytics)
- **Verwandte Suchen** anzeigen

#### 13.2 Erweiterte Suche (Optional)
- **Elasticsearch** oder **Meilisearch** Integration
- **Facettierte Suche** (Filter-Kombinationen)
- **Synonyme** definieren
- **Rechtschreibkorrektur** ("Meinten Sie...")

#### 13.3 Navigation
- **Breadcrumbs** automatisch
- **Kategorien-Navigation** (hierarchisch)
- **Tag-Cloud**
- **Verwandte Beiträge** (basierend auf Tags/Kategorien)
- **"Mehr vom selben Autor"**

---

## 14. Verzeichnis-Struktur & Organisation

#### 14.1 Projekt-Struktur (Laravel + React)
```
/cms-php/
├── /backend/                  # Laravel Backend
│   ├── /app/
│   │   ├── /Http/
│   │   │   ├── /Controllers/  # API Controller
│   │   │   │   ├── PostController.php
│   │   │   │   ├── MediaController.php
│   │   │   │   ├── AuthController.php
│   │   │   │   ├── CategoryController.php
│   │   │   │   ├── DownloadController.php
│   │   │   │   └── AdController.php
│   │   │   ├── /Middleware/   # Auth, CORS, etc.
│   │   │   └── /Requests/     # Form Requests
│   │   ├── /Models/           # Eloquent Models
│   │   │   ├── User.php
│   │   │   ├── Post.php
│   │   │   ├── Media.php
│   │   │   ├── Category.php
│   │   │   ├── Download.php
│   │   │   └── Advertisement.php
│   │   ├── /Services/         # Business-Logik
│   │   │   ├── AuthService.php
│   │   │   ├── PostService.php
│   │   │   ├── MediaService.php
│   │   │   ├── DownloadService.php
│   │   │   └── SearchService.php
│   │   └── /Providers/        # Service Providers
│   ├── /database/
│   │   ├── /migrations/       # Datenbank Migrationen
│   │   └── /seeders/          # Testdaten
│   ├── /routes/
│   │   ├── api.php            # API Routen
│   │   └── web.php            # Web Routen
│   ├── /config/               # Konfigurationsdateien
│   ├── /storage/              # File Storage
│   ├── composer.json
│   └── .env.example
├── /frontend/                 # React Frontend
│   ├── /src/
│   │   ├── /components/       # React Komponenten
│   │   │   ├── /common/
│   │   │   ├── /forms/
│   │   │   └── /layout/
│   │   ├── /pages/            # Seiten/Komponenten
│   │   │   ├── Dashboard.tsx
│   │   │   ├── Posts.tsx
│   │   │   ├── Media.tsx
│   │   │   └── Settings.tsx
│   │   ├── /hooks/            # Custom Hooks
│   │   │   ├── useAuth.ts
│   │   │   └── useApi.ts
│   │   ├── /services/         # API Services
│   │   │   ├── api.ts
│   │   │   ├── authService.ts
│   │   │   └── postService.ts
│   │   ├── /utils/            # Hilfsfunktionen
│   │   │   ├── constants.ts
│   │   │   └── helpers.ts
│   │   ├── /store/            # State Management
│   │   │   ├── authStore.ts
│   │   │   └── postStore.ts
│   │   ├── /types/            # TypeScript Types
│   │   └── App.tsx
│   ├── /public/
│   ├── package.json
│   ├── vite.config.ts
│   └── tsconfig.json
├── /docs/                     # Dokumentation
├── docker-compose.yml
├── .gitignore
└── README.md
```

#### 14.2 Storage-Organisation
```
/storage/
├── /media/
│   ├── /2026/
│   │   ├── /01/              # Jahr/Monat-basiert
│   │   │   ├── image1.jpg
│   │   │   └── image2.webp
│   └── /thumbnails/
│       └── /2026/01/
│           ├── image1_thumb.jpg
│           └── image1_medium.jpg
├── /downloads/                # Geschützte Dateien
│   ├── /pdf/
│   ├── /zip/
│   └── /docs/
└── /backups/
    ├── /daily/
    ├── /weekly/
    └── /monthly/
```

---

## 15. Gesicherte Downloads

#### 15.1 Download-Management
- **Upload geschützter Dateien:**
  - PDF, ZIP, DOC, XLS, etc.
  - Maximalgröße konfigurierbar (z.B. 100MB)
  - Virus-Scan beim Upload (ClamAV optional)
- **Zuordnung zu Beiträgen:**
  - Mehrere Downloads pro Beitrag
  - Download-Buttons im Editor einfügen
- **Zugriffskontrolle:**
  - Öffentlich (aber verlinkt)
  - Nur für registrierte Benutzer
  - Nur für bestimmte Rollen
  - Zeitlich begrenzt (Ablaufdatum)

#### 15.2 Temporäre Download-URLs
- **Token-basierte URLs:**
  ```
  https://saturn.blueml.eu/dl/{temporärer_token}
  ```
- **URL-Generierung:**
  - Token wird bei jedem Seitenaufruf NEU generiert
  - Token ist zeitlich begrenzt (z.B. 1 Stunde gültig)
  - Token ist einmalig verwendbar (nach Download ungültig)
  - Token gebunden an Session/IP (optional)
  
- **Implementierung:**
  ```python
  # Beispiel: Token-Generierung
  import secrets
  import hashlib
  from datetime import datetime, timedelta
  
  def generate_download_token(file_id, user_id=None):
      # Eindeutiger Token
      random_part = secrets.token_urlsafe(32)
      timestamp = datetime.now().timestamp()
      
      # Hash aus File-ID, User-ID, Timestamp
      token_data = f"{file_id}:{user_id}:{timestamp}:{random_part}"
      token = hashlib.sha256(token_data.encode()).hexdigest()
      
      # Token in DB speichern mit Ablaufzeit
      expires_at = datetime.now() + timedelta(hours=1)
      db.save_token(token, file_id, expires_at, used=False)
      
      return token
  
  # URL: https://saturn.blueml.eu/dl/{token}
  ```

- **Download-Tracking:**
  - Anzahl Downloads pro Datei
  - Download-Historie (wer, wann)
  - Bandwidth-Monitoring

#### 15.3 Sicherheit
- **Direkter Dateizugriff verhindert:**
  - Downloads NICHT im öffentlichen /public Ordner
  - Nginx/Apache sendet Dateien via X-Sendfile/X-Accel-Redirect
- **Hotlink-Schutz:**
  - Referrer-Check (nur von eigenem Blog)
  - Token-Validierung serverseitig
- **Rate-Limiting:**
  - Maximale Downloads pro IP/Stunde
  - Verhindert Massen-Downloads

#### 15.4 Artikel-Engagement
- **Download-Gating:**
  - "Um diese Datei herunterzuladen, lesen Sie bitte den Artikel"
  - Download-Button erscheint nach X Sekunden Lesezeit
  - Scroll-Tracking (Download erst nach 50% Scroll-Progress)
- **Conversion-Tracking:**
  - Download als Conversion zählen
  - "Leser, die heruntergeladen haben" vs. "Nur Leser"
  
#### 15.5 Admin-Features
- **Download-Verwaltung:**
  - Liste aller Download-Dateien
  - Zugriffs-Statistiken pro Datei
  - Dateien ersetzen (neue Version)
  - Dateien archivieren/löschen
- **Bulk-Upload:**
  - Mehrere Dateien gleichzeitig hochladen
  - ZIP-Archive automatisch entpacken

---

## 16. Kategorien & Stichwörter (Tags)

#### 16.1 Kategorien-System
- **Hierarchische Kategorien:**
  - Hauptkategorien
  - Unterkategorien (unbegrenzte Tiefe)
  - Beispiel: Technik > Smart Home > Home Assistant
- **Kategorie-Eigenschaften:**
  - Name & Slug (URL-freundlich)
  - Beschreibung (SEO)
  - Farbe (für visuelle Kennzeichnung)
  - Icon/Bild (optional)
  - Meta-Title & Meta-Description
- **Kategorie-Seiten:**
  - Übersichtsseite pro Kategorie
  - Beiträge paginiert
  - Unterkategorien anzeigen

#### 16.2 Tag-System (Stichwörter)
- **Flexible Tags:**
  - Beliebig viele Tags pro Beitrag
  - Auto-Suggest beim Eingeben (bestehende Tags)
  - Mehrsprachige Tags (DE/EN)
- **Tag-Eigenschaften:**
  - Name & Slug
  - Anzahl Verwendungen
  - Verwandte Tags
- **Tag-Seiten:**
  - Übersicht aller Beiträge mit diesem Tag
  - Tag-Cloud (Größe nach Häufigkeit)

#### 16.3 Verwaltung
- **Admin-Interface:**
  - Kategorien/Tags erstellen, bearbeiten, löschen
  - Zusammenführen (Merge) von duplizierten Tags
  - Umbenennen (automatisches Update aller Beiträge)
- **Bulk-Operationen:**
  - Tag zu mehreren Beiträgen hinzufügen
  - Kategorie für mehrere Beiträge ändern
- **SEO:**
  - Canonical URLs für Kategorie-/Tag-Seiten
  - Sitemap-Integration

---

## 17. Such-Optimierung

#### 5.1 SEO-Features
- **Meta-Tags** (Title, Description) pro Seite/Beitrag
- **Open Graph Tags** für Social Media
- **Twitter Cards**
- **Strukturierte Daten** (Schema.org/JSON-LD)
  - Article
  - BlogPosting
  - BreadcrumbList
  - Organization
- **XML-Sitemap** automatisch generiert
- **Robots.txt** Editor
- **Canonical URLs**
- **Alt-Tags** für Bilder (Pflichtfeld)
- **Sprechende URLs** (Slug-Optimierung)
- **301/302 Redirects** Management

#### 5.2 Performance
- **Page Caching** (Redis, Memcached, File-based)
- **Object Caching** für Datenbankabfragen
- **Image Lazy Loading**
- **CSS/JS Minification**
- **Gzip/Brotli Kompression**
- **HTTP/2 & HTTP/3** Support
- **CDN-Integration** (CloudFlare, BunnyCDN)

### 6. Statistiken & Analytics

#### 6.1 Eigene Statistiken
- **Seitenaufrufe:**
  - Pro Beitrag
  - Pro Tag/Woche/Monat
  - Gesamt-Traffic
- **Besucherquellen:**
  - Direct
  - Referral
  - Search Engines
  - Social Media
- **Beliebte Beiträge** (Top 10)
- **Browser/Geräte-Statistik**
- **Geografische Verteilung** (Länder)
- **CSV/Excel Export** der Statistiken

#### 6.2 Externe Analytics (Optional)
- **Google Analytics 4** Integration
- **Matomo (Piwik)** Integration
- **Plausible Analytics** Integration

#### 6.3 Datenschutz-Konformität
- **Cookie-freies Tracking** Option
- **IP-Anonymisierung**
- **Opt-Out Mechanismus**
- **Daten-Retention** konfigurierbar (DSGVO)

### 7. Sicherheit

#### 7.1 API-Sicherheit
- **Authentifizierung:**
  - JWT (JSON Web Tokens) mit Ablaufzeit (z.B. 1 Stunde)
  - Refresh-Tokens für längere Sessions (z.B. 30 Tage)
  - API-Keys für permanente Integration (Webhooks, Cron-Jobs)
  - OAuth 2.0 für Third-Party Apps (optional)
  
- **Autorisierung:**
  - Rollenbasierte Zugriffskontrolle (RBAC)
  - Permission-Checks pro Endpoint
  - Owner-Checks (User kann nur eigene Beiträge bearbeiten/löschen)
  
- **Rate Limiting:**
  - **Gesamt:** 1000 Requests/Stunde pro IP
  - **Login:** 5 Versuche/Minute
  - **Upload:** 50 Uploads/Stunde
  - **Download:** 100 Downloads/Stunde
  - **Burst-Limit:** Kurzzeitig 10 Requests/Sekunde
  
- **Input-Validierung:**
  - Schema-Validierung (JSON Schema, Pydantic)
  - File-Type Whitelisting (nur erlaubte Dateitypen)
  - File-Size Limits
  - Content-Type Validation
  - Filename Sanitization (keine Pfad-Traversal)
  
- **Output-Sanitization:**
  - HTML-Escaping für User-Input
  - Markdown-Rendering mit XSS-Schutz
  - JSON-Response Validation

#### 7.2 Upload-Sicherheit
- **Datei-Validierung:**
  - MIME-Type Check (nicht nur Extension)
  - Magic-Byte Validation (echte Datei-Signatur)
  - Bilddaten neu-rendern (ImageMagick/Pillow)
  - PDF-Sanitization (entfernt JavaScript)
  
- **Virus-Scanning:**
  - ClamAV Integration für alle Uploads
  - Quarantäne verdächtiger Dateien
  - Admin-Benachrichtigung bei Malware
  
- **Storage-Isolation:**
  - Uploads außerhalb von Document-Root
  - Separate Domains für User-Content (z.B. cdn.blueml.eu)
  - Content-Disposition Header für Downloads
  - X-Content-Type-Options: nosniff
  
- **Dateinamen-Sicherheit:**
  - Zufällige UUIDs statt Original-Dateinamen
  - Original-Name nur in Datenbank gespeichert
  - Keine ausführbaren Dateien (.exe, .sh, .php)

#### 7.3 Download-Sicherheit
- **Token-Validierung:**
  - Kryptographisch sichere Tokens (secrets.token_urlsafe)
  - Einmal-Verwendung (Token nach Download löschen)
  - Zeitliche Begrenzung (z.B. 1 Stunde)
  - IP-Binding (optional: Token nur für ursprüngliche IP)
  
- **Access-Control:**
  - Rolle/Permission Check vor Download
  - Login-Requirement für geschützte Dateien
  - Session-Validation
  
- **Abuse-Prevention:**
  - Download-Counter pro IP
  - CAPTCHA bei vielen Downloads (optional)
  - Bandwidth-Throttling für einzelne IPs

#### 7.4 Absicherung
- **SQL-Injection Schutz** (Prepared Statements/ORM)
- **XSS-Schutz** (Input Sanitization, Output Escaping)
- **CSRF-Schutz** (Token-basiert für alle POST/PUT/DELETE)
- **Content Security Policy (CSP)** Header
- **Clickjacking-Schutz** (X-Frame-Options: DENY)
- **MIME-Sniffing-Schutz** (X-Content-Type-Options: nosniff)
- **Strict-Transport-Security** (HSTS)
- **Referrer-Policy** (no-referrer-when-downgrade)

#### 7.5 API-Logging & Monitoring
- **Request-Logging:**
  - IP-Adresse (anonymisiert nach 7 Tagen)
  - Endpoint & HTTP-Method
  - Response-Status
  - Response-Zeit
  - User-Agent
  
- **Security-Events:**
  - Fehlgeschlagene Login-Versuche
  - Ungültige Tokens
  - Rate-Limit Überschreitungen
  - Verdächtige Upload-Versuche
  
- **Alerting:**
  - E-Mail bei >10 Login-Fehlversuchen/Minute
  - E-Mail bei Malware-Funden
  - Slack/Discord Webhook für kritische Events
- **SQL-Injection Schutz** (Prepared Statements)
- **XSS-Schutz** (Input Sanitization, Output Escaping)
- **CSRF-Schutz** (Token-basiert)
- **Content Security Policy (CSP)** Header
- **Rate Limiting** für Login/API
- **Brute-Force Schutz** (Account-Lock nach X Fehlversuchen)
- **Session Hijacking Schutz**
- **File Upload Validierung** (MIME-Type, Dateiendung, Größe)

#### 7.2 Verschlüsselung
- **HTTPS erzwingen** (HSTS)
- **Passwörter** mit bcrypt/Argon2 gehasht
- **Sensitive Daten** verschlüsselt in DB (API-Keys, etc.)

#### 7.3 Backup & Recovery
- **Automatische Backups:**
  - Datenbank (täglich)
  - Dateien/Medien (täglich)
  - Konfiguration
- **Backup-Rotation** (7 täglich, 4 wöchentlich, 12 monatlich)
- **Restore-Funktion** im Admin-Bereich
- **Backup-Speicherorte:**
  - Lokal
  - S3-kompatibel (AWS, MinIO, etc.)
  - FTP/SFTP
- **Backup-Verschlüsselung** optional

#### 7.4 Sicherheits-Monitoring
- **Login-Logs** (erfolgreiche/fehlgeschlagene Versuche)
- **Änderungs-Logs** (Audit Trail)
- **File Integrity Monitoring** (Hash-Checks kritischer Dateien)
- **Security Notifications** bei verdächtigen Aktivitäten

### 8. Rechtliche Anforderungen (DSGVO)

#### 8.1 Cookie-Banner
- **Opt-In/Opt-Out Mechanismus**
- **Kategorisierung:**
  - Notwendige Cookies (immer aktiv)
  - Funktionale Cookies (optional)
  - Analyse Cookies (optional)
  - Marketing Cookies (optional)
- **Cookie-Einstellungen** jederzeit änderbar
- **Cookie-Liste** (Name, Zweck, Laufzeit)
- **Design anpassbar** (Farben, Position, Texte)

#### 8.2 Pflichtseiten
- **Impressum:**
  - Template mit allen gesetzlich erforderlichen Feldern (TMG/RStV)
  - Anbieterkennzeichnung
  - Kontaktdaten
- **Datenschutzerklärung:**
  - Template nach DSGVO
  - Automatische Abschnitte für verwendete Dienste (Analytics, etc.)
  - Kontaktdaten Datenschutzbeauftragter
  - Betroffenenrechte (Auskunft, Löschung, etc.)

#### 8.3 Datenverarbeitung
- **Einwilligungs-Management** für Newsletter, Kommentare
- **Daten-Export** (Benutzer kann eigene Daten exportieren)
- **Daten-Löschung** (DSGVO Artikel 17)
- **Verarbeitungsverzeichnis** (für Admin)

### 9. Geo-Blocking & Zugriffskontrolle

#### 9.1 Geo-Blocking
- **IP-basiertes Blocking** von Ländern/Regionen
- **Whitelist/Blacklist** für IP-Adressen
- **Anzeige-Nachricht** für geblockte Besucher
- **GeoIP-Datenbank** (MaxMind GeoLite2 oder IP2Location)

#### 9.2 Zugriffskontrolle
- **Passwort-geschützte Beiträge/Seiten**
- **Member-Only Bereich**
- **IP-Whitelist** für Admin-Bereich (optional)

### 10. CrowdSec-Integration

#### 10.1 CrowdSec-Kompatibilität
- **Bouncer-Integration** (PHP, Nginx)
- **Log-Sharing** mit CrowdSec
- **Automatisches IP-Blocking** bei verdächtigen Aktivitäten
- **Scenarios** für:
  - Login-Brute-Force
  - Spam-Comments
  - Scraping-Versuche
  - SQL-Injection Versuche

### 11. Mehrsprachigkeit (i18n)

#### 11.1 Frontend
- **Mehrsprachige Beiträge/Seiten**
- **Language Switcher**
- **Automatische URL-Struktur** (`/de/beitrag`, `/en/post`)
- **hreflang-Tags** für SEO

#### 11.2 Backend
- **Admin-Interface** in DE/EN
- **Zusätzliche Sprachen** einfach hinzufügbar (Sprachdateien)

---

## 🔧 Technische Anforderungen

### 1. Tech-Stack (Empfohlen)

#### Backend
- **Sprache:** PHP (Laravel 11+)
- **Datenbank:** 
  - PostgreSQL (empfohlen) ODER MySQL 8+
  - Redis für Caching & Sessions
- **Datei-Storage:** Lokal ODER S3-kompatibel
- **Task Queue:** Laravel Queue mit Redis/Database Driver

#### Frontend (Admin)
- **Framework:** React 18 mit TypeScript
- **UI-Library:** Ant Design, Material-UI ODER Tailwind CSS
- **Build-Tool:** Vite
- **State Management:** Zustand oder Redux Toolkit

#### Frontend (Blog)
- **SSR/SSG:** Optional (Next.js 14)
- **Theme-System:** Blade Templates mit React Components

### 2. Datenbank-Schema

#### Haupttabellen
```sql
users
  - id (Primary Key)
  - email (Unique)
  - password_hash
  - role_id (Foreign Key -> roles)
  - display_name
  - avatar_url
  - bio
  - created_at
  - updated_at
  - last_login_at
  - is_active

roles
  - id (Primary Key)
  - name (Unique: admin, editor, author, etc.)
  - permissions (JSON)

posts
  - id (Primary Key)
  - title
  - slug (Unique)
  - content (Text/Markdown)
  - excerpt
  - featured_image_id (Foreign Key -> media)
  - author_id (Foreign Key -> users)
  - status (draft, scheduled, published, archived)
  - published_at
  - created_at
  - updated_at
  - view_count
  - meta_title
  - meta_description

categories
  - id (Primary Key)
  - name
  - slug (Unique)
  - description
  - parent_id (Self-referencing for hierarchical categories)
  - color (hex color code)
  - icon_url
  - meta_title
  - meta_description

tags
  - id (Primary Key)
  - name
  - slug (Unique)
  - usage_count (auto-calculated)

post_categories (Many-to-Many)
  - post_id
  - category_id

post_tags (Many-to-Many)
  - post_id
  - tag_id

media
  - id (Primary Key)
  - filename
  - original_filename
  - filepath
  - mime_type
  - filesize
  - width
  - height
  - alt_text
  - uploaded_by (Foreign Key -> users)
  - created_at

downloads
  - id (Primary Key)
  - filename
  - original_filename
  - filepath
  - mime_type
  - filesize
  - description
  - access_level (public, registered, role-specific)
  - download_count
  - uploaded_by (Foreign Key -> users)
  - created_at
  - expires_at (Nullable)

download_tokens
  - id (Primary Key)
  - token (Unique, Indexed)
  - download_id (Foreign Key -> downloads)
  - user_id (Foreign Key -> users) (Nullable)
  - ip_address (hashed)
  - created_at
  - expires_at
  - used_at (Nullable)
  - is_valid (Boolean)

post_downloads (Many-to-Many)
  - post_id
  - download_id
  - display_order

advertisements
  - id (Primary Key)
  - name
  - zone (header, sidebar, footer, in-content)
  - ad_type (html, image, script)
  - content (HTML/JS code)
  - image_url
  - link_url
  - impressions (counter)
  - clicks (counter)
  - start_date
  - end_date
  - is_active
  - created_at

pages
  - id (Primary Key)
  - title
  - slug (Unique)
  - content
  - template
  - is_visible
  - meta_title
  - meta_description
  - created_at
  - updated_at

analytics_pageviews
  - id (Primary Key)
  - post_id (Foreign Key -> posts) (Nullable for pages)
  - page_id (Foreign Key -> pages) (Nullable)
  - visitor_ip (Anonymized/Hashed)
  - referrer
  - user_agent
  - country_code
  - device_type (desktop, mobile, tablet)
  - viewed_at

analytics_downloads
  - id (Primary Key)
  - download_id (Foreign Key -> downloads)
  - token_id (Foreign Key -> download_tokens)
  - visitor_ip (Anonymized/Hashed)
  - user_agent
  - downloaded_at

search_queries
  - id (Primary Key)
  - query_text
  - results_count
  - clicked_result_id (Foreign Key -> posts) (Nullable)
  - visitor_ip (Anonymized/Hashed)
  - searched_at

comments (Optional)
  - id (Primary Key)
  - post_id (Foreign Key -> posts)
  - author_name
  - author_email
  - content
  - status (pending, approved, spam)
  - created_at

settings
  - id (Primary Key)
  - key (Unique)
  - value (JSON)
  - type (string, boolean, integer, json)

backups
  - id (Primary Key)
  - filename
  - filepath
  - type (database, files, full)
  - size
  - created_at
  - expires_at

api_logs
  - id (Primary Key)
  - user_id (Foreign Key -> users) (Nullable)
  - endpoint
  - method (GET, POST, PUT, DELETE)
  - status_code
  - response_time_ms
  - ip_address (anonymized)
  - user_agent
  - created_at

security_events
  - id (Primary Key)
  - event_type (failed_login, invalid_token, malware_upload, etc.)
  - severity (low, medium, high, critical)
  - ip_address
  - user_id (Foreign Key -> users) (Nullable)
  - details (JSON)
  - created_at
```

### 3. Systemanforderungen

#### Minimum
- **CPU:** 2 Cores
- **RAM:** 2 GB
- **Storage:** 20 GB SSD
- **PHP:** 8.2+ ODER Python 3.11+
- **Datenbank:** PostgreSQL 14+ / MySQL 8+
- **Webserver:** Nginx 1.24+ / Apache 2.4+

#### Empfohlen
- **CPU:** 4+ Cores
- **RAM:** 4+ GB
- **Storage:** 50+ GB SSD
- **Redis:** 7.0+
- **SSL:** Let's Encrypt / Certbot

### 4. Installation & Deployment

#### Installation
```bash
# 1. Repository klonen
git clone https://github.com/deinrepo/blog-cms.git
cd blog-cms

# 2. Backend Dependencies installieren
cd backend
composer install

# 3. Frontend Dependencies installieren
cd ../frontend
npm install

# 4. Umgebungsvariablen konfigurieren
cd ../backend
cp .env.example .env
nano .env

# 5. Datenbank-Migration
php artisan migrate

# 6. Admin-User erstellen
php artisan db:seed --class=AdminSeeder

# 7. Entwicklungsserver starten
# Backend:
php artisan serve

# Frontend (neues Terminal):
cd frontend
npm run dev

# 8. Produktions-Build (optional)
cd frontend
npm run build
```

#### Docker-Support
```yaml
# docker-compose.yml bereitstellen
services:
  app:
    image: blog-cms:latest
    ports:
      - "80:80"
    environment:
      - DATABASE_URL=postgresql://user:pass@db:5432/blogcms
      - REDIS_URL=redis://redis:6379
    depends_on:
      - db
      - redis
  
  db:
    image: postgres:16-alpine
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7-alpine
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 5. Konfiguration

#### .env Beispiel
```env
# App
APP_NAME="Mein Blog"
APP_ENV=production
APP_DEBUG=false
APP_URL=https://saturn.blueml.eu

# Database
DATABASE_URL=postgresql://user:password@localhost:5432/blogcms

# Redis
REDIS_URL=redis://localhost:6379/0

# Mail
MAIL_HOST=mail.blueml.eu
MAIL_PORT=587
MAIL_USERNAME=blog@blueml.eu
MAIL_PASSWORD=secret
MAIL_FROM_ADDRESS=noreply@blueml.eu

# Storage
STORAGE_DRIVER=local  # oder s3
# S3 Credentials (optional)
S3_KEY=
S3_SECRET=
S3_REGION=
S3_BUCKET=

# Security
SESSION_LIFETIME=120
JWT_SECRET=generiere-einen-sicheren-key

# Analytics
ENABLE_ANALYTICS=true
ANALYTICS_IP_ANONYMIZE=true

# GeoIP
GEOIP_DATABASE_PATH=/path/to/GeoLite2-Country.mmdb

# CrowdSec
CROWDSEC_ENABLED=true
CROWDSEC_API_URL=http://localhost:8080
CROWDSEC_API_KEY=your-bouncer-key
```

---

## 📊 Zusätzliche Features (Nice-to-Have)

### 1. Newsletter-System
- **E-Mail-Liste** Management
- **Newsletter-Templates**
- **Automatischer Versand** bei neuem Beitrag
- **Double-Opt-In**
- **Unsubscribe-Link**

### 2. Kommentar-System
- **Kommentare** pro Beitrag
- **Spam-Schutz** (Akismet, reCAPTCHA)
- **Moderation** (Auto-Approve, Manual)
- **Antworten** auf Kommentare (Threading)

### 3. Social-Media Integration
- **Auto-Post** zu Twitter/X, Facebook, LinkedIn
- **Social Sharing Buttons**
- **Open Graph Preview**

### 4. E-Commerce (für Premium-Content)
- **Paywall** für einzelne Beiträge
- **Mitgliedschaften** (Stripe, PayPal)
- **Download-Produkte**

### 5. Erweiterte Suche
- **Volltext-Suche** (Elasticsearch, Meilisearch)
- **Filter** nach Kategorie, Tag, Datum
- **Autocomplete**

### 6. Multi-Tenant
- **Mehrere Blogs** auf einer Installation
- **Separate Datenbanken** oder Tenant-Spalte
- **Domain-Mapping**

---

## 18. Architektur-Schwerpunkte (Strategische Ausrichtung)

Diese Punkte definieren die langfristige technische Strategie:

- **RBAC/Permissions:** Rollen & Rechte pro Content-Typ, optional bis auf Feldebene erweiterbar.
- **Versioning/Revisions:** Volle Historie (Entwurf/Publiziert) mit Rollback-Funktion.
- **Content-Modell:** Balance zwischen starrem Schema und flexiblen "Collections" mit Custom Fields/Blocks.
- **Media/Assets:** Uploads, abstrakter Storage (wie S3), Thumbnails, Zugriffskontrolle.
- **Search:** PostgreSQL Full Text Search reicht initial, Architektur offen für Elastic/Meilisearch halten.
- **Audit-Log:** Lückenlose Nachvollziehbarkeit (wer hat was wann geändert).
- **Migrations/Schema-Change Strategie:** Robuste Migrations-Pipeline, da sich das CMS stetig weiterentwickelt.

---

## 📦 Lieferumfang

### Dokumentation
1. **README.md** - Installation & Schnellstart
2. **API-Dokumentation** (OpenAPI/Swagger)
3. **Admin-Handbuch** (Benutzer-Guide)
4. **Entwickler-Dokumentation** (Architektur, Code-Standards)
5. **Deployment-Guide** (Nginx, Docker, Systemd)

### Code-Qualität
- **Unit Tests** (>80% Code Coverage)
- **Integration Tests** für API
- **E2E Tests** für kritische User-Flows
- **Linting** (ESLint, Pylint, PHPStan)
- **Code-Formatter** (Prettier, Black, PHP-CS-Fixer)

### Lizenz
- **Open Source** (MIT, GPL-3.0, Apache 2.0)
- **Copyright-Header** in allen Dateien

---

## 🚀 Roadmap (Post-Launch)

### Phase 1 (Monate 1-3)
- Core CMS-Funktionen
- Admin-Interface
- Basic SEO
- DSGVO-Compliance

### Phase 2 (Monate 4-6)
- API-Endpunkte
- Statistiken
- Backup/Restore
- Performance-Optimierungen

### Phase 3 (Monate 7-9)
- Newsletter
- Kommentare
- Social Integration
- Mehrsprachigkeit

### Phase 4 (Monate 10-12)
- E-Commerce (optional)
- Multi-Tenant (optional)
- Mobile App (optional)

---

## 🤖 KI-Freundlichkeit

### Für Entwickler-KIs
- **Klare Code-Struktur** (MVC, Clean Architecture)
- **Umfassende Docstrings/Comments**
- **Type Hints** (Python) / Type Declarations (PHP)
- **API-First Design** (REST + optional GraphQL)

### Für Content-KIs
- **API-Zugriff** mit JWT
- **Bulk-Operations** für mehrere Beiträge
- **Markdown-Support**
- **Medien-Upload** via Base64 oder URL
- **Auto-Tagging** basierend auf Content

---

## ✅ Checkliste vor Launch

### Sicherheit
- [ ] Alle DSGVO-Anforderungen erfüllt
- [ ] SSL-Zertifikat installiert & HSTS aktiviert
- [ ] API-Rate-Limiting konfiguriert
- [ ] Upload-Validierung getestet (MIME-Type, Size, Malware)
- [ ] Download-Tokens funktionieren & ablaufen korrekt
- [ ] CSRF-Schutz aktiviert
- [ ] CSP-Header konfiguriert
- [ ] Security-Scan durchgeführt (OWASP ZAP)
- [ ] Penetration-Test durchgeführt

### Funktionalität
- [ ] API: Upload, Bearbeiten, Löschen getestet
- [ ] Download-URLs werden bei jedem Aufruf neu generiert
- [ ] Kategorien & Tags funktionieren
- [ ] Suche liefert relevante Ergebnisse
- [ ] Werbezonen werden korrekt angezeigt
- [ ] Cookie-Banner getestet (Opt-in/Opt-out)
- [ ] Backups konfiguriert & getestet
- [ ] Restore-Funktion getestet

### Performance & SEO
- [ ] Performance-Tests durchgeführt (Lighthouse >90)
- [ ] Sitemap generiert & erreichbar
- [ ] SEO-Meta-Tags für alle Seiten
- [ ] Robots.txt konfiguriert
- [ ] Caching aktiviert (Redis/Memcached)
- [ ] Bilder komprimiert & lazy-loading aktiviert

### Rechtliches
- [ ] Impressum ausgefüllt
- [ ] Datenschutzerklärung ausgefüllt
- [ ] Cookie-Liste vollständig
- [ ] DSGVO-Datenexport funktioniert
- [ ] DSGVO-Datenlöschung funktioniert

### Monitoring
- [ ] Analytics konfiguriert & DSGVO-konform
- [ ] Download-Tracking funktioniert
- [ ] Such-Analytics aufzeichnen
- [ ] E-Mail-Versand getestet
- [ ] Monitoring eingerichtet (Uptime, Errors)
- [ ] Security-Events werden geloggt

### Dokumentation
- [ ] API-Dokumentation vollständig (Swagger/OpenAPI)
- [ ] Admin-Handbuch geschrieben
- [ ] Entwickler-Dokumentation vorhanden
- [ ] Deployment-Guide erstellt

---

## 📞 Support & Updates

### Community
- GitHub Issues für Bug-Reports
- Discussions für Feature-Requests
- Discord/Slack für schnelle Hilfe

### Updates
- **Security-Updates:** Sofort
- **Feature-Updates:** Monatlich
- **Major-Versions:** Jährlich

---

## 📝 Fazit

Diese Spezifikation deckt alle wesentlichen Anforderungen für eine moderne, rechtssichere und performante Blog/CMS-Software ab. Sie ist sowohl für manuelle Entwicklung als auch für KI-gestützte Code-Generierung optimiert.

**Kern-Features:**
- ✅ **DSGVO-konform** (Cookie-Banner, Datenschutz, Impressum)
- ✅ **SEO-optimiert** (Meta-Tags, Sitemap, Schema.org)
- ✅ **API-First** für KI-Integration (Upload, Edit, Delete)
- ✅ **Sicher** (JWT, Rate-Limiting, Upload-Validierung, XSS/CSRF-Schutz)
- ✅ **Performant** (Caching, CDN, Image-Optimization)
- ✅ **Erweiterbar** (Plugin/Theme-System)
- ✅ **Wartbar** (Clean Code, Tests, Documentation)

**Besondere Highlights:**
- 🔐 **Gesicherte Downloads** mit temporären, einmaligen URLs
- 🎯 **Werbung/Monetarisierung** mit Ad-Manager
- 🔍 **Eigene Suchfunktion** mit Filtern & Autocomplete
- 📁 **Kategorien & Tags** mit hierarchischer Struktur
- 📊 **Umfassende Analytics** (Pageviews, Downloads, Suchen)
- 🤖 **KI-freundlich** mit vollständiger REST API
- 🌍 **Geo-Blocking** & CrowdSec-Integration
- 🔄 **Backup & Restore** automatisiert

**Technische Stärken:**
- Moderne Tech-Stack Optionen (Python/PHP)
- Saubere Verzeichnis-Struktur
- Vollständiges Datenbank-Schema
- Docker-ready
- Open Source ready

**Sicherheits-Features:**
- Token-basierte Downloads (1 Stunde gültig, einmalig)
- Virus-Scanning bei Uploads (ClamAV)
- API-Rate-Limiting
- Security-Event-Logging
- CSRF/XSS/SQL-Injection Schutz

Diese Requirements können 1:1 an Entwickler ODER KI-Assistenten gegeben werden, um eine produktionsreife Blog/CMS-Software zu entwickeln.

---

**Lizenz:** MIT / Apache 2.0 / GPL-3.0 (nach Wahl)  
**Autor:** Basti  
**Kontakt:** blog@blueml.eu  
**Version:** 2.0 (erweitert mit Ads, Search, Downloads, Security)
