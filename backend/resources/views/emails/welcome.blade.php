<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Willkommen bei {{ config('app.name') }}</title>
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
            color: #2c3e50;
            margin: 0;
        }
        .content {
            background-color: white;
            padding: 25px;
            border-radius: 6px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .button {
            display: inline-block;
            padding: 12px 30px;
            background-color: #007bff;
            color: white !important;
            text-decoration: none;
            border-radius: 5px;
            margin: 20px 0;
            font-weight: 600;
        }
        .button:hover {
            background-color: #0056b3;
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
            <h1>👋 Herzlich Willkommen!</h1>
        </div>

        <div class="content">
            <p>Hallo {{ $user->name }},</p>

            <p>Wir freuen uns, dich bei {{ config('app.name') }} begrüßen zu dürfen! Dein Konto wurde erfolgreich verifiziert.</p>

            <p>Du kannst dich jetzt einloggen und loslegen.</p>

            <p style="text-align: center;">
                <a href="{{ config('app.frontend_url') }}/login" class="button">Jetzt Einloggen</a>
            </p>

            <p>Falls du Fragen hast, antworte einfach auf diese E-Mail.</p>

            <p>Viele Grüße,<br>Dein {{ config('app.name') }} Team</p>
        </div>

        <div class="footer">
            <p>&copy; {{ date('Y') }} {{ config('app.name') }}. Alle Rechte vorbehalten.</p>
        </div>
    </div>
</body>
</html>
