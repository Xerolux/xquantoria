<?php

namespace App\Services\Payment;

use App\Models\PaymentTransaction;
use App\Models\PaymentRefund;
use App\Models\PaymentWebhook;
use App\Models\ShopOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PayPalService
{
    protected string $clientId;
    protected string $clientSecret;
    protected string $baseUrl;
    protected string $webhookId;
    protected string $currency;
    protected bool $testMode;
    protected ?string $accessToken = null;

    public function __construct()
    {
        $this->clientId = config('payment.gateways.paypal.client_id');
        $this->clientSecret = config('payment.gateways.paypal.client_secret');
        $this->testMode = config('payment.gateways.paypal.test_mode', true);
        $this->baseUrl = $this->testMode 
            ? 'https://api-m.sandbox.paypal.com' 
            : 'https://api-m.paypal.com';
        $this->webhookId = config('payment.gateways.paypal.webhook_id');
        $this->currency = config('payment.currency', 'EUR');
    }

    protected function getAccessToken(): string
    {
        if ($this->accessToken) {
            return $this->accessToken;
        }

        $response = Http::withBasicAuth($this->clientId, $this->clientSecret)
            ->asForm()
            ->post("{$this->baseUrl}/v1/oauth2/token", [
                'grant_type' => 'client_credentials',
            ]);

        if (!$response->successful()) {
            Log::error('PayPal Auth Error', ['response' => $response->body()]);
            throw new \Exception('Failed to authenticate with PayPal');
        }

        $this->accessToken = $response->json('access_token');
        return $this->accessToken;
    }

    public function createOrder(ShopOrder $order, array $options = []): array
    {
        try {
            $payload = [
                'intent' => 'CAPTURE',
                'purchase_units' => [
                    [
                        'reference_id' => $order->order_number,
                        'description' => "Order #{$order->order_number}",
                        'amount' => [
                            'currency_code' => $this->currency,
                            'value' => number_format($order->total, 2, '.', ''),
                        ],
                    ],
                ],
                'application_context' => [
                    'return_url' => $options['return_url'] ?? config('app.url') . '/payment/success',
                    'cancel_url' => $options['cancel_url'] ?? config('app.url') . '/payment/cancel',
                    'brand_name' => config('app.name'),
                    'user_action' => 'PAY_NOW',
                ],
            ];

            if (!empty($options['customer_email'])) {
                $payload['payer'] = [
                    'email_address' => $options['customer_email'],
                ];
            }

            $response = Http::withToken($this->getAccessToken())
                ->post("{$this->baseUrl}/v2/checkout/orders", $payload);

            if (!$response->successful()) {
                Log::error('PayPal Create Order Error', [
                    'order_id' => $order->id,
                    'response' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'error' => $response->json('message', 'Failed to create PayPal order'),
                ];
            }

            $data = $response->json();
            $paypalOrderId = $data['id'];

            $transaction = PaymentTransaction::create([
                'order_id' => $order->id,
                'user_id' => $order->user_id,
                'transaction_id' => 'TXN-' . uniqid(),
                'gateway' => 'paypal',
                'gateway_payment_intent_id' => $paypalOrderId,
                'amount' => $order->total,
                'currency' => $this->currency,
                'status' => 'pending',
                'payment_method' => 'paypal',
                'metadata' => [
                    'order_number' => $order->order_number,
                    'customer_email' => $options['customer_email'] ?? null,
                ],
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            $approvalUrl = collect($data['links'])->firstWhere('rel', 'approve');

            return [
                'success' => true,
                'order_id' => $paypalOrderId,
                'transaction_id' => $transaction->transaction_id,
                'approval_url' => $approvalUrl['href'] ?? null,
                'status' => $data['status'],
            ];
        } catch (\Exception $e) {
            Log::error('PayPal Create Order Exception', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    public function captureOrder(string $paypalOrderId): array
    {
        try {
            $response = Http::withToken($this->getAccessToken())
                ->post("{$this->baseUrl}/v2/checkout/orders/{$paypalOrderId}/capture");

            if (!$response->successful()) {
                Log::error('PayPal Capture Error', [
                    'paypal_order_id' => $paypalOrderId,
                    'response' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'error' => $response->json('message', 'Failed to capture payment'),
                ];
            }

            $data = $response->json();
            $transaction = PaymentTransaction::where('gateway_payment_intent_id', $paypalOrderId)->first();

            if ($transaction && $data['status'] === 'COMPLETED') {
                $purchaseUnit = $data['purchase_units'][0] ?? null;
                $capture = $purchaseUnit['payments']['captures'][0] ?? null;

                $transaction->update([
                    'status' => 'completed',
                    'gateway_transaction_id' => $capture['id'] ?? null,
                    'paid_at' => now(),
                    'fee_amount' => $this->parseFee($capture),
                    'net_amount' => $this->parseNet($capture, $transaction->amount),
                    'payment_details' => $data,
                ]);

                $transaction->order->update([
                    'status' => 'processing',
                    'payment_status' => 'paid',
                    'payment_method' => 'paypal',
                    'payment_gateway' => 'paypal',
                    'paid_at' => now(),
                ]);
            }

            return [
                'success' => true,
                'status' => $data['status'],
                'transaction' => $transaction,
            ];
        } catch (\Exception $e) {
            Log::error('PayPal Capture Exception', [
                'paypal_order_id' => $paypalOrderId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    public function getOrderDetails(string $paypalOrderId): array
    {
        try {
            $response = Http::withToken($this->getAccessToken())
                ->get("{$this->baseUrl}/v2/checkout/orders/{$paypalOrderId}");

            if (!$response->successful()) {
                return [
                    'success' => false,
                    'error' => 'Failed to get order details',
                ];
            }

            return [
                'success' => true,
                'data' => $response->json(),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    public function createRefund(PaymentTransaction $transaction, float $amount, string $reason = ''): array
    {
        try {
            $captureId = $transaction->gateway_transaction_id;

            if (!$captureId) {
                return [
                    'success' => false,
                    'error' => 'No capture ID found for refund',
                ];
            }

            $payload = [
                'amount' => [
                    'currency_code' => $transaction->currency,
                    'value' => number_format($amount, 2, '.', ''),
                ],
            ];

            if ($reason) {
                $payload['note'] = $reason;
            }

            $response = Http::withToken($this->getAccessToken())
                ->post("{$this->baseUrl}/v2/payments/captures/{$captureId}/refund", $payload);

            if (!$response->successful()) {
                Log::error('PayPal Refund Error', [
                    'transaction_id' => $transaction->id,
                    'response' => $response->body(),
                ]);

                return [
                    'success' => false,
                    'error' => $response->json('message', 'Failed to process refund'),
                ];
            }

            $data = $response->json();

            $refundRecord = PaymentRefund::create([
                'transaction_id' => $transaction->id,
                'order_id' => $transaction->order_id,
                'refund_id' => 'REF-' . uniqid(),
                'gateway_refund_id' => $data['id'],
                'amount' => $amount,
                'currency' => $transaction->currency,
                'status' => $this->mapRefundStatus($data['status']),
                'reason' => 'requested_by_customer',
                'reason_text' => $reason,
                'gateway_response' => $data,
            ]);

            if ($data['status'] === 'COMPLETED') {
                $transaction->update([
                    'status' => $amount >= $transaction->amount ? 'refunded' : 'partially_refunded',
                    'refunded_at' => now(),
                    'refund_amount' => ($transaction->refund_amount ?? 0) + $amount,
                ]);
            }

            return [
                'success' => true,
                'refund_id' => $data['id'],
                'status' => $data['status'],
                'amount' => $amount,
                'record' => $refundRecord,
            ];
        } catch (\Exception $e) {
            Log::error('PayPal Refund Exception', [
                'transaction_id' => $transaction->id,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    public function handleWebhook(Request $request): array
    {
        $payload = $request->all();
        $headers = $request->headers->all();

        if (!$this->verifyWebhookSignature($payload, $headers)) {
            Log::warning('PayPal Webhook Signature Verification Failed');
        }

        $eventType = $payload['event_type'] ?? 'unknown';
        $eventId = $payload['id'] ?? uniqid();

        $webhook = PaymentWebhook::create([
            'gateway' => 'paypal',
            'event_id' => $eventId,
            'event_type' => $eventType,
            'payload' => $payload,
            'headers' => $headers,
            'status' => 'processing',
        ]);

        try {
            switch ($eventType) {
                case 'CHECKOUT.ORDER.APPROVED':
                    $this->handleOrderApproved($payload);
                    break;

                case 'PAYMENT.CAPTURE.COMPLETED':
                    $this->handleCaptureCompleted($payload);
                    break;

                case 'PAYMENT.CAPTURE.DENIED':
                    $this->handleCaptureDenied($payload);
                    break;

                case 'PAYMENT.CAPTURE.REFUNDED':
                    $this->handlePaymentRefunded($payload);
                    break;

                default:
                    Log::info('Unhandled PayPal Event', ['type' => $eventType]);
            }

            $webhook->update(['status' => 'processed', 'processed_at' => now()]);
            return ['success' => true, 'event' => $eventType];
        } catch (\Exception $e) {
            $webhook->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'attempts' => $webhook->attempts + 1,
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    protected function handleOrderApproved(array $payload): void
    {
        $paypalOrderId = $payload['resource']['id'] ?? null;
        
        if ($paypalOrderId) {
            $transaction = PaymentTransaction::where('gateway_payment_intent_id', $paypalOrderId)->first();
            
            if ($transaction) {
                $transaction->update(['status' => 'processing']);
            }
        }
    }

    protected function handleCaptureCompleted(array $payload): void
    {
        $capture = $payload['resource'] ?? null;
        
        if (!$capture) {
            return;
        }

        $transaction = PaymentTransaction::where('gateway_transaction_id', $capture['id'])->first();

        if (!$transaction) {
            $paypalOrderId = $capture['supplementary_data']['related_ids']['order_id'] ?? null;
            $transaction = PaymentTransaction::where('gateway_payment_intent_id', $paypalOrderId)->first();
        }

        if ($transaction) {
            $transaction->update([
                'status' => 'completed',
                'gateway_transaction_id' => $capture['id'],
                'paid_at' => now(),
                'payment_details' => $capture,
            ]);

            $transaction->order->update([
                'status' => 'processing',
                'payment_status' => 'paid',
                'paid_at' => now(),
            ]);
        }
    }

    protected function handleCaptureDenied(array $payload): void
    {
        $capture = $payload['resource'] ?? null;
        
        if (!$capture) {
            return;
        }

        $transaction = PaymentTransaction::where('gateway_transaction_id', $capture['id'])->first();

        if ($transaction) {
            $transaction->update([
                'status' => 'failed',
                'failed_at' => now(),
                'failure_reason' => 'Payment denied by PayPal',
            ]);

            $transaction->order->update([
                'status' => 'payment_failed',
                'payment_status' => 'failed',
            ]);
        }
    }

    protected function handlePaymentRefunded(array $payload): void
    {
        $refund = $payload['resource'] ?? null;
        
        if (!$refund) {
            return;
        }

        $refundRecord = PaymentRefund::where('gateway_refund_id', $refund['id'])->first();

        if ($refundRecord) {
            $refundRecord->update([
                'status' => 'completed',
                'processed_at' => now(),
            ]);
        }
    }

    protected function verifyWebhookSignature(array $payload, array $headers): bool
    {
        if (empty($this->webhookId)) {
            return true;
        }

        try {
            $response = Http::withToken($this->getAccessToken())
                ->post("{$this->baseUrl}/v1/notifications/verify-webhook-signature", [
                    'webhook_id' => $this->webhookId,
                    'event' => $payload,
                ]);

            return $response->json('verification_status') === 'SUCCESS';
        } catch (\Exception $e) {
            return false;
        }
    }

    protected function parseFee(?array $capture): ?float
    {
        if (!$capture) {
            return null;
        }

        $fee = $capture['seller_receivable_breakdown']['paypal_fee'] ?? null;
        
        if ($fee) {
            return (float) ($fee['value'] ?? 0);
        }

        return null;
    }

    protected function parseNet(?array $capture, float $grossAmount): ?float
    {
        if (!$capture) {
            return null;
        }

        $net = $capture['seller_receivable_breakdown']['net_amount'] ?? null;
        
        if ($net) {
            return (float) ($net['value'] ?? $grossAmount);
        }

        return $grossAmount;
    }

    protected function mapRefundStatus(string $status): string
    {
        return match ($status) {
            'COMPLETED' => 'completed',
            'PENDING' => 'processing',
            'FAILED' => 'failed',
            default => 'pending',
        };
    }

    public function getClientId(): string
    {
        return $this->clientId;
    }

    public function isTestMode(): bool
    {
        return $this->testMode;
    }
}
