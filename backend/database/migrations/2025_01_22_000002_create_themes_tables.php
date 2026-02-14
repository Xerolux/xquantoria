<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('themes', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('version')->default('1.0.0');
            $table->text('description')->nullable();
            $table->string('author')->nullable();
            $table->string('author_url')->nullable();
            $table->string('screenshot')->nullable();
            $table->string('preview_url')->nullable();
            $table->json('settings')->nullable();
            $table->json('colors')->nullable();
            $table->json('fonts')->nullable();
            $table->json('layouts')->nullable();
            $table->json('custom_css')->nullable();
            $table->json('templates')->nullable();
            $table->string('parent_theme')->nullable();
            $table->boolean('is_active')->default(false);
            $table->boolean('is_child_theme')->default(false);
            $table->timestamps();
        });

        Schema::create('theme_settings', function (Blueprint $table) {
            $table->id();
            $table->foreignId('theme_id')->constrained()->cascadeOnDelete();
            $table->string('key');
            $table->text('value')->nullable();
            $table->string('type')->default('text');
            $table->string('group')->default('general');
            $table->string('label')->nullable();
            $table->text('description')->nullable();
            $table->json('options')->nullable();
            $table->integer('sort_order')->default(0);
            $table->timestamps();

            $table->unique(['theme_id', 'key']);
        });

        Schema::create('theme_modifications', function (Blueprint $table) {
            $table->id();
            $table->foreignId('theme_id')->constrained()->cascadeOnDelete();
            $table->string('setting_key');
            $table->text('setting_value')->nullable();
            $table->timestamps();

            $table->unique(['theme_id', 'setting_key']);
        });

        Schema::create('theme_templates', function (Blueprint $table) {
            $table->id();
            $table->foreignId('theme_id')->constrained()->cascadeOnDelete();
            $table->string('name');
            $table->string('slug');
            $table->string('type');
            $table->text('content');
            $table->json('settings')->nullable();
            $table->boolean('is_custom')->default(false);
            $table->timestamps();

            $table->unique(['theme_id', 'slug']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('theme_templates');
        Schema::dropIfExists('theme_modifications');
        Schema::dropIfExists('theme_settings');
        Schema::dropIfExists('themes');
    }
};
