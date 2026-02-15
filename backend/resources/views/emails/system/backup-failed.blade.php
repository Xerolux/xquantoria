<x-mail::message>
# ⚠️ Backup fehlgeschlagen

Das automatische Backup ist fehlgeschlagen!

**Zeitpunkt:** {{ $timestamp }}<br>
**Fehler:** {{ $errorMessage }}

Bitte überprüfen Sie die Backup-Konfiguration und die Systemprotokolle.

<x-mail::button :url="$dashboardUrl">
 Backup-Verwaltung öffnen
</x-mail::button>

---

<small>Dies ist eine automatisierte Warnmeldung. Bitte reagieren Sie umgehend.</small>
</x-mail::message>
