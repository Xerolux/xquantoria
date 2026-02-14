<!DOCTYPE html>
<html lang="de">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Bestellbestätigung #{{ $order->order_number }}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f4f5; color: #18181b; line-height: 1.6; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { text-align: center; padding: 40px 20px; background: linear-gradient(135deg, #1890ff 0%, #096dd9 100%); color: white; border-radius: 8px 8px 0 0; }
        .header h1 { font-size: 24px; font-weight: 600; margin-bottom: 8px; }
        .header p { opacity: 0.9; font-size: 14px; }
        .content { background: white; padding: 40px 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.05); }
        .order-info { background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 24px; }
        .order-info h2 { font-size: 16px; margin-bottom: 12px; color: #374151; }
        .info-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #e5e7eb; }
        .info-row:last-child { border-bottom: none; }
        .info-label { color: #6b7280; }
        .info-value { font-weight: 500; }
        .items-table { width: 100%; border-collapse: collapse; margin: 24px 0; }
        .items-table th { text-align: left; padding: 12px 8px; border-bottom: 2px solid #e5e7eb; color: #6b7280; font-size: 12px; text-transform: uppercase; }
        .items-table td { padding: 16px 8px; border-bottom: 1px solid #e5e7eb; }
        .items-table .product-name { font-weight: 500; }
        .items-table .text-right { text-align: right; }
        .totals { margin-left: auto; max-width: 250px; }
        .total-row { display: flex; justify-content: space-between; padding: 8px 0; }
        .total-row.grand-total { font-size: 18px; font-weight: 600; border-top: 2px solid #18181b; padding-top: 16px; margin-top: 8px; }
        .button { display: inline-block; padding: 14px 28px; background: #1890ff; color: white; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 24px 0; }
        .footer { text-align: center; padding: 30px; color: #6b7280; font-size: 12px; }
        .footer a { color: #1890ff; text-decoration: none; }
        .status-badge { display: inline-block; padding: 4px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; }
        .status-paid { background: #dcfce7; color: #166534; }
        .address-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 24px 0; }
        .address-box h3 { font-size: 14px; color: #6b7280; margin-bottom: 8px; }
        .address-box p { font-size: 14px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🎉 Vielen Dank für Ihre Bestellung!</h1>
            <p>Ihre Bestellung wurde erfolgreich aufgegeben</p>
        </div>
        
        <div class="content">
            <p>Hallo {{ $order->billing_name ?? $order->user->name ?? 'Kunde' }},</p>
            <br>
            <p>vielen Dank für Ihre Bestellung bei <strong>{{ config('app.name') }}</strong>! Wir haben Ihre Bestellung erhalten und werden diese schnellstmöglich bearbeiten.</p>
            
            <div class="order-info">
                <h2>📋 Bestelldetails</h2>
                <div class="info-row">
                    <span class="info-label">Bestellnummer</span>
                    <span class="info-value">#{{ $order->order_number }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Bestelldatum</span>
                    <span class="info-value">{{ $order->created_at->format('d.m.Y H:i') }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Zahlungsart</span>
                    <span class="info-value">{{ ucfirst($order->payment_method ?? 'Offen') }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">Status</span>
                    <span class="info-value">
                        <span class="status-badge status-paid">{{ ucfirst($order->status) }}</span>
                    </span>
                </div>
            </div>
            
            <div class="address-grid">
                <div class="address-box">
                    <h3>Rechnungsadresse</h3>
                    <p>
                        {{ $order->billing_name }}<br>
                        {{ $order->billing_address }}<br>
                        {{ $order->billing_postal_code }} {{ $order->billing_city }}<br>
                        {{ $order->billing_country }}
                    </p>
                </div>
                @if($order->shipping_address)
                <div class="address-box">
                    <h3>Lieferadresse</h3>
                    <p>
                        {{ $order->shipping_name }}<br>
                        {{ $order->shipping_address }}<br>
                        {{ $order->shipping_postal_code }} {{ $order->shipping_city }}<br>
                        {{ $order->shipping_country }}
                    </p>
                </div>
                @endif
            </div>
            
            <table class="items-table">
                <thead>
                    <tr>
                        <th>Produkt</th>
                        <th class="text-right">Menge</th>
                        <th class="text-right">Preis</th>
                        <th class="text-right">Summe</th>
                    </tr>
                </thead>
                <tbody>
                    @foreach($order->items as $item)
                    <tr>
                        <td>
                            <div class="product-name">{{ $item->product_name }}</div>
                            @if($item->variant_name)
                            <div style="color: #6b7280; font-size: 12px;">{{ $item->variant_name }}</div>
                            @endif
                        </td>
                        <td class="text-right">{{ $item->quantity }}</td>
                        <td class="text-right">{{ number_format($item->price, 2, ',', '.') }} €</td>
                        <td class="text-right">{{ number_format($item->total, 2, ',', '.') }} €</td>
                    </tr>
                    @endforeach
                </tbody>
            </table>
            
            <div class="totals">
                <div class="total-row">
                    <span>Zwischensumme</span>
                    <span>{{ number_format($order->subtotal, 2, ',', '.') }} €</span>
                </div>
                @if($order->discount > 0)
                <div class="total-row" style="color: #16a34a;">
                    <span>Rabatt</span>
                    <span>-{{ number_format($order->discount, 2, ',', '.') }} €</span>
                </div>
                @endif
                <div class="total-row">
                    <span>Versand</span>
                    <span>{{ $order->shipping_cost > 0 ? number_format($order->shipping_cost, 2, ',', '.').' €' : 'Kostenlos' }}</span>
                </div>
                <div class="total-row">
                    <span>MwSt. ({{ $order->tax_rate ?? 19 }}%)</span>
                    <span>{{ number_format($order->tax, 2, ',', '.') }} €</span>
                </div>
                <div class="total-row grand-total">
                    <span>Gesamtsumme</span>
                    <span>{{ number_format($order->total, 2, ',', '.') }} €</span>
                </div>
            </div>
            
            <div style="text-align: center;">
                <a href="{{ route('orders.show', $order->id) }}" class="button">Bestellung anzeigen</a>
            </div>
            
            <p>Bei Fragen zu Ihrer Bestellung erreichen Sie uns unter:</p>
            <p>
                📧 <a href="mailto:{{ config('mail.from.address') }}">{{ config('mail.from.address') }}</a><br>
                📞 {{ config('app.phone', '+49 123 456789') }}
            </p>
            
            <p style="margin-top: 24px;">Herzliche Grüße,<br>Ihr {{ config('app.name') }} Team</p>
        </div>
        
        <div class="footer">
            <p>
                {{ config('app.name') }} · {{ config('app.address', 'Musterstraße 1, 12345 Musterstadt') }}
            </p>
            <p style="margin-top: 12px;">
                <a href="{{ route('privacy') }}">Datenschutz</a> · 
                <a href="{{ route('terms') }}">AGB</a> · 
                <a href="{{ route('imprint') }}">Impressum</a>
            </p>
        </div>
    </div>
</body>
</html>
