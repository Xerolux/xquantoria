<x-mail::message>
# Willkommen bei {{ $appName }}!

Hallo {{ $user->name }},

vielen Dank für Ihre Registrierung bei {{ $appName }}!

@if($verificationUrl)
Ihre E-Mail-Adresse wurde noch nicht bestätigt. Bitte bestätigen Sie diese, um vollen Zugriff auf alle Funktionen zu erhalten:

<x-mail::button :url="$verificationUrl">
 E-Mail bestätigen
</x-mail::button>
@else
Sie können sich jetzt mit Ihren Zugangsdaten anmelden:

<x-mail::button :url="$loginUrl">
 Jetzt anmelden
</x-mail::button>
@endif

---

Bei Fragen stehen wir Ihnen gerne zur Verfügung.

<small>Diese E-Mail wurde automatisch versendet.</small>
</x-mail::message>
