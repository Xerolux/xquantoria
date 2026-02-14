<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Versandbestätigung #{{ $order->order_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; border-radius: 8px 8px 0 0; }
        .header h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
        .content { background: white; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .tracking-box { background: #f0fdf4; border: 2px dashed #10b981; padding: 20px; border-radius: 8px; text-align: center; margin: 24px 0; }
        .tracking-number { font-size: 24px; font-weight: 700; color: #10b981; letter-spacing: 2px; }
        .button { display: inline-block; padding: 14px 28px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 24px 0; }
        .timeline { margin: 24px 0; }
        .timeline-item { display: flex; padding: 16px 0; border-left: 2px solid #e5e7eb; padding-left: 24px; position: relative; margin-left: 12px; }
        .timeline-item.active { border-left-color: #10b981; }
        .timeline-item::before { content: ''; position: absolute; left: -8px; top: 20px; width: 14px; height: 14px; background: #e5e7eb; border-radius: 50%; }
        .timeline-item.active::before { background: #10b981; }
        .timeline-item.completed::before { background: #10b981; }
        .footer { text-align: center; padding: 30px; color: #6b7280; font-size: 12px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>📦 Ihre Bestellung wurde versendet!</h1>
            <p>Sendungsverfolgung verfügbar</p>
        </div>
        
        <div class="content">
            <p>Hallo {{ $order->billing_name ?? $order->user->name ?? 'Kunde' }},</p>
            <br>
            <p>gute Neuigkeiten! Ihre Bestellung <strong>#{{ $order->order_number }}</strong> wurde versendet und ist nun auf dem Weg zu Ihnen.</p>
            
            @if($order->tracking_number)
            <div class="tracking-box">
                <p style="margin-bottom: 8px; color: #6b7280;">Sendungsnummer</p>
                <div class="tracking-number">{{ $order->tracking_number }}</div>
                @if($order->tracking_url)
                <a href="{{ $order->tracking_url }}" class="button" style="margin-top: 16px;">Sendung verfolgen</a>
                @endif
            </div>
            @endif
            
            <div class="timeline">
                <div class="timeline-item completed">
                    <div>
                        <strong>Bestellung eingegangen</strong><br>
                        <span style="color: #6b7280; font-size: 14px;">{{ $order->created_at->format('d.m.Y H:i') }}</span>
                    </div>
                </div>
                <div class="timeline-item completed">
                    <div>
                        <strong>Zahlung bestätigt</strong><br>
                        <span style="color: #6b7280; font-size: 14px;">{{ $order->paid_at?->format('d.m.Y H:i') ?? 'In Bearbeitung' }}</span>
                    </div>
                </div>
                <div class="timeline-item active">
                    <div>
                        <strong>Paket versendet</strong><br>
                        <span style="color: #6b7280; font-size: 14px;">{{ now()->format('d.m.Y H:i') }}</span>
                    </div>
                </div>
                <div class="timeline-item">
                    <div>
                        <strong>zustellung</strong><br>
                        <span style="color: #6b7280; font-size: 14px;">Voraussichtlich {{ $estimatedDelivery ?? 'in 2-3 Werktagen' }}</span>
                    </div>
                </div>
            </div>
            
            <p style="margin-top: 24px;">Die Sendung wird an folgende Adresse geliefert:</p>
            <p style="background: #f8fafc; padding: 16px; border-radius: 8px; margin-top: 8px;">
                {{ $order->shipping_name ?? $order->billing_name }}<br>
                {{ $order->shipping_address ?? $order->billing_address }}<br>
                {{ $order->shipping_postal_code ?? $order->billing_postal_code }} {{ $order->shipping_city ?? $order->billing_city }}
            </p>
            
            <p style="margin-top: 24px;">Bei Fragen erreichen Sie uns unter:</p>
            <p>📧 <a href="mailto:{{ config('mail.from.address') }}">{{ config('mail.from.address') }}</a></p>
            
            <p style="margin-top: 24px;">Herzliche Grüße,<br>Ihr {{ config('app.name') }} Team</p>
        </div>
        
        <div class="footer">
            <p>{{ config('app.name') }} · {{ config('app.address', 'Musterstraße 1, 12345 Musterstadt') }}</p>
        </div>
    </div>
</body>
</html>
