<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ShopProduct;
use App\Models\ShopProductCategory;
use App\Models\ShopCart;
use App\Models\ShopCoupon;
use App\Models\ShopOrder;
use App\Models\ShopOrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;

class ShopController extends Controller
{
    public function products(Request $request): JsonResponse
    {
        $query = ShopProduct::with(['category', 'featuredImage', 'tags'])
            ->active();

        if ($request->has('category')) {
            $query->where('category_id', $request->category);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhere('sku', 'like', "%{$search}%");
            });
        }

        if ($request->has('featured')) {
            $query->featured();
        }

        if ($request->has('on_sale')) {
            $query->onSale();
        }

        if ($request->has('in_stock')) {
            $query->inStock();
        }

        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }

        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $query->orderBy($sortBy, $sortOrder);

        $products = $query->paginate($request->get('per_page', 15));

        return response()->json($products);
    }

    public function product(string $slug): JsonResponse
    {
        $product = ShopProduct::with(['category', 'featuredImage', 'tags', 'reviews.user'])
            ->where('slug', $slug)
            ->active()
            ->firstOrFail();

        $product->average_rating = $product->getAverageRating();
        $product->review_count = $product->getReviewCount();

        return response()->json($product);
    }

    public function categories(Request $request): JsonResponse
    {
        $categories = ShopProductCategory::with(['parent', 'children', 'image'])
            ->active()
            ->orderBy('sort_order')
            ->get();

        return response()->json($categories);
    }

    public function category(string $slug, Request $request): JsonResponse
    {
        $category = ShopProductCategory::where('slug', $slug)
            ->active()
            ->firstOrFail();

        $products = ShopProduct::with(['featuredImage'])
            ->where('category_id', $category->id)
            ->active()
            ->paginate($request->get('per_page', 15));

        return response()->json([
            'category' => $category,
            'products' => $products,
        ]);
    }

    public function getCart(Request $request): JsonResponse
    {
        $cart = $this->getOrCreateCart($request);

        return response()->json([
            'items' => $cart->items ?? [],
            'subtotal' => $cart->getSubtotal(),
            'item_count' => $cart->getItemCount(),
        ]);
    }

    public function addToCart(Request $request): JsonResponse
    {
        $request->validate([
            'product_id' => 'required|exists:shop_products,id',
            'quantity' => 'integer|min:1|max:99',
            'attributes' => 'array',
        ]);

        $product = ShopProduct::active()->findOrFail($request->product_id);

        if (!$product->isInStock()) {
            return response()->json(['message' => 'Produkt ist nicht verfügbar'], 400);
        }

        $cart = $this->getOrCreateCart($request);
        $cart->addItem(
            $request->product_id,
            $request->get('quantity', 1),
            $request->get('attributes', [])
        );

        return response()->json([
            'message' => 'Produkt zum Warenkorb hinzugefügt',
            'items' => $cart->items ?? [],
            'subtotal' => $cart->getSubtotal(),
            'item_count' => $cart->getItemCount(),
        ]);
    }

    public function updateCartItem(Request $request): JsonResponse
    {
        $request->validate([
            'key' => 'required|string',
            'quantity' => 'required|integer|min:0|max:99',
        ]);

        $cart = $this->getOrCreateCart($request);
        $cart->updateItem($request->key, $request->quantity);

        return response()->json([
            'items' => $cart->items ?? [],
            'subtotal' => $cart->getSubtotal(),
            'item_count' => $cart->getItemCount(),
        ]);
    }

    public function removeFromCart(Request $request): JsonResponse
    {
        $request->validate([
            'key' => 'required|string',
        ]);

        $cart = $this->getOrCreateCart($request);
        $cart->removeItem($request->key);

        return response()->json([
            'items' => $cart->items ?? [],
            'subtotal' => $cart->getSubtotal(),
            'item_count' => $cart->getItemCount(),
        ]);
    }

    public function clearCart(Request $request): JsonResponse
    {
        $cart = $this->getOrCreateCart($request);
        $cart->clear();

        return response()->json([
            'message' => 'Warenkorb geleert',
            'items' => [],
            'subtotal' => 0,
            'item_count' => 0,
        ]);
    }

    public function applyCoupon(Request $request): JsonResponse
    {
        $request->validate([
            'code' => 'required|string',
        ]);

        $coupon = ShopCoupon::where('code', strtoupper($request->code))->first();

        if (!$coupon || !$coupon->isValid()) {
            return response()->json(['message' => 'Gutscheincode ist ungültig oder abgelaufen'], 400);
        }

        $cart = $this->getOrCreateCart($request);
        $subtotal = $cart->getSubtotal();

        if ($coupon->min_order_value && $subtotal < $coupon->min_order_value) {
            return response()->json([
                'message' => "Mindestbestellwert von {$coupon->min_order_value} EUR nicht erreicht",
            ], 400);
        }

        $discount = $coupon->calculateDiscount($subtotal);

        return response()->json([
            'coupon' => [
                'code' => $coupon->code,
                'type' => $coupon->type,
                'value' => $coupon->value,
                'discount' => $discount,
                'free_shipping' => $coupon->free_shipping,
            ],
            'discount' => $discount,
        ]);
    }

    public function checkout(Request $request): JsonResponse
    {
        $request->validate([
            'billing_address.first_name' => 'required|string',
            'billing_address.last_name' => 'required|string',
            'billing_address.email' => 'required|email',
            'billing_address.phone' => 'nullable|string',
            'billing_address.street' => 'required|string',
            'billing_address.city' => 'required|string',
            'billing_address.postcode' => 'required|string',
            'billing_address.country' => 'required|string',
            'shipping_address' => 'nullable|array',
            'payment_method' => 'required|string',
            'customer_notes' => 'nullable|string',
            'coupon_code' => 'nullable|string',
        ]);

        $cart = $this->getOrCreateCart($request);

        if (empty($cart->items)) {
            return response()->json(['message' => 'Warenkorb ist leer'], 400);
        }

        DB::beginTransaction();
        try {
            $subtotal = $cart->getSubtotal();
            $discount = 0;
            $coupon = null;

            if ($request->coupon_code) {
                $coupon = ShopCoupon::where('code', strtoupper($request->coupon_code))->first();
                if ($coupon && $coupon->isValid()) {
                    $discount = $coupon->calculateDiscount($subtotal);
                    $coupon->incrementUsage();
                }
            }

            $tax = round($subtotal * 0.19, 2);
            $shipping = $subtotal >= 50 ? 0 : 4.99;
            $total = $subtotal + $tax + $shipping - $discount;

            $order = ShopOrder::create([
                'user_id' => Auth::id(),
                'status' => ShopOrder::STATUS_PENDING,
                'payment_status' => ShopOrder::PAYMENT_PENDING,
                'payment_method' => $request->payment_method,
                'subtotal' => $subtotal,
                'tax' => $tax,
                'shipping' => $shipping,
                'discount' => $discount,
                'total' => $total,
                'currency' => 'EUR',
                'billing_address' => $request->billing_address,
                'shipping_address' => $request->shipping_address ?? $request->billing_address,
                'customer_notes' => $request->customer_notes,
            ]);

            foreach ($cart->items ?? [] as $item) {
                $product = ShopProduct::find($item['product_id']);
                if ($product) {
                    ShopOrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $product->id,
                        'product_name' => $product->name,
                        'product_sku' => $product->sku,
                        'quantity' => $item['quantity'],
                        'price' => $item['price'],
                        'tax' => round($item['price'] * $item['quantity'] * 0.19, 2),
                        'total' => $item['price'] * $item['quantity'],
                        'attributes' => $item['attributes'] ?? [],
                    ]);

                    if ($product->manage_stock) {
                        $product->decrement('stock_quantity', $item['quantity']);
                    }
                }
            }

            $cart->clear();

            DB::commit();

            return response()->json([
                'message' => 'Bestellung erfolgreich erstellt',
                'order' => $order->load('items'),
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Fehler beim Erstellen der Bestellung'], 500);
        }
    }

    public function orders(Request $request): JsonResponse
    {
        $query = ShopOrder::with(['items'])
            ->when(Auth::user()->role !== 'super_admin' && Auth::user()->role !== 'admin', function ($q) {
                $q->where('user_id', Auth::id());
            })
            ->recent();

        if ($request->has('status')) {
            $query->byStatus($request->status);
        }

        $orders = $query->paginate($request->get('per_page', 15));

        return response()->json($orders);
    }

    public function order(int $id): JsonResponse
    {
        $order = ShopOrder::with(['items.product', 'user'])
            ->when(Auth::user()->role !== 'super_admin' && Auth::user()->role !== 'admin', function ($q) {
                $q->where('user_id', Auth::id());
            })
            ->findOrFail($id);

        return response()->json($order);
    }

    public function updateOrderStatus(Request $request, int $id): JsonResponse
    {
        $request->validate([
            'status' => 'required|string|in:pending,processing,on_hold,completed,cancelled,refunded,failed',
        ]);

        $order = ShopOrder::findOrFail($id);
        $order->update(['status' => $request->status]);

        if ($request->status === ShopOrder::STATUS_COMPLETED) {
            $order->update(['delivered_at' => now()]);
        }

        return response()->json([
            'message' => 'Bestellstatus aktualisiert',
            'order' => $order->fresh(),
        ]);
    }

    private function getOrCreateCart(Request $request): ShopCart
    {
        if (Auth::check()) {
            return ShopCart::firstOrCreate(
                ['user_id' => Auth::id()],
                ['items' => [], 'currency' => 'EUR']
            );
        }

        $sessionId = $request->session()->getId();
        return ShopCart::firstOrCreate(
            ['session_id' => $sessionId],
            ['items' => [], 'currency' => 'EUR']
        );
    }
}
