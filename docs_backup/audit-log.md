# Anleitung: Audit-Log (bedarfsweise, ohne personenbezogene Daten)

## Ziel
Dieses Audit-Log dient dazu, **klar nachvollziehbar** zu dokumentieren, **wer** am System **was** getan oder **geändert** hat – **ohne** personenbezogene Daten wie IP-Adressen, Standortdaten oder Gerätekennungen zu speichern. Es wird **nur bei Bedarf aktiviert** und kann gezielt für bestimmte Benutzer:innen oder Gruppen eingeschaltet werden.

## Grundprinzipien
- **Minimalprinzip**: Nur Aktionen und Änderungen erfassen, die für Nachvollziehbarkeit/Compliance nötig sind.
- **Keine personenbezogenen Daten**: Keine IP, keine User-Agent-Strings, keine Geodaten.
- **Zielgerichtet**: Auditierung pro Benutzer:in oder Gruppe aktivieren/deaktivieren.
- **Nachvollziehbarkeit**: Jede Änderung enthält „Was“, „Wann“, „Wer“ (System-Identität), „Wo“ (System/Modul) und „Warum“ (optional).
- **Integrität**: Audit-Logs sollen nicht nachträglich manipulierbar sein (z. B. Append-only, signiert oder schreibgeschützt).

## Aktivierung (nur bei Bedarf)
1. **Standardzustand: deaktiviert**
2. **Aktivierung je Benutzer:in oder Gruppe**
   - Beispiel: „Audit für Gruppe `Admins` aktivieren“
   - Beispiel: „Audit für Benutzer:in `editor_17` aktivieren“
3. **Gültigkeitszeitraum definieren**
   - Start- und Endzeitpunkt (z. B. für einen bestimmten Prüfungszeitraum)
4. **Scope definieren**
   - Welche Module/Teile des Systems erfasst werden (z. B. Inhalte, Rollenverwaltung, Systemkonfiguration)

## Was wird geloggt? (ohne personenbezogene Daten)
### Systemrelevante Aktionen
- Anlegen, Ändern, Löschen von Inhalten
- Änderungen an Rollen, Berechtigungen und Gruppenmitgliedschaften
- Änderungen an Systemkonfigurationen
- Imports/Exports, Bulk-Operationen
- Deployments oder Änderungen an Skripten/Automatisierungen

### Änderungsdetails (Diff/Delta)
- **Vorher/Nachher**-Werte für relevante Felder
- Identifikation der betroffenen Entität (z. B. Inhalt-ID, Konfig-Schlüssel)

### Metadaten (nicht personenbezogen)
- **Aktionstyp** (create/update/delete/execute)
- **Zeitstempel** (UTC)
- **Akteur** (System-ID oder Benutzer:in-Handle ohne Realnamen)
- **Ressource** (z. B. `article:123`, `role:editor`, `config:cache_ttl`)
- **Ergebnis** (success/failure)
- **Begründung** (optional, Freitext ohne personenbezogene Inhalte)

## Was wird **nicht** geloggt?
- IP-Adressen
- Gerätekennungen (Device ID), Browserfingerprints, User-Agent
- Klarnamen, E-Mail-Adressen (falls vermeidbar)
- Standortdaten

## Struktur eines Audit-Eintrags (Beispiel)
```json
{
  "timestamp": "2024-05-18T12:34:56Z",
  "actor": "user:editor_17",
  "action": "update",
  "resource": "article:987",
  "module": "content",
  "changes": {
    "title": {"from": "Alt", "to": "Neu"},
    "status": {"from": "draft", "to": "published"}
  },
  "result": "success",
  "reason": "Freigabe nach Review"
}
```

## Zugriff und Auswertung
- Zugriff nur für berechtigte Rollen (z. B. Compliance, Admins)
- Exportmöglichkeit für Audits (z. B. JSON/CSV), ohne PII
- Filterung nach Zeitraum, Benutzer:in/Gruppe, Ressource, Aktionstyp

## Aufbewahrung & Löschung
- **Retention-Policy** definieren (z. B. 90 Tage oder projektspezifisch)
- **Automatisches Löschen** nach Ablauf der Aufbewahrungsfrist
- **Archivierung** nur, wenn gesetzlich erforderlich

## Best Practices
- Audit nur aktivieren, wenn **konkret nötig** (z. B. Sicherheitsprüfung, Vorfallanalyse)
- Möglichst **kleiner Scope** (z. B. nur bestimmte Module)
- Regelmäßige Review der Einträge auf Relevanz und Datenminimierung
- Alarmierung bei kritischen Änderungen (z. B. Rollenänderungen)

## Checkliste zur Aktivierung
- [ ] Bedarf begründet
- [ ] Betroffene Benutzer:in/Gruppe festgelegt
- [ ] Zeitraum definiert
- [ ] Scope definiert
- [ ] Speicher- und Aufbewahrungskonzept geprüft
- [ ] Zugriffskontrollen eingerichtet

## Hinweis zur Datenschutzkonformität
Dieses Audit-Log ist so konzipiert, dass es **keine personenbezogenen Daten** erhebt. Sollten in Ausnahmefällen personenbezogene Informationen erforderlich sein, ist vorab eine **datenschutzrechtliche Prüfung** (z. B. Datenschutzfolgeabschätzung) durchzuführen.
