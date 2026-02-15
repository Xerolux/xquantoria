<x-mail::message>
# 🔐 2-Faktor-Authentifizierung aktiviert

Hallo {{ $user->name }},

die 2-Faktor-Authentifizierung wurde erfolgreich für Ihr Konto aktiviert.

**Aktivierungszeitpunkt:** {{ $timestamp }}

Ab jetzt benötigen Sie bei jeder Anmeldung zusätzlich Ihren Authenticator-Code.

<x-mail::button :url="$securityUrl">
 Sicherheitseinstellungen öffnen
</x-mail::button>

**Wichtig:** Bewahren Sie Ihre Wiederherstellungscodes sicher auf!

---

<small>
 Falls Sie diese Änderung nicht vorgenommen haben, kontaktieren Sie uns umgehend.
</small>
</x-mail::message>
