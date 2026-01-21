<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('post_assignments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('post_id')->constrained()->onDelete('cascade');
            $table->foreignId('user_id')->constrained()->onDelete('cascade');
            $table->string('role', 50); // author, reviewer, editor
            $table->timestamp('assigned_at');
            $table->timestamp('updated_at')->nullable();

            $table->unique(['post_id', 'user_id', 'role']);
            $table->index(['post_id', 'role']);
            $table->index('user_id');
        });

        // Add workflow columns to posts
        Schema::table('posts', function (Blueprint $table) {
            $table->timestamp('submitted_for_review_at')->nullable()->after('published_at');
            $table->timestamp('approved_at')->nullable()->after('submitted_for_review_at');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete()->after('approved_at');
            $table->text('reviewer_feedback')->nullable()->after('approved_by');
            $table->timestamp('changes_requested_at')->nullable()->after('reviewer_feedback');
            $table->string('meta_robots')->nullable()->after('meta_description');
        });
    }

    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropColumn('meta_robots');
            $table->dropColumn('changes_requested_at');
            $table->dropColumn('reviewer_feedback');
            $table->dropColumn('approved_by');
            $table->dropColumn('approved_at');
            $table->dropColumn('submitted_for_review_at');
        });

        Schema::dropIfExists('post_assignments');
    }
};
