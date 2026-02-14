<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_accounts', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            $table->string('provider');
            $table->string('provider_id');
            $table->string('name')->nullable();
            $table->string('email')->nullable();
            $table->string('avatar')->nullable();
            $table->string('nickname')->nullable();
            
            $table->text('token')->nullable();
            $table->text('refresh_token')->nullable();
            $table->timestamp('expires_at')->nullable();
            $table->json('raw')->nullable();
            
            $table->timestamps();
            
            $table->unique(['provider', 'provider_id']);
            $table->index('user_id');
        });

        Schema::create('push_subscriptions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            
            $table->string('endpoint')->unique();
            $table->string('p256dh_key');
            $table->string('auth_token');
            $table->string('user_agent')->nullable();
            $table->string('ip_address', 45)->nullable();
            
            $table->boolean('enabled')->default(true);
            $table->timestamp('subscribed_at');
            $table->timestamp('last_notified_at')->nullable();
            
            $table->timestamps();
            
            $table->index(['user_id', 'enabled']);
        });

        Schema::create('ab_tests', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('description')->nullable();
            
            $table->enum('status', ['draft', 'running', 'paused', 'completed'])->default('draft');
            
            $table->string('target_type')->default('ad');
            $table->unsignedBigInteger('target_id')->nullable();
            
            $table->json('variants');
            $table->string('traffic_allocation')->default('50');
            
            $table->timestamp('starts_at')->nullable();
            $table->timestamp('ends_at')->nullable();
            
            $table->foreignId('created_by')->constrained('users')->onDelete('cascade');
            
            $table->timestamps();
        });

        Schema::create('ab_test_impressions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ab_test_id')->constrained()->onDelete('cascade');
            
            $table->string('variant');
            $table->string('session_id');
            $table->unsignedBigInteger('user_id')->nullable();
            
            $table->string('ip_address', 45)->nullable();
            $table->string('user_agent')->nullable();
            
            $table->timestamps();
            
            $table->index(['ab_test_id', 'variant']);
            $table->index('session_id');
        });

        Schema::create('ab_test_conversions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ab_test_id')->constrained()->onDelete('cascade');
            $table->foreignId('impression_id')->constrained('ab_test_impressions')->onDelete('cascade');
            
            $table->string('variant');
            $table->string('conversion_type')->default('click');
            $table->decimal('value', 10, 2)->nullable();
            
            $table->timestamps();
            
            $table->index(['ab_test_id', 'variant']);
        });

        Schema::create('notification_templates', function (Blueprint $table) {
            $table->id();
            $table->string('name')->unique();
            $table->string('type');
            $table->string('subject');
            $table->text('body');
            $table->json('variables')->nullable();
            
            $table->boolean('is_active')->default(true);
            
            $table->timestamps();
        });

        Schema::create('sent_notifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('set null');
            $table->foreignId('template_id')->nullable()->constrained('notification_templates')->onDelete('set null');
            
            $table->string('channel');
            $table->string('subject');
            $table->text('content');
            
            $table->enum('status', ['pending', 'sent', 'delivered', 'failed'])->default('pending');
            $table->text('error_message')->nullable();
            
            $table->timestamp('sent_at')->nullable();
            $table->timestamp('delivered_at')->nullable();
            $table->timestamp('read_at')->nullable();
            
            $table->json('metadata')->nullable();
            
            $table->timestamps();
            
            $table->index(['user_id', 'status']);
            $table->index('created_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sent_notifications');
        Schema::dropIfExists('notification_templates');
        Schema::dropIfExists('ab_test_conversions');
        Schema::dropIfExists('ab_test_impressions');
        Schema::dropIfExists('ab_tests');
        Schema::dropIfExists('push_subscriptions');
        Schema::dropIfExists('social_accounts');
    }
};
