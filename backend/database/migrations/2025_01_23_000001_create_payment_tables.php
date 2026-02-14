<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('payment_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('shop_orders')->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            
            $table->string('transaction_id')->unique();
            $table->string('gateway')->default('stripe');
            $table->string('gateway_transaction_id')->nullable();
            $table->string('gateway_payment_intent_id')->nullable();
            
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('EUR');
            $table->decimal('fee_amount', 10, 2)->nullable();
            $table->decimal('net_amount', 10, 2)->nullable();
            
            $table->enum('status', [
                'pending',
                'processing',
                'completed',
                'failed',
                'refunded',
                'partially_refunded',
                'cancelled',
                'disputed'
            ])->default('pending');
            
            $table->enum('payment_method', [
                'card',
                'paypal',
                'sepa',
                'sofort',
                'giropay',
                'apple_pay',
                'google_pay',
                'bank_transfer'
            ])->nullable();
            
            $table->json('payment_details')->nullable();
            $table->json('gateway_response')->nullable();
            $table->json('metadata')->nullable();
            
            $table->timestamp('paid_at')->nullable();
            $table->timestamp('failed_at')->nullable();
            $table->timestamp('refunded_at')->nullable();
            $table->text('failure_reason')->nullable();
            $table->text('refund_reason')->nullable();
            $table->decimal('refund_amount', 10, 2)->nullable();
            
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            
            $table->timestamps();
            $table->softDeletes();
            
            $table->index(['order_id', 'status']);
            $table->index(['gateway', 'gateway_transaction_id']);
            $table->index(['user_id', 'status']);
            $table->index('created_at');
        });

        Schema::create('payment_refunds', function (Blueprint $table) {
            $table->id();
            $table->foreignId('transaction_id')->constrained('payment_transactions')->onDelete('cascade');
            $table->foreignId('order_id')->constrained('shop_orders')->onDelete('cascade');
            
            $table->string('refund_id')->unique();
            $table->string('gateway_refund_id')->nullable();
            
            $table->decimal('amount', 10, 2);
            $table->string('currency', 3)->default('EUR');
            
            $table->enum('status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->enum('reason', ['requested_by_customer', 'duplicate', 'fraudulent', 'other'])->default('requested_by_customer');
            $table->text('reason_text')->nullable();
            
            $table->json('gateway_response')->nullable();
            
            $table->foreignId('processed_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('processed_at')->nullable();
            
            $table->timestamps();
            
            $table->index(['transaction_id', 'status']);
            $table->index('order_id');
        });

        Schema::create('payment_webhooks', function (Blueprint $table) {
            $table->id();
            $table->string('gateway');
            $table->string('event_id')->unique();
            $table->string('event_type');
            
            $table->json('payload');
            $table->json('headers')->nullable();
            
            $table->enum('status', ['received', 'processing', 'processed', 'failed'])->default('received');
            $table->text('error_message')->nullable();
            
            $table->integer('attempts')->default(0);
            $table->timestamp('processed_at')->nullable();
            $table->timestamp('next_attempt_at')->nullable();
            
            $table->timestamps();
            
            $table->index(['gateway', 'event_type']);
            $table->index('status');
        });

        Schema::table('shop_orders', function (Blueprint $table) {
            $table->string('payment_method')->nullable()->after('status');
            $table->string('payment_gateway')->nullable()->after('payment_method');
            $table->decimal('payment_fee', 10, 2)->default(0)->after('payment_gateway');
            $table->timestamp('paid_at')->nullable()->after('payment_gateway');
            $table->text('payment_notes')->nullable()->after('paid_at');
        });

        Schema::table('shop_products', function (Blueprint $table) {
            $table->boolean('is_digital')->default(false)->after('stock_quantity');
            $table->string('download_file')->nullable()->after('is_digital');
            $table->integer('download_limit')->nullable()->after('download_file');
            $table->integer('download_expiry_days')->nullable()->after('download_limit');
        });

        Schema::create('product_downloads', function (Blueprint $table) {
            $table->id();
            $table->foreignId('order_id')->constrained('shop_orders')->onDelete('cascade');
            $table->foreignId('product_id')->constrained('shop_products')->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            $table->string('download_token')->unique();
            $table->string('file_path');
            $table->string('file_name');
            
            $table->integer('downloads_count')->default(0);
            $table->integer('max_downloads')->default(5);
            $table->timestamp('expires_at');
            $table->timestamp('last_download_at')->nullable();
            
            $table->timestamps();
            
            $table->index(['order_id', 'product_id']);
            $table->index('download_token');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('product_downloads');
        Schema::table('shop_products', function (Blueprint $table) {
            $table->dropColumn(['is_digital', 'download_file', 'download_limit', 'download_expiry_days']);
        });
        Schema::table('shop_orders', function (Blueprint $table) {
            $table->dropColumn(['payment_method', 'payment_gateway', 'payment_fee', 'paid_at', 'payment_notes']);
        });
        Schema::dropIfExists('payment_webhooks');
        Schema::dropIfExists('payment_refunds');
        Schema::dropIfExists('payment_transactions');
    }
};
