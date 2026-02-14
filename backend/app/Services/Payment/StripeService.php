<?php

namespace App\Services\Payment;

use App\Models\PaymentTransaction;
use App\Models\ShopOrder;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Stripe\Stripe;
use Stripe\PaymentIntent;
use Stripe\PaymentMethod;
use Stripe\Refund;
use Stripe\Customer;
use Stripe\Webhook;
use Stripe\Exception\ApiErrorException;

class StripeService
{
    protected string $secretKey;
    protected string $publishableKey;
    protected string $webhookSecret;
    protected string $currency;
    protected bool $testMode;

    public function __construct()
    {
        $this->secretKey = config('payment.gateways.stripe.secret_key');
        $this->publishableKey = config('payment.gateways.stripe.publishable_key');
        $this->webhookSecret = config('payment.gateways.stripe.webhook_secret');
        $this->currency = config('payment.currency', 'EUR');
        $this->testMode = config('payment.gateways.stripe.test_mode', true);

        Stripe::setApiKey($this->secretKey);
        Stripe::setApiVersion('2023-10-16');
    }

    public function getPublishableKey(): string
    {
        return $this->publishableKey;
    }

    public function createPaymentIntent(ShopOrder $order, array $options = []): array
    {
        try {
            $amount = $this->formatAmount($order->total);
            
            $intentData = [
                'amount' => $amount,
                'currency' => strtolower($this->currency),
                'metadata' => [
                    'order_id' => $order->id,
                    'order_number' => $order->order_number,
                    'user_id' => $order->user_id,
                ],
                'description' => "Order #{$order->order_number}",
                'automatic_payment_methods' => [
                    'enabled' => true,
                ],
            ];

            if (!empty($options['customer_email'])) {
                $customer = $this->createOrGetCustomer($options['customer_email'], $options['customer_name'] ?? null);
                $intentData['customer'] = $customer->id;
            }

            if (!empty($options['payment_method_types'])) {
                $intentData['payment_method_types'] = $options['payment_method_types'];
            }

            if (!empty($options['return_url'])) {
                $intentData['return_url'] = $options['return_url'];
            }

            $intent = PaymentIntent::create($intentData);

            $transaction = PaymentTransaction::create([
                'order_id' => $order->id,
                'user_id' => $order->user_id,
                'transaction_id' => 'TXN-' . uniqid(),
                'gateway' => 'stripe',
                'gateway_payment_intent_id' => $intent->id,
                'amount' => $order->total,
                'currency' => $this->currency,
                'status' => 'pending',
                'payment_method' => $this->mapPaymentMethod($options['payment_method_type'] ?? 'card'),
                'metadata' => [
                    'order_number' => $order->order_number,
                    'customer_email' => $options['customer_email'] ?? null,
                ],
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);

            return [
                'success' => true,
                'client_secret' => $intent->client_secret,
                'payment_intent_id' => $intent->id,
                'transaction_id' => $transaction->transaction_id,
                'amount' => $order->total,
                'currency' => $this->currency,
            ];
        } catch (ApiErrorException $e) {
            Log::error('Stripe PaymentIntent Error', [
                'order_id' => $order->id,
                'error' => $e->getMessage(),
                'code' => $e->getStripeCode(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
                'code' => $e->getStripeCode(),
            ];
        }
    }

    public function confirmPayment(string $paymentIntentId): array
    {
        try {
            $intent = PaymentIntent::retrieve($paymentIntentId);

            if ($intent->status === 'succeeded') {
                $transaction = PaymentTransaction::where('gateway_payment_intent_id', $paymentIntentId)->first();

                if ($transaction) {
                    $transaction->update([
                        'status' => 'completed',
                        'gateway_transaction_id' => $intent->latest_charge,
                        'paid_at' => now(),
                        'payment_details' => [
                            'payment_method_types' => $intent->payment_method_types,
                            'charges' => $intent->charges->data ?? [],
                        ],
                    ]);

                    $transaction->order->update([
                        'status' => 'processing',
                        'payment_status' => 'paid',
                        'payment_method' => 'stripe',
                        'payment_gateway' => 'stripe',
                        'paid_at' => now(),
                    ]);
                }

                return [
                    'success' => true,
                    'status' => 'succeeded',
                    'transaction' => $transaction,
                ];
            }

            return [
                'success' => false,
                'status' => $intent->status,
                'message' => 'Payment not completed',
            ];
        } catch (ApiErrorException $e) {
            Log::error('Stripe Confirm Error', [
                'payment_intent_id' => $paymentIntentId,
                'error' => $e->getMessage(),
            ]);

            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    public function createRefund(PaymentTransaction $transaction, float $amount, string $reason = 'requested_by_customer'): array
    {
        try {
            $refund = Refund::create([
                'payment_intent' => $transaction->gateway_payment_intent_id,
                'amount' => $this->formatAmount($amount),
                'reason' => $reason,
                'metadata' => [
                    'order_id' => $transaction->order_id,
                    'transaction_id' => $transaction->transaction_id,
                ],
            ]);

            $refundRecord = \App\Models\PaymentRefund::create([
                'transaction_id' => $transaction->id,
                'order_id' => $transaction->order_id,
                'refund_id' => 'REF-' . uniqid(),
                'gateway_refund_id' => $refund->id,
                'amount' => $amount,
                'currency' => $transaction->currency,
                'status' => $refund->status === 'succeeded' ? 'completed' : 'processing',
                'reason' => $reason,
                'gateway_response' => $refund->toArray(),
            ]);

            if ($refund->status === 'succeeded') {
                $transaction->update([
                    'status' => $amount >= $transaction->amount ? 'refunded' : 'partially_refunded',
                    'refunded_at' => now(),
                    'refund_amount' => ($transaction->refund_amount ?? 0) + $amount,
                ]);
            }

            return [
                'success' => true,
                'refund_id' => $refund->id,
                'status' => $refund->status,
                'amount' => $amount,
                'record' => $refundRecord,
            ];
        } catch (ApiErrorException $e) {
            Log::error('Stripe Refund Error', [
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
        $payload = $request->getContent();
        $signature = $request->header('Stripe-Signature');

        try {
            $event = Webhook::constructEvent($payload, $signature, $this->webhookSecret);
        } catch (\Exception $e) {
            Log::error('Stripe Webhook Signature Error', ['error' => $e->getMessage()]);
            return ['success' => false, 'error' => 'Invalid signature'];
        }

        $webhook = \App\Models\PaymentWebhook::create([
            'gateway' => 'stripe',
            'event_id' => $event->id,
            'event_type' => $event->type,
            'payload' => $event->data->toArray(),
            'headers' => $request->headers->all(),
            'status' => 'processing',
        ]);

        try {
            switch ($event->type) {
                case 'payment_intent.succeeded':
                    $this->handlePaymentSucceeded($event->data->object);
                    break;

                case 'payment_intent.payment_failed':
                    $this->handlePaymentFailed($event->data->object);
                    break;

                case 'charge.refunded':
                    $this->handleRefund($event->data->object);
                    break;

                case 'charge.dispute.created':
                    $this->handleDispute($event->data->object);
                    break;

                default:
                    Log::info('Unhandled Stripe Event', ['type' => $event->type]);
            }

            $webhook->update(['status' => 'processed', 'processed_at' => now()]);
            return ['success' => true, 'event' => $event->type];
        } catch (\Exception $e) {
            $webhook->update([
                'status' => 'failed',
                'error_message' => $e->getMessage(),
                'attempts' => $webhook->attempts + 1,
            ]);

            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    protected function handlePaymentSucceeded(object $paymentIntent): void
    {
        $transaction = PaymentTransaction::where('gateway_payment_intent_id', $paymentIntent->id)->first();

        if (!$transaction) {
            return;
        }

        $transaction->update([
            'status' => 'completed',
            'gateway_transaction_id' => $paymentIntent->latest_charge,
            'paid_at' => now(),
            'fee_amount' => $this->calculateFee($paymentIntent->amount),
            'net_amount' => $this->calculateNet($paymentIntent->amount),
            'payment_details' => [
                'payment_method_types' => $paymentIntent->payment_method_types ?? [],
            ],
        ]);

        $transaction->order->update([
            'status' => 'processing',
            'payment_status' => 'paid',
            'payment_method' => 'stripe',
            'payment_gateway' => 'stripe',
            'paid_at' => now(),
        ]);
    }

    protected function handlePaymentFailed(object $paymentIntent): void
    {
        $transaction = PaymentTransaction::where('gateway_payment_intent_id', $paymentIntent->id)->first();

        if (!$transaction) {
            return;
        }

        $transaction->update([
            'status' => 'failed',
            'failed_at' => now(),
            'failure_reason' => $paymentIntent->last_payment_error?->message ?? 'Unknown error',
        ]);

        $transaction->order->update([
            'status' => 'payment_failed',
            'payment_status' => 'failed',
        ]);
    }

    protected function handleRefund(object $charge): void
    {
        if (empty($charge->refunds)) {
            return;
        }

        foreach ($charge->refunds->data as $stripeRefund) {
            $refundRecord = \App\Models\PaymentRefund::where('gateway_refund_id', $stripeRefund->id)->first();

            if ($refundRecord) {
                $refundRecord->update([
                    'status' => 'completed',
                    'processed_at' => now(),
                ]);
            }
        }
    }

    protected function handleDispute(object $dispute): void
    {
        $charge = $dispute->charge ?? null;
        
        if (!$charge) {
            return;
        }

        $transaction = PaymentTransaction::where('gateway_transaction_id', $charge)->first();

        if ($transaction) {
            $transaction->update([
                'status' => 'disputed',
            ]);

            $transaction->order->update([
                'payment_status' => 'disputed',
            ]);
        }
    }

    protected function createOrGetCustomer(string $email, ?string $name = null): Customer
    {
        $existingCustomers = Customer::all([
            'email' => $email,
            'limit' => 1,
        ]);

        if ($existingCustomers->count() > 0) {
            return $existingCustomers->first();
        }

        return Customer::create([
            'email' => $email,
            'name' => $name ?? $email,
        ]);
    }

    protected function formatAmount(float $amount): int
    {
        $zeroDecimalCurrencies = ['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF'];

        if (in_array(strtoupper($this->currency), $zeroDecimalCurrencies)) {
            return (int) $amount;
        }

        return (int) round($amount * 100);
    }

    protected function calculateFee(int $amount): float
    {
        $feePercent = config('payment.gateways.stripe.fee_percent', 2.9);
        $feeFixed = config('payment.gateways.stripe.fee_fixed', 0.30);
        
        $grossAmount = $amount / 100;
        return round(($grossAmount * $feePercent / 100) + $feeFixed, 2);
    }

    protected function calculateNet(int $amount): float
    {
        $grossAmount = $amount / 100;
        return round($grossAmount - $this->calculateFee($amount), 2);
    }

    protected function mapPaymentMethod(string $type): string
    {
        return match ($type) {
            'card' => 'card',
            'sepa_debit' => 'sepa',
            'sofort' => 'sofort',
            'giropay' => 'giropay',
            'apple_pay' => 'apple_pay',
            'google_pay' => 'google_pay',
            default => 'card',
        };
    }

    public function getPaymentMethods(string $customerId): array
    {
        try {
            $methods = PaymentMethod::all([
                'customer' => $customerId,
                'type' => 'card',
            ]);

            return $methods->data;
        } catch (ApiErrorException $e) {
            return [];
        }
    }

    public function createSetupIntent(string $customerId): array
    {
        try {
            $intent = \Stripe\SetupIntent::create([
                'customer' => $customerId,
            ]);

            return [
                'success' => true,
                'client_secret' => $intent->client_secret,
            ];
        } catch (ApiErrorException $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
