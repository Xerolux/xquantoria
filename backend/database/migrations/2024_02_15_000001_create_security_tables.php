<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('security_events', function (Blueprint $table) {
            $table->id();
            $table->string('event_type')->index();
            $table->string('ip_address', 45)->index();
            $table->string('user_agent')->nullable();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('url')->nullable();
            $table->string('method', 10)->nullable();
            $table->json('payload')->nullable();
            $table->json('headers')->nullable();
            $table->string('severity', 20)->default('info');
            $table->text('description')->nullable();
            $table->json('metadata')->nullable();
            $table->boolean('is_resolved')->default(false);
            $table->timestamp('resolved_at')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['event_type', 'created_at']);
            $table->index(['ip_address', 'created_at']);
            $table->index('severity');
        });

        Schema::create('blocked_ips', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address', 45)->unique();
            $table->string('reason')->nullable();
            $table->string('block_type', 20)->default('temporary');
            $table->integer('failed_attempts')->default(0);
            $table->timestamp('blocked_at');
            $table->timestamp('unblock_at')->nullable();
            $table->boolean('is_permanent')->default(false);
            $table->foreignId('blocked_by')->nullable()->constrained('users')->nullOnDelete();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['ip_address', 'unblock_at']);
            $table->index('blocked_at');
        });

        Schema::create('failed_login_attempts', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address', 45)->index();
            $table->string('email')->nullable();
            $table->string('user_agent')->nullable();
            $table->text('failure_reason')->nullable();
            $table->json('metadata')->nullable();
            $table->timestamps();

            $table->index(['ip_address', 'created_at']);
            $table->index('email');
        });

        Schema::create('security_settings', function (Blueprint $table) {
            $table->id();
            $table->string('key')->unique();
            $table->text('value');
            $table->string('type', 20)->default('string');
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('security_settings');
        Schema::dropIfExists('failed_login_attempts');
        Schema::dropIfExists('blocked_ips');
        Schema::dropIfExists('security_events');
    }
};
