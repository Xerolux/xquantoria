<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::dropIfExists('plugin_hooks');
        Schema::dropIfExists('plugins');

        Schema::create('plugins', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->string('name');
            $table->string('namespace');
            $table->string('version', 20);
            $table->string('author')->nullable();
            $table->string('author_url')->nullable();
            $table->text('description')->nullable();
            $table->string('path');
            $table->string('entry_point')->default('Plugin.php');
            $table->json('config')->nullable();
            $table->json('default_config')->nullable();
            $table->json('dependencies')->nullable();
            $table->json('compatibility')->nullable();
            $table->string('license')->default('MIT');
            $table->string('license_url')->nullable();
            $table->string('icon')->nullable();
            $table->string('cover_image')->nullable();
            $table->json('tags')->nullable();
            $table->json('screenshots')->nullable();
            $table->string('repository_url')->nullable();
            $table->string('download_url')->nullable();
            $table->string('marketplace_id')->nullable();
            $table->string('checksum')->nullable();
            $table->enum('status', ['inactive', 'active', 'error', 'updating', 'disabled'])->default('inactive');
            $table->boolean('is_system')->default(false);
            $table->boolean('is_premium')->default(false);
            $table->boolean('auto_update')->default(false);
            $table->integer('load_order')->default(100);
            $table->foreignId('installed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('installed_at')->nullable();
            $table->timestamp('activated_at')->nullable();
            $table->timestamp('updated_at')->nullable();
            $table->timestamp('last_error_at')->nullable();
            $table->text('last_error')->nullable();
            $table->timestamps();

            $table->index(['status', 'load_order']);
            $table->index('slug');
            $table->index('marketplace_id');
        });

        Schema::create('plugin_hooks', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plugin_id')->constrained('plugins')->onDelete('cascade');
            $table->string('hook');
            $table->string('handler');
            $table->enum('type', ['action', 'filter'])->default('action');
            $table->unsignedTinyInteger('priority')->default(10);
            $table->unsignedSmallInteger('accepted_args')->default(1);
            $table->boolean('is_active')->default(true);
            $table->unsignedInteger('execution_count')->default(0);
            $table->decimal('avg_execution_time', 8, 4)->default(0);
            $table->timestamp('last_executed_at')->nullable();
            $table->timestamps();

            $table->index(['hook', 'priority', 'is_active']);
            $table->index('plugin_id');
        });

        Schema::create('plugin_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plugin_id')->constrained('plugins')->onDelete('cascade');
            $table->string('key');
            $table->text('value')->nullable();
            $table->string('type')->default('string');
            $table->boolean('is_public')->default(false);
            $table->timestamps();

            $table->unique(['plugin_id', 'key']);
            $table->index('is_public');
        });

        Schema::create('plugin_permissions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plugin_id')->constrained('plugins')->onDelete('cascade');
            $table->string('permission');
            $table->string('description')->nullable();
            $table->boolean('is_granted')->default(false);
            $table->timestamps();

            $table->unique(['plugin_id', 'permission']);
        });

        Schema::create('plugin_migrations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('plugin_id')->constrained('plugins')->onDelete('cascade');
            $table->string('migration');
            $table->integer('batch');
            $table->timestamps();

            $table->unique(['plugin_id', 'migration']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('plugin_migrations');
        Schema::dropIfExists('plugin_permissions');
        Schema::dropIfExists('plugin_settings');
        Schema::dropIfExists('plugin_hooks');
        Schema::dropIfExists('plugins');
    }
};
