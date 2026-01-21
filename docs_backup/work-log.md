# Arbeitslog & Kommentare

Dieses Dokument kommentiert den aktuellen Arbeitsstand, damit das Team nahtlos weiter
arbeiten kann.

## 2026-01-18 — Initialer Startpunkt

### Was bereits erledigt wurde
- **Ordnerstruktur angelegt**: Es existieren Platzhalter-Ordner für `app/`, `admin/`,
  `public/`, `storage/`, `database/`, `tests/`, `docs/`. Diese folgen dem Vorschlag
  aus den Requirements. Dadurch kann jeder sofort strukturierter weiterarbeiten.
- **README erstellt**: Enthält Ziel, Stand und nächste Schritte.

### Zusätzlich umgesetzt
- **FastAPI-Minimalskelett** angelegt (`app/`):
  - `app/main.py` enthält die zentrale App + Health-Endpoint.
  - `app/api/v1/routes/health.py` als Beispiel-Route.
  - `app/api/v1/routes/posts.py` als erster Stub für Posts.
  - `app/api/v1/routes/categories.py` als Stub für Kategorien.
  - `app/api/v1/routes/tags.py` als Stub für Tags.
  - `app/api/v1/routes/users.py` als Stub für Benutzer.
  - `app/api/v1/schemas/post.py` mit Pydantic-Schemas.
  - `app/api/v1/schemas/category.py` mit Pydantic-Schemas.
  - `app/api/v1/schemas/tag.py` mit Pydantic-Schemas.
  - `app/api/v1/schemas/user.py` mit Pydantic-Schemas.
  - `app/services/post_service.py` als In-Memory-Placeholder.
  - `app/services/category_service.py` als In-Memory-Placeholder.
  - `app/services/tag_service.py` als In-Memory-Placeholder.
  - `app/services/user_service.py` als In-Memory-Placeholder.
  - `app/core/settings.py` mit einfacher Settings-Struktur.
  - `requirements.txt` mit den minimalen Abhängigkeiten.

### Warum diese Entscheidung (noch reversibel)
- Die Requirements erlauben Python oder PHP. Der FastAPI-Startpunkt ist bewusst klein,
  sodass ein Wechsel zu Laravel o.ä. weiterhin leicht möglich bleibt.

### Ergänzung (Startpunkt für API-Iteration)
- `GET /api/v1/posts` liefert aktuell die In-Memory-Liste (mit `offset`/`limit`).
  Das macht das Routing und
  die API-Struktur früh sichtbar. Persistenz folgt später.
- `POST /api/v1/posts` akzeptiert einen Payload und speichert temporär im Speicher,
  damit man den End-to-End-Flow bis zur DB-Implementierung testen kann.
- `GET/PUT/DELETE /api/v1/posts/{id}` sind ebenfalls als In-Memory-Operationen verfügbar,
  um den vollständigen CRUD-Flow zu testen.
- `GET/POST/PUT/DELETE /api/v1/categories` bzw. `/api/v1/categories/{id}` spiegeln den
  gleichen CRUD-Flow für Kategorien.
- `GET/POST/PUT/DELETE /api/v1/tags` bzw. `/api/v1/tags/{id}` spiegeln den gleichen
  CRUD-Flow für Tags.
- `GET/POST/PUT/DELETE /api/v1/users` bzw. `/api/v1/users/{id}` spiegeln den gleichen
  CRUD-Flow für Benutzer.

### Warum das sinnvoll ist
- Die Requirements sind extrem umfangreich. Ein strukturierter Einstieg reduziert
  spätere Reibungsverluste (Namenskonventionen, Modulaufteilung, Build-Setup).
- Durch leere Platzhalter-Ordner ist klar, **wo** die jeweiligen Bestandteile später
  landen sollen (API, Admin-Frontend, Storage, Tests).

### Offene Entscheidungen (bitte zuerst klären)
1. **Backend-Stack:** Python (FastAPI) oder PHP (Laravel)?
   - **Entscheidung:** **Python (FastAPI)**.
   - Beeinflusst Ordneraufbau, Test-Setup, Deployment.
2. **Admin-Frontend:** Vue 3 oder React?
   - **Entscheidung:** **Vue.js 3**.
   - Beeinflusst Komponenten-Architektur und State-Management.
3. **Datenbank:** PostgreSQL oder MySQL?
   - **Entscheidung:** **PostgreSQL**.
   - Beeinflusst Migrations-Tools und SQL-Features.

### Konkrete nächste Arbeitsaufgaben (empfohlene Reihenfolge)
1. **Tech-Stack fixieren** und in `README.md` dokumentieren. (Erledigt)
2. **API-Skelett** (auth, posts) mit Grundrouting anlegen. (Erledigt)
3. **DB-Migrationen** für die Kern-Tabellen (users, roles, posts, media). (Erledigt)
4. **Admin-Login-Flow** (UI + API) als erster End-to-End-Flow. (Erledigt)

### 2026-01-19 — Admin Frontend & Media Backend
- **Admin Frontend (Vue 3)**:
  - Initiale Struktur mit Vite, Pinia, Router, TailwindCSS.
  - Authentication (Login, JWT Storage, Axios Interceptor).
  - Posts Management (List, Edit/Create mit Categories/Tags).
  - Categories Management (List, Edit/Create).
  - Tags Management (List, Edit/Create).
- **Backend**:
  - `media` Modul implementiert (Model, Schema, Service, Route).
  - Datenbank-Migration für `media` Tabelle erstellt.
  - Admin-Forms erweitert (Multi-Select für Tags/Categories).

### 2026-01-19 — Admin UI Enhancements
- **Rich Text Editor:** Integration von TinyMCE in den Admin-Bereich für das Schreiben von Beiträgen (ersetzt einfache Textarea).

### 2026-01-19 — Public Frontend
- **Nuxt 3 Setup:** Initialisierung des Public Frontends in `public/`.
- **Styling:** TailwindCSS Integration.
- **Routing & API:** Grundlegende API-Integration zum Abrufen von Posts (`/api/v1/posts`).
- **Pages:**
  - Home (Post-Liste mit Suche)
  - Detail-Ansicht (`/posts/[id]`)
  - Kategorie-Archiv (`/categories/[id]`)
  - Tag-Archiv (`/tags/[id]`)

### 2026-01-19 — Backend Improvements & Testing
- **Slug Support**:
  - Backend API (`GET /posts/{id}`) supports string slugs.
  - `PostService` generates slugs from titles.
  - Frontend (`posts/[id].vue`) updated to use slug-aware API calls.
- **Frontend Fixes**:
  - Removed incorrect `useAsyncData` double-wrapping in Nuxt pages to fix hydration errors.
  - Fixed `public/app.vue` to render `NuxtPage` correctly (removed default Welcome).
- **Testing**:
  - Added backend test suite with `pytest`, `httpx`, `pytest-asyncio`.
  - Configured in-memory SQLite for async tests.
  - Added tests for Posts CRUD, Media Upload, and Post-Media relationships.
- **Bug Fixes**:
  - Fixed SQLAlchemy `MissingGreenlet` errors with async relationships.
  - Fixed Model Registry to include `Media`.

### 2026-01-19 — Feature Implementation Sprint
- **Comments System**:
  - Backend: `Comment` model, service, routes (public/admin), and tests.
  - Frontend Public: Comment list and submission form on Post detail page.
  - Frontend Admin: `CommentListView` for moderation (Approve/Spam/Delete).
- **Secure Downloads**:
  - Backend: `Download` model, secure storage path (outside public), token-based access (`DownloadToken`).
  - Frontend Admin: `DownloadListView` for uploading/managing files.
  - Integration: Attached downloads to posts (Many-to-Many).
  - Public Flow: Users can request a temporary token to download files attached to posts.
- **Advertisement System**:
  - Backend: `Advertisement` model (Zones: header, sidebar, etc.), service, and routes.
  - Frontend Admin: `AdListView` and `AdEditView` to manage ads.
- **Static Pages**:
  - Backend: `Page` model (Slug, Content, SEO fields).
  - Frontend Admin: Page management UI.
  - Frontend Public: Dynamic routing for pages (`/pages/:slug`).
- **Analytics**:
  - Backend: `PageView` model with IP anonymization.
  - Frontend: Automatic route tracking via Nuxt plugin.
  - Dashboard: Admin Dashboard now visualizes traffic using `chart.js`.
- **SEO**:
  - Automated `sitemap.xml` and `rss.xml` generation.
  - `robots.txt` endpoint.
- **Settings & Cookie Consent**:
  - Backend: `Setting` model (key/value) for arbitrary config.
  - Admin: Settings view to toggle Cookie Banner and set text.
  - Public: `CookieBanner` component showing/hiding based on settings and user consent.
  - Analytics integration: Tracking disabled until consent is given.

### 2026-01-20 — Newsletter & Advanced Search
- **Newsletter System**:
  - Backend: `Subscriber` and `Newsletter` models, service, and API routes.
  - Public Frontend: `NewsletterForm` component and `confirm.vue` page for email verification.
  - Admin Frontend: Subscriber list and Newsletter sending interface.
  - Mock Email: Emails are currently logged to console (with links pointing to frontend).
- **Extended Search**:
  - Backend: Enhanced `PostService` to support:
    - Date range filtering (`start_date`, `end_date`).
    - Searching within Comments content.
    - Searching by Author, Category, and Tag names via `ILIKE`.
  - Frontend: Added `search.vue` page for advanced filtering options.
  - Updates: Updated `useApi` composable to support new query parameters.
- **Testing & Stability**:
  - Fixed dependency issues (`httpx`, `pytest-asyncio`, `python-multipart`, `bcrypt`, `passlib`, `python-jose`).
  - Added `tests/test_posts_search.py` to verify enhanced search capabilities.
  - Verified Admin Router configuration for newsletter views.

### 2026-01-20 — Multi-Language Support & Security
- **Multi-Language (i18n)**:
  - Backend: Added `language` and `translation_of_id` fields to models (`Post`, `Page`, `Category`, `Tag`).
  - Backend: Updated Services/API to filter content by `language` parameter.
  - Frontend Admin: Integrated `vue-i18n` with EN/DE locales and UI switcher. Content forms now support language selection.
  - Frontend Public: Integrated `@nuxtjs/i18n` with EN/DE locales and UI switcher.
- **Security Enhancements**:
  - **Rate Limiting**: Implemented `slowapi` on critical endpoints (Login: 5 req/min).
  - **Security Headers**: Added middleware for `HSTS`, `CSP`, `X-Frame-Options`, etc.
  - **Testing**: Added `tests/test_security.py` and `tests/test_i18n.py`.

### 2026-01-20 — Related Posts & Search Refinements
- **Related Posts**:
  - Backend: Added `get_related_posts` to `PostService` logic (tag/category matching).
  - Frontend: Displayed related posts on Post Detail page.
- **Search**:
  - Refined `search.vue` with debouncing for better UX.
  - Fixed double header issue in search layout.

### Hinweise für die Fortsetzung
- **Nächste Schritte:**
  - SEO Improvements (Canonical URLs, hreflang in Sitemap).
  - Backup & Recovery System refinement.
- Die Requirements-Datei ist der Single Source of Truth.
