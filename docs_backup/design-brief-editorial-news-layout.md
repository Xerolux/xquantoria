# Design-Briefing: Redaktionelles News-Layout (für unser CMS)

> Ziel: Dieses Dokument beschreibt, **welche Informationen, Entscheidungen und technischen Bausteine** nötig sind, um ein modernes, redaktionelles News-Layout mit klarer Typografie, guter Lesbarkeit und modularem Aufbau zu entwickeln – kompatibel mit unserem eigenen CMS.

---

## 1) Zielbild & Design-Prinzipien

**Kernmerkmale**
- **Redaktioneller Fokus:** Artikel stehen klar im Mittelpunkt; Bild/Teaser unterstützen den Text.
- **Hohe Lesbarkeit:** Großzügige Zeilenhöhe, klare Hierarchie, ausreichend Weißraum.
- **Modularer Aufbau:** Wiederverwendbare Komponenten für Listen, Teaser, Sidebars.
- **Performance-orientiert:** Schnelle Ladezeiten, optimierte Bilder, wenig Blocker.

**Design-Prinzipien**
- **Kontrast & Hierarchie:** Headlines dominieren, Untertitel/Metas dienen als Ankerpunkte.
- **Scanbarkeit:** Klare Trennung von Beiträgen, standardisierte Teaser-Formate.
- **Konsistenz:** Einheitliche Abstände, Schriftgrößen und Komponentenverhalten.

---

## 2) Informationsarchitektur & Seitenstruktur

**Startseite (News-Feed)**
- **Hero-Teaser** (1 Hauptartikel, großes Bild, großer Titel)
- **Primäre Liste** (2–6 Artikel in Cards/Teasern, 2–3 Spalten je nach Breakpoint)
- **Sektionen/Blöcke** (z. B. „Lokales“, „Technik“, „Meinung“)
- **Sidebar** (optional: Trending, Newsletter, Social, Ads)

**Kategorie-/Tag-Seiten**
- Liste von Teasern, optional mit **Top-Artikel** als hervorgehobener Header

**Artikel-Detailseite**
- **Titel, Subline, Meta (Datum, Autor, Kategorie)**
- **Hero-Bild**
- **Body** mit strukturierten Inhalten (Absätze, Zitate, Listen, Inline-Medien)
- **Related Content** (Footer-Teaser oder Sidebar)

---

## 3) Typografie & Design-Tokens (Startwerte)

**Schriftwahl (Beispiele)**
- Headline: Serifen- oder elegante Grotesk-Schrift
- Body: gut lesbare Sans-Serif

**Typografie-Skala (empfohlen)**
- H1: 36–44px
- H2: 28–32px
- H3: 22–26px
- Body: 16–18px
- Small/Meta: 12–14px

**Zeilenhöhe**
- Headline: 1.1–1.3
- Body: 1.6–1.8

**Abstände (Spacing Scale)**
- 4 / 8 / 12 / 16 / 24 / 32 / 48 / 64px

**Farbpalette (Richtwerte)**
- Text: #111 / #333
- Hintergrund: #FFF / #F7F7F7
- Akzent (Links/Buttons): kräftige Primärfarbe
- Linien/Trenner: #E5E5E5

> Empfehlung: Tokens zentral verwalten (z. B. CSS Custom Properties), damit CMS-Theme-Branding leicht anpassbar ist.

---

## 4) Komponenten-Katalog (für CMS-relevante UI)

**Teaser/Card**
- Bild (16:9 oder 4:3), Titel, Meta, kurzer Text
- Varianten: groß, mittel, klein

**Listenansichten**
- Grid (2–3 Spalten), 1 Spalte auf Mobile
- Trennlinien oder Card-Container

**Artikel-Header**
- Titel, Subline, Meta, Hero-Bild

**Inhaltsmodule**
- Absatz, Zwischenüberschrift, Zitat, Bild (mit Caption)
- Optional: Faktenbox/Infobox, Tabelle

**Navigation**
- Hauptmenü horizontal, auf Mobile als Drawer
- Brotkrumen optional

**Footer**
- Links, Kategorien, Impressum/Datenschutz, Social

---

## 5) CMS-Anforderungen (Datenmodell & Felder)

**Artikel-Modell (Minimum)**
- `title` (string)
- `excerpt` (string)
- `content` (rich text / blocks)
- `hero_image` (image)
- `author` (relation)
- `category` (relation)
- `tags` (array)
- `published_at` (datetime)
- `slug` (string)

**Erweiterungen**
- `featured` (boolean)
- `reading_time` (number)
- `seo_title`, `seo_description`
- `related_articles` (relation)

**Content-Block-Design**
- Unterstützte Blöcke: Paragraph, Heading, Image, Quote, List, Embed
- Jedes Block-Layout sollte **responsiv** und **barrierefrei** sein

---

## 6) Responsives Verhalten (Breakpoints & Grid)

**Empfohlene Breakpoints**
- XS: < 480px
- SM: 480–768px
- MD: 768–1024px
- LG: 1024–1280px
- XL: 1280px+

**Grid-Vorschlag**
- 12-Spalten Grid ab MD
- Gutter: 16–24px
- Max-Width: 1200–1320px

---

## 7) Performance & SEO Basics

- Bilder via Lazy Loading + Responsive Sizes
- Preload für wichtige Schriften
- Semantisches HTML (h1/h2/h3 korrekt)
- JSON-LD für Artikel (Schema.org/Article)

---

## 8) Accessibility (A11y) Checkliste

- Kontraste (mind. WCAG AA)
- Fokuszustände sichtbar
- Lesbare Schriftgröße (min 16px)
- Alt-Text für Bilder

---

## 9) Was das Team liefern muss (Checkliste)

**Design-Team**
- Typografie-Entscheidung
- Farbpalette + Token-Definitionen
- Komponenten-Designs (Figma/Sketch)
- Responsive Varianten

**Frontend-Team**
- Komponenten-Bibliothek (Teaser, Grid, Article)
- Token-System (CSS Vars)
- SSR/SEO-freundliche Templates
- Asset-Pipeline (Bildgrößen, Lazy Load)

**Backend/CMS-Team**
- Content-Modellierung (Artikel, Autor, Kategorien)
- Editorial Workflow (Draft/Publish)
- API für Teaser-Listen & Artikel

---

## 10) Empfehlung zur Umsetzung im CMS

1. **Design Tokens** in CMS-Theme-Konfiguration anlegen (Farben, Typografie, Spacing).
2. **Template-Blueprints** für Startseite, Kategorie, Artikel definieren.
3. **Komponenten als Module** (z. B. `hero`, `teaser_grid`, `sidebar_list`) implementieren.
4. **Editoren-UX**: Vorschau + Pflichtfelder für Hero, Excerpt etc.

---

## 11) Ergänzungen für KI & Design-Umsetzung

**Farb-Tokens (erweitert)**
- `color.text.primary`: Haupttext
- `color.text.secondary`: Meta-Infos
- `color.surface.default`: Standard-Hintergrund
- `color.surface.muted`: Sektionen/Blöcke
- `color.border.subtle`: Trennlinien
- `color.accent.primary`: Links/Buttons
- `color.state.hover`: Hover-Variante
- `color.state.active`: Active-Variante
- `color.state.focus`: Fokus-Ring

**Schriften & Fallbacks**
- Headline-Font + Fallbacks (z. B. `"Serif A", "Serif B", serif`)
- Body-Font + Fallbacks (z. B. `"Sans A", "Sans B", sans-serif`)
- Definiere `font-weight`-Stufen (Regular, Medium, Bold)

**Komponentenzustände**
- Links: default / hover / visited / active
- Cards: default / hover (Schatten oder Border)
- Buttons: primary / secondary / ghost

**Storytelling-Varianten**
- Short News: kurze Teaser + kleines Bild
- Standard-Artikel: Hero + Fließtext + Bilder
- Longform: Zwischenkapitel + Zitate + Infoboxen

**Bildrichtlinien**
- Aspect-Ratios: 16:9 (Hero), 4:3 (Teaser)
- Focal Point definieren (wichtiges Motiv im Center oder Drittel)
- Max. Dateigrößen je Breakpoint festlegen

---

## 12) Nächste Schritte

- Figma-Bibliothek erstellen (Tokens + Komponenten)
- Prototyp der Startseite im CMS-Theme
- UX-Test für Lesbarkeit & Scannability

---

**Hinweis:** Dieses Dokument soll als Grundlage für Design & Entwicklung dienen und kann für unser CMS weiter angepasst werden (z. B. eigene Branding-Optionen oder modulare Theme-Slots).
