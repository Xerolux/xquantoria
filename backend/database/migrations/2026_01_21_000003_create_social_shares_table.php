<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('social_shares', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->onDelete('cascade');
            $table->string('platform', 50); // twitter, facebook, linkedin, etc.
            $table->string('share_url')->nullable(); // External share URL if tracked
            $table->timestamp('shared_at');
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();

            $table->index(['post_id', 'platform']);
            $table->index('shared_at');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('social_shares');
    }
};
