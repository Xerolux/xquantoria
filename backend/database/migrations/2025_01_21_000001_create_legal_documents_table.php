<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('legal_documents', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('title');
            $table->text('content');
            $table->string('slug')->unique();
            $table->json('form_data')->nullable();
            $table->string('language', 5)->default('de');
            $table->string('version')->default('1.0');
            $table->timestamp('generated_at');
            $table->timestamp('valid_until')->nullable();
            $table->boolean('is_published')->default(false);
            $table->foreignId('created_by')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['type', 'language']);
            $table->index('is_published');
        });

        Schema::create('legal_document_templates', function (Blueprint $table) {
            $table->id();
            $table->string('type');
            $table->string('name');
            $table->text('template');
            $table->json('required_fields');
            $table->json('optional_fields')->nullable();
            $table->text('description')->nullable();
            $table->string('language', 5)->default('de');
            $table->string('country', 2)->default('DE');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique(['type', 'language', 'country']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('legal_document_templates');
        Schema::dropIfExists('legal_documents');
    }
};
