<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('page_analytics', function (Blueprint $table) {
            $table->id();
            $table->string('url', 500);
            $table->foreignId('post_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('session_id', 100)->index();
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->string('referrer', 500)->nullable();
            $table->boolean('entry_page')->default(false);
            $table->boolean('exit_page')->default(false);
            $table->integer('time_on_page')->nullable(); // seconds
            $table->timestamp('created_at')->index();

            $table->index(['session_id', 'created_at']);
            $table->index('post_id');
        });

        Schema::create('conversions', function (Blueprint $table) {
            $table->id();
            $table->string('type', 50); // newsletter_signup, download, etc.
            $table->foreignId('post_id')->nullable()->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->nullable()->constrained()->onDelete('cascade');
            $table->string('session_id', 100);
            $table->json('metadata')->nullable(); // Additional conversion data
            $table->timestamp('created_at')->index();

            $table->index(['type', 'created_at']);
            $table->index('session_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversions');
        Schema::dropIfExists('page_analytics');
    }
};
