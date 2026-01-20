<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Konto Gesperrt</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 600px;
            margin: 0 auto;
            padding: 20px;
        }
        .container {
            background-color: #f8f9fa;
            border-radius: 8px;
            padding: 30px;
            margin: 20px 0;
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .header h1 {
            color: #dc3545;
            margin: 0;
        }
        .content {
            background-color: white;
            padding: 25px;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .alert-box {
            background-color: #f8d7da;
            color: #721c24;
            border: 1px solid #f5c6cb;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
        }
        .details-box {
            background-color: #e9ecef;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            font-family: monospace;
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #dc3545;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: 600;
        }
        .footer {
            text-align: center;
            color: #6c757d;
            font-size: 14px;
            margin-top: 30px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>⚠️ Konto Gesperrt</h1>
        </div>

        <div class="content">
            <p>Hallo {{ $user->name }},</p>

            <div class="alert-box">
                Dein Konto wurde aufgrund mehrerer fehlgeschlagener Anmeldeversuche vorübergehend gesperrt.
            </div>

            <p>Wir haben verdächtige Aktivitäten festgestellt. Zu deiner Sicherheit haben wir den Zugriff für <strong>30 Minuten</strong> deaktiviert.</p>

            <div class="details-box">
                <strong>Zeitpunkt:</strong> {{ $time }}<br>
                <strong>IP-Adresse:</strong> {{ $ip }}
            </div>

            <p>Falls du das warst, kannst du es nach Ablauf der Sperrfrist erneut versuchen.</p>

            <p>Falls du <strong>nicht</strong> versucht hast dich einzuloggen, empfehlen wir dir dringend, dein Passwort sofort zurückzusetzen:</p>

            <p style="text-align: center;">
                <a href="{{ config('app.frontend_url') }}/forgot-password" class="button">Passwort zurücksetzen</a>
            </p>

            <p>Falls du sofortige Hilfe benötigst, kontaktiere bitte den Support.</p>
        </div>

        <div class="footer">
            <p>&copy; {{ date('Y') }} {{ config('app.name') }}. Alle Rechte vorbehalten.</p>
        </div>
    </div>
</body>
</html>
