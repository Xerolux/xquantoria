# Zugriffsrollen-Hierarchie

## 1. Überblick
Diese Hierarchie beschreibt die Rollen und ihre typischen Zugriffsbereiche in einem CMS. Die Reihenfolge ist von **höchster** zu **niedrigster** Berechtigungsstufe.

## 2. Rollenebenen (von oben nach unten)

### 2.1 Systemadministrator (Super-Admin)
**Kurzbeschreibung:** Vollzugriff auf das gesamte System, inklusive sicherheitskritischer und infrastruktureller Einstellungen.

**Typische Befugnisse:**
- Systemeinstellungen, Integrationen, Mandantenverwaltung
- Benutzer- und Rollenmanagement auf globaler Ebene
- Sicherheitsrichtlinien, Backups, Audit-Logs

---

### 2.2 Plattformadministrator (Admin)
**Kurzbeschreibung:** Umfassende Verwaltung innerhalb eines Mandanten/Projekts.

**Typische Befugnisse:**
- Verwaltung von Inhalten, Strukturen und Workflows
- Rollen- und Benutzerverwaltung innerhalb des Projekts
- Freigaben, Veröffentlichungen, globale Konfigurationen im Projekt

---

### 2.3 Inhaltsmanager (Moderator)
**Kurzbeschreibung:** Qualitäts- und Moderationsverantwortung für Inhalte.

**Typische Befugnisse:**
- Inhalte prüfen, freigeben, ablehnen
- Kommentare moderieren, Richtlinien durchsetzen
- Veröffentlichungs- und Archivierungsentscheidungen

---

### 2.4 Redakteur (Benutzer/Editor)
**Kurzbeschreibung:** Erstellung und Pflege von Inhalten.

**Typische Befugnisse:**
- Artikel erstellen, bearbeiten, zur Freigabe einreichen
- Medien hochladen und verwalten
- Eigene Inhalte aktualisieren

---

### 2.5 Autor (Beitragsautor)
**Kurzbeschreibung:** Verfasst Inhalte, meist mit eingeschränkten Bearbeitungsrechten.

**Typische Befugnisse:**
- Beiträge verfassen und speichern
- Inhalte zur Freigabe einreichen
- Eingeschränkte Bearbeitung vorhandener Inhalte

---

### 2.6 Abonnent (Subscriber)
**Kurzbeschreibung:** Zugriff auf exklusive oder abonnierte Inhalte.

**Typische Befugnisse:**
- Lesen von Premium- oder Abo-Inhalten
- Verwaltung des eigenen Profils und Abos

---

### 2.7 Zahlender Leser (Paywall-Kunde)
**Kurzbeschreibung:** Zugriff auf paywall-geschützte Artikel, ohne redaktionelle Rechte.

**Typische Befugnisse:**
- Lesen bezahlter Artikel
- Rechnungs- und Zahlungsverwaltung im eigenen Konto

---

### 2.8 Gast (Öffentlicher Besucher)
**Kurzbeschreibung:** Unangemeldeter Nutzer mit minimalem Zugriff.

**Typische Befugnisse:**
- Lesen frei verfügbarer Inhalte
- Keine Schreib- oder Verwaltungsrechte

## 3. Hinweis zur Erweiterbarkeit
Diese Struktur kann durch **zusätzliche Rollen** (z. B. „Technischer Redakteur“, „Content-Strategist“, „Support-Agent“) erweitert werden, sofern ein klarer Platz in der Hierarchie definiert wird.

**Empfohlene Kriterien für neue Rollen:**
- **Verantwortungsbereich:** Klar abgrenzen (z. B. Technik, Content, Support).
- **Entscheidungsbefugnis:** Definieren, welche Freigaben oder Änderungen erlaubt sind.
- **Datenzugriff:** Festlegen, welche Inhalte, Nutzer- oder Systemdaten einsehbar sind.
- **Risikostufe:** Einschätzen, ob die Rolle systemkritische Aktionen ausführen darf.

**Hinweis:** Neue Rollen sollten in Dokumentation, Rechteverwaltung und Audit-Logs konsistent benannt und gepflegt werden.
