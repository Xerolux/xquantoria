# XQUANTORIA CMS

<div align="center">

![CMS Version](https://img.shields.io/badge/version-1.0.0-blue.svg)
![PHP](https://img.shields.io/badge/PHP-8.3-purple.svg)
![Laravel](https://img.shields.io/badge/Laravel-11.0-red.svg)
![React](https://img.shields.io/badge/React-18-blue.svg)
![License](https://img.shields.io/badge/license-Polyform%20NonCommercial-green.svg)

**The Next-Generation Content Management System**

*Redefining Content Management with Quantum-Leap Innovation*

[Features](#-features) • [Quick Start](#-quick-start) • [Documentation](#-documentation) • [License](#-license) • [Support](#-support)

[Deutsche Dokumentation](#deutsche-dokumentation) 🇩🇪

**Website:** [https://xquantoria.com](https://xquantoria.com) | **Email:** [info@xquantoria.com](mailto:info@xquantoria.com)

</div>

---

## 📋 Table of Contents

- [About XQUANTORIA](#-about-xquantoria)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Development](#-development)
- [Deployment](#-deployment)
- [License](#-license)
- [Support](#-support)
- [Changelog](#-changelog)

---

## 🌟 About XQUANTORIA

**XQUANTORIA** is a professional, enterprise-grade Content Management System designed for the modern web. Built with cutting-edge technologies and a focus on performance, security, and scalability.

### The Name XQUANTORIA

**X** = Cross-Platform | eXperience | eXtensible
**QUANTOR** = Quantum Innovation | Quality Excellence
**IA** = Intelligent AI | Interactive Architecture

> *"Quantum Leap for Your Content"*

### Key Highlights

- 🚀 **Modern Stack**: Built with the latest technologies (Laravel 11, React 18, TypeScript)
- 🔒 **Secure**: JWT-based authentication with 2FA support and RBAC
- 📱 **Responsive**: Mobile-first PWA design with offline support
- 🎨 **Customizable**: Extensible plugin system and theming
- 📊 **Analytics**: Built-in analytics and activity logging
- 🤖 **AI Integration**: Optional AI-powered content assistance
- 🌍 **Multi-language**: Full translation and localization support
- 🐳 **Docker Ready**: Complete containerization with Docker Compose
- 🇩🇪 **German Quality**: Developed in Germany with GDPR compliance

---

## ✨ Features

### Content Management
- ✅ **Posts & Pages**: Full CRUD with rich text editor (TinyMCE)
- ✅ **Categories & Tags**: Hierarchical categories and tag organization
- ✅ **Media Library**: Upload images, videos, and files with WebP optimization
- ✅ **Scheduled Publishing**: Schedule posts for future publication
- ✅ **Post Revisions**: Version history and rollback capability
- ✅ **Content Workflow**: Draft → Review → Published workflow
- ✅ **Post Sharing**: Generate shareable links with analytics tracking

### User Management
- ✅ **Role-Based Access Control**: Admin, Editor, Author, Contributor, Subscriber
- ✅ **Role Hierarchy**: Granular permissions and user management
- ✅ **Two-Factor Authentication**: TOTP and recovery codes support
- ✅ **User Profiles**: Customizable user profiles and settings
- ✅ **Activity Logging**: Comprehensive audit trail

### SEO & Marketing
- ✅ **SEO Optimization**: Meta tags, sitemap generation, robots.txt management
- ✅ **Newsletter System**: Double-opt-in with tracking and analytics
- ✅ **Analytics**: Track page views, user engagement, and content performance
- ✅ **Comments**: Manage user comments with moderation and spam detection
- ✅ **Social Media**: Social sharing and preview optimization

### System Features
- ✅ **Plugin System**: Extensible architecture for custom functionality
- ✅ **Activity Logging**: Comprehensive audit trail for all actions
- ✅ **System Health Monitoring**: Real-time system status and performance metrics
- ✅ **Backup Management**: Automated backup and restore functionality
- ✅ **Search**: Full-text search with advanced filtering
- ✅ **Downloads**: Manage downloadable files with access control and token-based security
- ✅ **Settings**: Centralized configuration management
- ✅ **Email Templates**: Customizable email templates

### AI Integration (Optional)
- ✅ **Content Generation**: AI-powered content suggestions and generation
- ✅ **Smart Summaries**: Automatic content summarization
- ✅ **SEO Optimization**: AI-generated meta descriptions and keywords
- ✅ **Translation**: Machine translation with DeepL integration

### Progressive Web App
- ✅ **Service Worker**: Offline support and caching
- ✅ **Manifest**: Install as desktop app
- ✅ **Push Notifications**: Optional push notification support
- ✅ **Responsive Design**: Mobile-optimized UI

---

## 🛠 Tech Stack

### Backend
- **Framework**: Laravel 11 (PHP 8.3+)
- **Database**: PostgreSQL 15+ (MySQL/MariaDB compatible)
- **Cache/Queue**: Redis 7+
- **Authentication**: Laravel Sanctum (JWT)
- **API**: RESTful with versioning (v1)
- **Task Queue**: Redis-based queue with worker
- **Scheduler**: Cron job scheduling

### Frontend
- **Framework**: React 18.3 with TypeScript
- **State Management**: Zustand
- **UI Library**: Ant Design 5.x
- **Build Tool**: Vite 5.x
- **Rich Text Editor**: TinyMCE
- **Routing**: React Router 6.x
- **HTTP Client**: Axios with interceptors
- **PWA**: Service Worker + Manifest

### DevOps
- **Containerization**: Docker & Docker Compose
- **Web Server**: nginx (Alpine)
- **Reverse Proxy**: nginx for API and frontend routing
- **Process Manager**: PHP-FPM
- **SSL**: Ready for HTTPS/TLS

---

## 🚀 Quick Start

### Prerequisites

- Docker and Docker Compose
- Git
- Modern web browser

### One-Line Setup

```bash
git clone https://github.com/xquantoria/xquantoria.git
cd xquantoria
docker compose up -d
docker exec cms-backend php artisan migrate --force
docker exec cms-backend php artisan db:seed --force
```

### Access the Application

- **Frontend**: http://localhost/
- **Admin Login**: http://localhost/login
- **API Health**: http://localhost/api/v1/health
- **MailHog** (Email Testing): http://localhost:8025

### Default Credentials

```
Email: admin@xquantoria.com
Password: password
```

> ⚠️ **Important**: Change the default password after first login!

---

## 📦 Installation

### Step 1: Clone Repository

```bash
git clone https://github.com/xquantoria/xquantoria.git
cd xquantoria
```

### Step 2: Environment Configuration

The backend `.env` file is pre-configured for Docker. Adjust if needed:

```env
# Application
APP_NAME="XQUANTORIA"
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost
APP_LOCALE=de
APP_TIMEZONE=Europe/Berlin

# Database
DB_CONNECTION=pgsql
DB_HOST=database
DB_PORT=5432
DB_DATABASE=xquantoria_db
DB_USERNAME=xquantoria_user
DB_PASSWORD=secure_password_change_me

# Redis
REDIS_HOST=redis
REDIS_PASSWORD=null
REDIS_PORT=6379

# Mail (MailHog for development)
MAIL_MAILER=smtp
MAIL_HOST=mailhog
MAIL_PORT=1025
MAIL_FROM_ADDRESS=info@xquantoria.com
MAIL_FROM_NAME="${APP_NAME}"
```

### Step 3: Build and Start Containers

```bash
docker compose build
docker compose up -d
```

### Step 4: Run Migrations

```bash
docker exec cms-backend php artisan migrate --force
docker exec cms-backend php artisan db:seed --force
```

### Step 5: Verify Installation

```bash
# Check all containers are running
docker compose ps

# Check backend health
curl http://localhost/api/v1/health

# Check scheduler is running
docker logs cms-scheduler
```

---

## ⚙️ Configuration

### Environment Variables

See `backend/.env` file for all available configuration options.

### Frontend Configuration

The frontend uses Vite with environment variables. See `frontend/vite.config.ts` for proxy configuration.

### Database Selection

XQUANTORIA supports three databases:

**PostgreSQL (Recommended):**
```bash
docker compose --profile postgres up -d
```

**MySQL:**
```bash
docker compose --profile mysql up -d
```

**MariaDB:**
```bash
docker compose --profile mariadb up -d
```

---

## 📖 API Documentation

### Base URL
```
http://localhost/api/v1
```

### Authentication Endpoints

```http
POST   /api/v1/auth/login
POST   /api/v1/auth/logout
POST   /api/v1/auth/refresh
GET    /api/v1/auth/me
POST   /api/v1/auth/forgot-password
POST   /api/v1/auth/reset-password
```

### Example Login Request

```bash
curl -X POST http://localhost/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@xquantoria.com","password":"password"}'
```

### Main Endpoints

#### Content
- `GET|POST|PUT|DELETE /api/v1/posts` - Blog posts management
- `GET|POST|PUT|DELETE /api/v1/pages` - Static pages
- `GET|POST|PUT|DELETE /api/v1/categories` - Categories
- `GET|POST|PUT|DELETE /api/v1/tags` - Tags
- `GET|POST|PUT|DELETE /api/v1/media` - Media library
- `GET|POST|PUT|DELETE /api/v1/comments` - Comments management

#### Users & Auth
- `GET|POST|PUT|DELETE /api/v1/users` - User management
- `GET|PUT /api/v1/users/{id}/roles` - Role assignments
- `POST /api/v1/2fa/enable` - Enable 2FA
- `POST /api/v1/2fa/disable` - Disable 2FA

#### System
- `GET|PUT /api/v1/settings` - System settings
- `GET /api/v1/system/health` - Health check
- `GET /api/v1/activity-logs` - Activity logs
- `POST /api/v1/backups` - Create backup
- `POST /api/v1/backups/{id}/restore` - Restore backup

#### Marketing
- `GET|POST /api/v1/newsletters` - Newsletter campaigns
- `GET|POST /api/v1/newsletters/subscribe` - Public subscribe
- `GET|POST|PUT|DELETE /api/v1/ads` - Advertisements

#### AI (Optional)
- `POST /api/v1/ai/generate-content` - Generate content
- `POST /api/v1/ai/summarize` - Summarize text
- `POST /api/v1/ai/translate` - Translate content

For complete API documentation, see `/docs/api-documentation.md`

---

## 💻 Development

### Local Development Setup

```bash
# Frontend (Terminal 1)
cd frontend
npm install
npm run dev

# Backend (Terminal 2)
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

### Code Structure

```
xquantoria/
├── backend/                    # Laravel Backend
│   ├── app/
│   │   ├── Http/Controllers/   # API Controllers
│   │   ├── Models/            # Eloquent Models
│   │   ├── Services/          # Business Logic
│   │   └── Middleware/        # Custom Middleware
│   ├── database/
│   │   ├── migrations/        # Database Migrations
│   │   └── seeders/           # Database Seeders
│   ├── routes/                # API Routes
│   ├── config/                # Configuration Files
│   └── tests/                 # PHPUnit Tests
│
├── frontend/                   # React Frontend
│   ├── src/
│   │   ├── components/        # React Components
│   │   ├── pages/             # Page Components
│   │   ├── services/          # API Services
│   │   ├── store/             # State Management (Zustand)
│   │   ├── hooks/             # Custom React Hooks
│   │   └── types/             # TypeScript Types
│   ├── public/                # Static Assets
│   └── tests/                 # Vitest Tests
│
├── nginx/                      # nginx Configuration
├── docker-compose.yml          # Docker Services
└── docs/                       # Documentation
```

### Development Commands

```bash
# Backend
php artisan migrate:fresh --seed
php artisan queue:work
php artisan schedule:work
php artisan cache:clear
php artisan config:clear

# Frontend
npm run dev          # Development server
npm run build        # Production build
npm run preview      # Preview production build
npm run lint         # Lint code
npm run test         # Run tests
```

---

## 🧪 Testing

```bash
# Backend Tests (PHPUnit)
docker exec cms-backend php artisan test
docker exec cms-backend php artisan test --filter PostTest

# Frontend Tests (Vitest)
cd frontend
npm test
npm run test:ui
```

---

## 🚀 Deployment

### Production Deployment

1. **Update Environment:**
   ```env
   APP_ENV=production
   APP_DEBUG=false
   APP_URL=https://xquantoria.com
   ```

2. **Build Containers:**
   ```bash
   docker compose -f docker-compose.prod.yml build
   ```

3. **Start Services:**
   ```bash
   docker compose -f docker-compose.prod.yml up -d
   ```

4. **Run Optimizations:**
   ```bash
   docker exec cms-backend php artisan config:cache
   docker exec cms-backend php artisan route:cache
   docker exec cms-backend php artisan view:cache
   ```

5. **Setup SSL:**
   - Use Let's Encrypt with Certbot
   - Configure nginx for HTTPS

### Docker Services

| Service | Port | Description |
|---------|------|-------------|
| Frontend | 80, 443 | React App (via nginx) |
| Backend | 9000 | Laravel PHP-FPM |
| PostgreSQL | 5432 | Database |
| Redis | 6379 | Cache/Queue |
| MailHog | 8025, 1025 | Email Testing |
| Queue Worker | - | Background Jobs |
| Scheduler | - | Cron Jobs |

---

## 📄 License

This project is licensed under the **Polyform NonCommercial 1.0.0 License**.

### What this means

**✅ ALLOWED without permission:**
- Personal use
- Educational use
- Open source development
- Modification and customization
- Distribution for free

**❌ REQUIRES COMMERCIAL LICENSE:**
- Selling the software or services
- Using in revenue-generating applications
- SaaS integration
- Enterprise production use
- Reselling for profit

See [LICENSE](LICENSE) for the full license text.

### Commercial License

For commercial use licenses, please contact:
- **Email:** [info@xquantoria.com](mailto:info@xquantoria.com)
- **Website:** [https://xquantoria.com](https://xquantoria.com)
- **Address:** XQUANTORIA, Germany

---

## 🆘 Support

### Getting Help

- **Documentation:** [https://docs.xquantoria.com](https://docs.xquantoria.com)
- **Issues:** [GitHub Issues](https://github.com/xquantoria/xquantoria/issues)
- **Discussions:** [GitHub Discussions](https://github.com/xquantoria/xquantoria/discussions)
- **Email:** [support@xquantoria.com](mailto:support@xquantoria.com)

### Professional Support

For enterprise support and custom development:
- **Email:** [info@xquantoria.com](mailto:info@xquantoria.com)
- **Website:** [https://xquantoria.com](https://xquantoria.com)

### Reporting Security Issues

For security vulnerabilities, please email:
- **Security:** [security@xquantoria.com](mailto:security@xquantoria.com)

---

## 📝 Changelog

### Version 1.0.0 (2026-01-21)

**Added:**
- 🎉 Initial release of XQUANTORIA CMS
- Complete backend with Laravel 11
- React 18 frontend with TypeScript
- PWA support with service worker
- User authentication with JWT and 2FA
- Posts, pages, categories, tags management
- Media library with WebP optimization
- Newsletter system with double-opt-in
- SEO tools (sitemap, robots.txt, meta tags)
- Plugin system and extensibility
- Activity logging and audit trail
- System health monitoring
- Backup and restore functionality
- Full-text search
- Download management with token security
- Settings management
- Role hierarchy and permissions
- Email templates
- AI integration capabilities
- Docker-based deployment
- Queue worker and scheduler
- Multi-language support
- Translation workflow
- Quick search (Cmd+K)
- Breadcrumb navigation

**Security:**
- Rate limiting
- CSRF protection
- XSS prevention
- SQL injection prevention
- File upload validation
- GDPR compliance
- Cookie consent

**Performance:**
- Redis caching
- Database indexing
- Eager loading
- WebP image optimization
- Lazy loading
- Code splitting

---

## 🙏 Acknowledgments

Built with amazing open-source tools:
- [Laravel](https://laravel.com) - The PHP Framework for Web Artisans
- [React](https://react.dev) - The library for web and native user interfaces
- [Ant Design](https://ant.design) - Enterprise UI design language
- [Vite](https://vitejs.dev) - Next Generation Frontend Tooling
- [PostgreSQL](https://www.postgresql.org) - The World's Most Advanced Open Source Relational Database
- [Redis](https://redis.io) - In-memory data structure store

**Special Thanks:**
- The Laravel community
- The React community
- All contributors and testers
- Open source developers worldwide

---

## 🌐 Website & Social Media

- **Website:** [https://xquantoria.com](https://xquantoria.com)
- **Documentation:** [https://docs.xquantoria.com](https://docs.xquantoria.com)
- **GitHub:** [https://github.com/xquantoria](https://github.com/xquantoria)
- **Twitter/X:** [@xquantoria](https://twitter.com/xquantoria)
- **LinkedIn:** [XQUANTORIA](https://linkedin.com/company/xquantoria)

---

<div align="center">

**Built with ❤️ in Germany | Hosted in Germany | 100% GDPR Compliant**

**XQUANTORIA - Content Management, Redefined**

[⬆ Back to Top](#xquantoria-cms)

</div>

---

## 📚 Deutsche Dokumentation

### Über XQUANTORIA

**XQUANTORIA** ist ein professionelles, entreprise-grade Content Management System für das moderne Web. Mit Fokus auf Performance, Sicherheit und Skalierbarkeit.

### Der Name XQUANTORIA

**X** = Cross-Platform | eXperience | eXtensible
**QUANTOR** = Quantum Innovation | Quality Excellence
**IA** = Intelligent AI | Interactive Architecture

> *"Quanten-Sprung für Ihre Inhalte"*

### Schnellstart mit Docker

```bash
git clone https://github.com/xquantoria/xquantoria.git
cd xquantoria
docker compose up -d
docker exec cms-backend php artisan migrate --force
docker exec cms-backend php artisan db:seed --force
```

### Zugriff

- **Frontend:** http://localhost/
- **Admin Login:** http://localhost/login
- **Standard-Zugang:**
  - Email: `admin@xquantoria.com`
  - Passwort: `password`

### Docker Services

| Service | Port | Beschreibung |
|---------|------|-------------|
| Frontend | 80, 443 | React App (via nginx) |
| Backend | 9000 | Laravel PHP-FPM |
| PostgreSQL | 5432 | Datenbank |
| Redis | 6379 | Cache/Queue |
| MailHog | 8025 | Email Testing UI |
| Queue Worker | - | Background Jobs |
| Scheduler | - | Cron Jobs |

### Nützliche Befehle

```bash
# Container Status
docker compose ps

# Logs ansehen
docker compose logs -f backend

# Migrationen ausführen
docker compose exec backend php artisan migrate

# In Backend Shell
docker compose exec backend sh

# Queue Worker Status
docker compose logs -f queue-worker

# Scheduler Status
docker compose logs -f scheduler
```

### Unterstützung

- **Email:** [info@xquantoria.com](mailto:info@xquantoria.com)
- **Support:** [support@xquantoria.com](mailto:support@xquantoria.com)
- **Website:** [https://xquantoria.com](https://xquantoria.com)
- **Dokumentation:** [https://docs.xquantoria.com](https://docs.xquantoria.com)

### Lizenz (Deutsch)

Dieses Projekt ist unter der **Polyform NonCommercial 1.0.0 Lizenz** veröffentlicht.

**✅ ERLAUBT ohne Erlaubnis:**
- Persönliche Nutzung
- Bildungszwecke
- Open Source Entwicklung
- Modifikation und Anpassung
- Kostenlose Verbreitung

**❌ ERFORDERT KOMMERZIELLE LIZENZ:**
- Verkauf der Software oder Dienstleistungen
- Nutzung in Umsatz generierenden Anwendungen
- SaaS Integration
- Unternehmensproduktion
- Weiterverkauf für Profit

Für kommerzielle Lizenzen kontaktieren Sie bitte:
- **Email:** [info@xquantoria.com](mailto:info@xquantoria.com)

---

<div align="center">

**Mit ❤️ in Deutschland entwickelt** | **Hosting in Deutschland** | **100% DSGVO-konform**

**XQUANTORIA - Content Management, neu definiert**

</div>
