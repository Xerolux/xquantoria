# Live-Updates ohne Neustart/Nutzungsausfall

Dieses Dokument beschreibt, wie das System **live** aktualisiert werden kann, ohne Neustart oder Nutzungsausfall. Der/die Benutzer:in kann selbst entscheiden, ob Live-Updates genutzt werden sollen. Zusätzlich gibt es ein manuelles Update per Knopfdruck.

## Grundprinzipien

- **Updates erfolgen ausschließlich online über Git.** Es gibt **keine** reine Update-Datei (kein ZIP, kein Offline-Paket).
- **Changelog wird immer angezeigt**, damit Administrator:innen die Änderungen vor dem Update sehen können.
- **Live-Updates sind optional.** Nutzer:innen können sich bewusst für oder gegen Live-Updates entscheiden.
- **Updates bringen oft neue Funktionen.** Vor einem Live-Update wird **explizit gewarnt**, dass dadurch **ältere Plugins ggf. nicht mehr funktionieren** können.

## Update-Optionen

### 1) Manuelles Update per Knopfdruck

- Im Admin-Bereich gibt es einen **„Update jetzt“**-Button.
- Vor dem Update werden **Changelog und Warnhinweise** angezeigt.
- Administrator:innen bestätigen aktiv, dass sie das Update starten möchten.

### 2) Live-Update beim Admin-Login (optional)

- Wenn **Live-Updates aktiviert** sind, wird **direkt beim Admin-Login** geprüft, ob Updates verfügbar sind.
- **Zu Beginn** des Logins (noch vor der weiteren Bedienung) wird der **Changelog angezeigt**.
- Es wird deutlich darauf hingewiesen, dass **neue Funktionen** enthalten sein können und **ältere Plugins** evtl. nicht mehr kompatibel sind.
- Der/die Administrator:in entscheidet dann, ob das Update **jetzt live** durchgeführt wird oder **verschoben** wird.

## Typischer Ablauf eines Live-Updates (ohne Ausfall)

1. **Update-Check** gegen das Git-Repository.
2. **Changelog-Anzeige** inkl. Warnung zu potenziellen Plugin-Inkompatibilitäten.
3. **Bestätigung** durch die/den Administrator:in (Live-Update oder Abbruch).
4. **Update-Prozess** läuft live (z. B. Code-Update, Migrations, Cache-Neuaufbau) ohne Nutzungsausfall.
5. **Erfolgsmeldung** und erneute Anzeige des Changelogs als Referenz.

## Hinweise & Warnungen

- **Wichtiger Hinweis vor Live-Updates:** Neue Funktionen können bestehende Integrationen beeinflussen.
- **Plugins prüfen:** Nach dem Update sollten Plugins getestet werden, da **ältere Versionen nicht garantiert kompatibel** sind.
- **Transparenz:** Der Changelog wird **immer** angezeigt – sowohl bei manuellen Updates als auch beim optionalen Auto-Check beim Admin-Login.
