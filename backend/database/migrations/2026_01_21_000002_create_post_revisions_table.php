<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('post_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');

            // Store the full post data as JSON
            $table->json('content');

            // Revision metadata
            $table->string('title')->nullable();
            $table->string('status', 20)->default('draft');
            $table->string('revision_reason', 255)->nullable(); // e.g., "Fixed typo", "Added section"

            // Auto-save flag
            $table->boolean('is_auto_save')->default(false);

            // For detecting conflicts
            $table->timestamp('edited_at')->nullable();
            $table->unsignedBigInteger('edited_at_ms')->nullable(); // Milliseconds for precision

            $table->timestamps();

            // Indexes for efficient queries
            $table->index(['post_id', 'created_at']);
            $table->index('user_id');
            $table->index('is_auto_save');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('post_revisions');
    }
};
