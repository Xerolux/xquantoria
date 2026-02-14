<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Rückerstattung für Bestellung #{{ $order->order_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: white; border-radius: 8px 8px 0 0; }
        .content { background: white; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .refund-box { background: #fffbeb; border: 2px solid #f59e0b; padding: 24px; border-radius: 8px; text-align: center; margin: 24px 0; }
        .refund-amount { font-size: 32px; font-weight: 700; color: #d97706; }
        .info-table { width: 100%; margin: 20px 0; }
        .info-table td { padding: 12px 0; border-bottom: 1px solid #e5e7eb; }
        .info-table td:first-child { color: #6b7280; }
        .info-table td:last-child { text-align: right; font-weight: 500; }
        .footer { text-align: center; padding: 30px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>💰 Rückerstattung bearbeitet</h1>
            <p>Ihre Rückerstattung wurde verarbeitet</p>
        </div>
        
        <div class="content">
            <p>Hallo {{ $order->billing_name ?? $order->user->name ?? 'Kunde' }},</p>
            <br>
            <p>wir haben Ihre Rückerstattung für die Bestellung <strong>#{{ $order->order_number }}</strong> bearbeitet.</p>
            
            <div class="refund-box">
                <p style="margin-bottom: 8px; color: #92400e;">Rückerstattungsbetrag</p>
                <div class="refund-amount">{{ number_format($refund->amount, 2, ',', '.') }} {{ $refund->currency }}</div>
                <p style="margin-top: 12px; font-size: 14px; color: #92400e;">
                    Die Gutschrift erscheint in {{ $refund->processing_days ?? '3-5' }} Werktagen auf Ihrem Konto.
                </p>
            </div>
            
            <table class="info-table">
                <tr>
                    <td>Bestellnummer</td>
                    <td>#{{ $order->order_number }}</td>
                </tr>
                <tr>
                    <td>Rückerstattungs-ID</td>
                    <td>{{ $refund->refund_id }}</td>
                </tr>
                <tr>
                    <td>Grund</td>
                    <td>{{ $refund->reason_text ?? $refund->reason_label ?? 'Auf Kundenwunsch' }}</td>
                </tr>
                <tr>
                    <td>Zahlungsmethode</td>
                    <td>{{ ucfirst($order->payment_method) }}</td>
                </tr>
                <tr>
                    <td>Bearbeitungsdatum</td>
                    <td>{{ $refund->created_at->format('d.m.Y H:i') }}</td>
                </tr>
            </table>
            
            @if($refund->status === 'completed')
            <p style="background: #dcfce7; color: #166534; padding: 16px; border-radius: 8px;">
                ✅ Die Rückerstattung wurde erfolgreich an Ihren Zahlungsdienstleister übermittelt.
            </p>
            @elseif($refund->status === 'processing')
            <p style="background: #fef3c7; color: #92400e; padding: 16px; border-radius: 8px;">
                ⏳ Die Rückerstattung wird derzeit verarbeitet.
            </p>
            @endif
            
            <p style="margin-top: 24px;">Bei Fragen zur Rückerstattung erreichen Sie uns unter:</p>
            <p>📧 <a href="mailto:{{ config('mail.from.address') }}">{{ config('mail.from.address') }}</a></p>
            
            <p style="margin-top: 24px;">Herzliche Grüße,<br>Ihr {{ config('app.name') }} Team</p>
        </div>
        
        <div class="footer">
            <p>{{ config('app.name') }} · {{ config('app.address', 'Musterstraße 1, 12345 Musterstadt') }}</p>
        </div>
    </div>
</body>
</html>
