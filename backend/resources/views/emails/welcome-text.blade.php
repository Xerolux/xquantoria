Welcome to {{ config('app.name') }}!

Hello {{ $userName }},

Welcome to {{ config('app.name') }}! We're thrilled to have you on board.

Your account has been successfully created and is ready to use. You can login here:

{{ $loginUrl }}

Security Tips:
- Use a strong, unique password
- Enable two-factor authentication (recommended)
- Keep your login credentials secure

If you have any questions or need assistance, please don't hesitate to reach out to our support team.

Best regards,
The {{ config('app.name') }} Team

---
© {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
