<x-mail::message>
# Passwort zurücksetzen

Hallo {{ $user->name }},

wir haben eine Anfrage erhalten, Ihr Passwort zurückzusetzen.

<x-mail::button :url="$resetUrl">
 Passwort zurücksetzen
</x-mail::button>

Dieser Link ist für **{{ $expiresInMinutes }} Minuten** gültig.

Falls Sie diese Anfrage nicht gestellt haben, können Sie diese E-Mail ignorieren.

---

<small>
 Aus Sicherheitsgründen empfehlen wir, Ihr Passwort regelmäßig zu ändern.
</small>
</x-mail::message>
