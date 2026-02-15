<x-mail::message>
# Backup erfolgreich erstellt

Das Backup wurde erfolgreich erstellt:

**Name:** {{ $backup->name }}<br>
**Typ:** {{ $backup->type }}<br>
**Größe:** {{ $size }}<br>
**Erstellt:** {{ $backup->created_at->format('d.m.Y H:i:s') }}

<x-mail::button :url="$downloadUrl">
 Backup herunterladen
</x-mail::button>

---

<small>Dies ist eine automatisierte Benachrichtigung des {{ $backup->type }} Backups.</small>
</x-mail::message>
