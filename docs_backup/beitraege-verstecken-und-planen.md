# Anleitung: Beiträge verstecken, Zugriff beschränken & zeitversetzt veröffentlichen

Diese Anleitung beschreibt **(1)** wie Beiträge im aktuellen CMS-Stand verborgen werden können, **(2)** wie man Zugriffsbeschränkungen für zahlende Nutzer:innen, Abonnent:innen oder Benutzergruppen (Rollen) einführt, und **(3)** wie zeitversetztes Veröffentlichen mit optionalem Countdown umgesetzt werden kann.

## 1) Was das System aktuell unterstützt (Basis)

**Rollen im System:**
Im API-Schema sind feste Rollen vorgesehen (z. B. `super_admin`, `admin`, `editor`, `author`, `contributor`, `subscriber`). Diese Rollen können als Grundlage für Rechteprüfungen dienen, z. B. „nur Abonnent:innen“ oder „nur Redaktion“.【F:app/api/v1/schemas/user.py†L13-L42】

**Beitragsstatus & Veröffentlichungszeit:**
Beiträge besitzen Statuswerte (`draft`, `scheduled`, `published`, `archived`) sowie ein Feld `published_at` für einen Veröffentlichungszeitpunkt. Damit existieren die Voraussetzungen für geplantes Veröffentlichen.【F:app/api/v1/schemas/post.py†L17-L48】【F:app/models/post.py†L32-L36】

## 2) Beiträge verstecken (ohne Zugriffsbeschränkung)

**Ziel:** Beiträge ausblenden, ohne Zugriff auf den Inhalt speziell zu beschränken.

**Empfohlene Vorgehensweise:**
1. **Status auf `draft` setzen** → Beitrag ist nicht öffentlich sichtbar.
2. **Status auf `archived` setzen** → Beitrag bleibt im System, wird aber nicht in öffentlichen Listen angezeigt.

> Hinweis: Der Status ist bereits im Schema verankert und sollte in Listen- und Detail-Endpunkten berücksichtigt werden.【F:app/api/v1/schemas/post.py†L17-L48】

## 3) Zugriff beschränken (Paywall, Abonnent:innen, Gruppen)

**Ziel:** Zugriff nur für bestimmte Nutzergruppen zulassen (z. B. zahlende Kund:innen, Abonnent:innen, interne Teams).

### 3.1 Zugriffskategorien definieren
Ergänzen Sie das Post-Modell um ein Zugriffsattribut, z. B.:
- `access_level`: `public`, `subscriber`, `paid`, `staff`, `custom_group`
- optional zusätzliche Tabelle `post_access_groups` (Many-to-Many)

**Warum?** Damit kann der API-Endpunkt abhängig vom eingeloggten Nutzer prüfen, ob Zugriff erlaubt ist.

### 3.2 Nutzerzustand abbilden
Erweitern Sie das Nutzerprofil um Flags/Beziehungen, z. B.:
- `is_subscriber` (bool)
- `subscription_tier` (string)
- `groups` (viele-zu-viele)

Die Rollenliste im Schema liefert eine erste Basis für Gruppenlogik (z. B. `subscriber`).【F:app/api/v1/schemas/user.py†L13-L42】

### 3.3 Zugriff im API-Layer prüfen
**Beispiel-Logik (Pseudocode):**
```
if post.access_level == "public":
    allow
elif post.access_level == "subscriber":
    allow if user.role in ["subscriber", "editor", "admin", "super_admin"]
elif post.access_level == "paid":
    allow if user.is_paid
elif post.access_level == "custom_group":
    allow if user in post.groups
else:
    deny
```

> Wichtig: Für öffentliche Listen (`/posts`) sollten geschützte Inhalte entweder ausgeblendet oder mit „gesperrt“-Hinweis ausgeliefert werden (z. B. nur Titel/Teaser).

## 4) Zeitversetztes Veröffentlichen (Scheduled Publishing)

**Ziel:** Beiträge automatisch zu einem späteren Zeitpunkt veröffentlichen.

### 4.1 Datenmodell nutzen
Das System hat bereits:
- `status = scheduled`
- `published_at` (Datum/Uhrzeit)【F:app/api/v1/schemas/post.py†L17-L48】【F:app/models/post.py†L32-L36】

### 4.2 Serverlogik implementieren
Implementieren Sie einen Job (z. B. Cron, Celery, APScheduler), der regelmäßig prüft:
1. `status == scheduled`
2. `published_at <= now()`

Dann:
- setze `status = published`
- setze ggf. weitere Felder (z. B. `published_at` belassen oder aktualisieren)

### 4.3 API-Validierung
Beim Speichern eines Beitrags:
- wenn `status == scheduled`, muss `published_at` gesetzt sein
- wenn `status == published`, darf `published_at` in der Vergangenheit liegen

## 5) Countdown bis Veröffentlichung (sichtbar oder verborgen)

**Ziel:** Nutzer sehen optional eine Restzeit, bis der Beitrag verfügbar ist (oder der Countdown bleibt unsichtbar).

### 5.1 Sichtbarer Countdown
Im Frontend:
- Wenn `status == scheduled` und Nutzer berechtigt:
  - zeige Titel/Teaser + Countdown (z. B. „Veröffentlichung in 02:13:42“)
- Countdown basiert auf `published_at`.

### 5.2 Unsichtbarer Countdown
- Beitrag ist vollständig verborgen bis `published_at` erreicht ist.
- Für unberechtigte Nutzer bleibt der Beitrag unsichtbar oder wird als „gesperrt“ angezeigt.

### 5.3 Empfohlene API-Ausgabe
Ergänzen Sie den Post-Serializer um ein Feld wie:
- `publish_countdown_seconds` (nur wenn `status == scheduled`)
- `is_accessible` (bool) je nach Nutzer

## 6) Zusammenfassung (kurz & KI-verständlich)

1. Beiträge verstecken: Status `draft` oder `archived` verwenden.【F:app/api/v1/schemas/post.py†L17-L48】
2. Zugriff beschränken: Rollen ausnutzen und um `access_level` + Abos/Gruppen erweitern.【F:app/api/v1/schemas/user.py†L13-L42】
3. Zeitversetzt veröffentlichen: `scheduled` + `published_at` prüfen und per Job automatisch auf `published` setzen.【F:app/api/v1/schemas/post.py†L17-L48】【F:app/models/post.py†L32-L36】
4. Countdown: im Frontend sichtbar machen oder komplett verbergen, je nach UI-Wunsch.
