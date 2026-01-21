Security Alert: Account Temporarily Locked

Hello {{ $userName }},

We detected multiple failed login attempts to your account, and as a security measure, your account has been temporarily locked.

WHAT HAPPENED:
- Multiple invalid login attempts were detected
- Your account has been locked for {{ $lockoutTime }} minutes
- This protects your account from unauthorized access

You can unlock your account by:
1. Visit the URL below to request a password reset
2. Follow the instructions in the reset email
3. Create a new, strong password

{{ $unlockUrl }}

SECURITY RECOMMENDATIONS:
- Use a strong password (minimum 12 characters)
- Enable two-factor authentication
- Don't share your password with anyone
- Ensure your device is free from malware

If you didn't attempt to login to your account, please contact our support team immediately.

Best regards,
The {{ config('app.name') }} Security Team

---
© {{ date('Y') }} {{ config('app.name') }}. All rights reserved.
