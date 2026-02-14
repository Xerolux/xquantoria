<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\PaymentTransaction;
use App\Models\PaymentRefund;
use App\Models\ShopOrder;
use App\Services\Payment\StripeService;
use App\Services\Payment\PayPalService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaymentController extends Controller
{
    protected StripeService $stripeService;
    protected PayPalService $paypalService;

    public function __construct(StripeService $stripeService, PayPalService $paypalService)
    {
        $this->stripeService = $stripeService;
        $this->paypalService = $paypalService;
    }

    public function getConfig(): JsonResponse
    {
        return response()->json([
            'stripe' => [
                'enabled' => config('payment.gateways.stripe.enabled', false),
                'publishable_key' => config('payment.gateways.stripe.publishable_key'),
                'test_mode' => config('payment.gateways.stripe.test_mode', true),
            ],
            'paypal' => [
                'enabled' => config('payment.gateways.paypal.enabled', false),
                'client_id' => config('payment.gateways.paypal.client_id'),
                'test_mode' => config('payment.gateways.paypal.test_mode', true),
            ],
            'currency' => config('payment.currency', 'EUR'),
            'tax_rate' => config('payment.tax_rate', 19),
        ]);
    }

    public function createStripeIntent(Request $request): JsonResponse
    {
        $request->validate([
            'order_id' => 'required|exists:shop_orders,id',
            'return_url' => 'nullable|url',
            'payment_method_types' => 'nullable|array',
        ]);

        $order = ShopOrder::findOrFail($request->order_id);

        if ($order->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Order cannot be paid',
            ], 400);
        }

        $result = $this->stripeService->createPaymentIntent($order, [
            'return_url' => $request->return_url,
            'payment_method_types' => $request->payment_method_types,
            'customer_email' => $order->billing_email ?? $order->user?->email,
            'customer_name' => $order->billing_name ?? $order->user?->name,
        ]);

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['error'],
            ], 400);
        }

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    public function confirmStripePayment(Request $request): JsonResponse
    {
        $request->validate([
            'payment_intent_id' => 'required|string',
        ]);

        $result = $this->stripeService->confirmPayment($request->payment_intent_id);

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['error'] ?? 'Payment confirmation failed',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment confirmed successfully',
            'order' => $result['transaction']?->order,
        ]);
    }

    public function createPayPalOrder(Request $request): JsonResponse
    {
        $request->validate([
            'order_id' => 'required|exists:shop_orders,id',
            'return_url' => 'nullable|url',
            'cancel_url' => 'nullable|url',
        ]);

        $order = ShopOrder::findOrFail($request->order_id);

        if ($order->status !== 'pending') {
            return response()->json([
                'success' => false,
                'message' => 'Order cannot be paid',
            ], 400);
        }

        $result = $this->paypalService->createOrder($order, [
            'return_url' => $request->return_url,
            'cancel_url' => $request->cancel_url,
            'customer_email' => $order->billing_email ?? $order->user?->email,
        ]);

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['error'],
            ], 400);
        }

        return response()->json([
            'success' => true,
            'data' => $result,
        ]);
    }

    public function capturePayPalOrder(Request $request): JsonResponse
    {
        $request->validate([
            'paypal_order_id' => 'required|string',
        ]);

        $result = $this->paypalService->captureOrder($request->paypal_order_id);

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['error'] ?? 'Payment capture failed',
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Payment captured successfully',
            'order' => $result['transaction']?->order,
        ]);
    }

    public function stripeWebhook(Request $request): JsonResponse
    {
        $result = $this->stripeService->handleWebhook($request);

        if (!$result['success']) {
            return response()->json([
                'error' => $result['error'],
            ], 400);
        }

        return response()->json(['received' => true]);
    }

    public function paypalWebhook(Request $request): JsonResponse
    {
        $result = $this->paypalService->handleWebhook($request);

        if (!$result['success']) {
            return response()->json([
                'error' => $result['error'],
            ], 400);
        }

        return response()->json(['received' => true]);
    }

    public function getTransactions(Request $request): JsonResponse
    {
        $query = PaymentTransaction::with(['order', 'user'])
            ->orderBy('created_at', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('gateway')) {
            $query->where('gateway', $request->gateway);
        }

        if ($request->has('order_id')) {
            $query->where('order_id', $request->order_id);
        }

        if ($request->has('date_from')) {
            $query->whereDate('created_at', '>=', $request->date_from);
        }

        if ($request->has('date_to')) {
            $query->whereDate('created_at', '<=', $request->date_to);
        }

        $transactions = $query->paginate($request->per_page ?? 15);

        return response()->json($transactions);
    }

    public function getTransaction(string $id): JsonResponse
    {
        $transaction = PaymentTransaction::with(['order.items.product', 'user', 'refunds'])
            ->findOrFail($id);

        return response()->json($transaction);
    }

    public function createRefund(Request $request): JsonResponse
    {
        $request->validate([
            'transaction_id' => 'required|exists:payment_transactions,id',
            'amount' => 'required|numeric|min:0.01',
            'reason' => 'nullable|string|in:requested_by_customer,duplicate,fraudulent,other',
            'reason_text' => 'nullable|string|max:500',
        ]);

        $transaction = PaymentTransaction::findOrFail($request->transaction_id);

        if (!$transaction->isRefundable()) {
            return response()->json([
                'success' => false,
                'message' => 'Transaction cannot be refunded',
            ], 400);
        }

        $maxRefundable = $transaction->amount - ($transaction->refund_amount ?? 0);
        
        if ($request->amount > $maxRefundable) {
            return response()->json([
                'success' => false,
                'message' => "Maximum refundable amount is {$maxRefundable}",
            ], 400);
        }

        $reason = $request->reason ?? 'requested_by_customer';

        $result = match ($transaction->gateway) {
            'stripe' => $this->stripeService->createRefund($transaction, $request->amount, $reason),
            'paypal' => $this->paypalService->createRefund($transaction, $request->amount, $request->reason_text ?? ''),
            default => ['success' => false, 'error' => 'Unknown payment gateway'],
        };

        if (!$result['success']) {
            return response()->json([
                'success' => false,
                'message' => $result['error'],
            ], 400);
        }

        return response()->json([
            'success' => true,
            'message' => 'Refund processed successfully',
            'refund' => $result['record'],
        ]);
    }

    public function getRefunds(Request $request): JsonResponse
    {
        $query = PaymentRefund::with(['transaction', 'order', 'processor'])
            ->orderBy('created_at', 'desc');

        if ($request->has('status')) {
            $query->where('status', $request->status);
        }

        if ($request->has('order_id')) {
            $query->where('order_id', $request->order_id);
        }

        $refunds = $query->paginate($request->per_page ?? 15);

        return response()->json($refunds);
    }

    public function getStats(): JsonResponse
    {
        $totalRevenue = PaymentTransaction::completed()->sum('amount');
        $totalFees = PaymentTransaction::completed()->sum('fee_amount');
        $totalRefunds = PaymentRefund::completed()->sum('amount');
        
        $transactionsByGateway = PaymentTransaction::completed()
            ->selectRaw('gateway, COUNT(*) as count, SUM(amount) as total')
            ->groupBy('gateway')
            ->get()
            ->keyBy('gateway');

        $transactionsByStatus = PaymentTransaction::selectRaw('status, COUNT(*) as count')
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        $recentTransactions = PaymentTransaction::with(['order'])
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        return response()->json([
            'total_revenue' => $totalRevenue,
            'total_fees' => $totalFees,
            'total_refunds' => $totalRefunds,
            'net_revenue' => $totalRevenue - $totalFees - $totalRefunds,
            'by_gateway' => $transactionsByGateway,
            'by_status' => $transactionsByStatus,
            'recent_transactions' => $recentTransactions,
            'transaction_count' => PaymentTransaction::count(),
            'refund_count' => PaymentRefund::count(),
        ]);
    }
}
