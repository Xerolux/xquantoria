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
        Schema::table('posts', function (Blueprint $table) {
            $table->unsignedBigInteger('original_post_id')->nullable()->after('id');
            $table->string('translation_status')->default('none')->after('language'); // none, in_progress, completed, needs_review
            $table->timestamp('translated_at')->nullable()->after('translated_at');
            $table->unsignedBigInteger('translated_by')->nullable()->after('translated_at');

            $table->foreign('original_post_id')->references('id')->on('posts')->onDelete('set null');
            $table->foreign('translated_by')->references('id')->on('users')->onDelete('set null');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('posts', function (Blueprint $table) {
            $table->dropForeign(['original_post_id']);
            $table->dropForeign(['translated_by']);
            $table->dropColumn(['original_post_id', 'translation_status', 'translated_at', 'translated_by']);
        });
    }
};
