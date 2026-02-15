<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('menus', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('slug')->unique();
            $table->string('location')->nullable()->comment('header, footer, sidebar, etc.');
            $table->text('description')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['location', 'is_active']);
        });

        Schema::create('menu_items', function (Blueprint $table) {
            $table->id();
            $table->foreignId('menu_id')->constrained()->cascadeOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('menu_items')->cascadeOnDelete();
            $table->string('title');
            $table->string('url')->nullable();
            $table->string('target')->default('_self');
            $table->string('icon')->nullable();
            $table->string('class')->nullable();
            $table->integer('order')->default(0);
            $table->string('type')->default('custom')->comment('custom, post, page, category, tag');
            $table->unsignedBigInteger('linkable_id')->nullable();
            $table->string('linkable_type')->nullable();
            $table->json('meta')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->index(['menu_id', 'parent_id', 'order']);
            $table->index(['type', 'linkable_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('menu_items');
        Schema::dropIfExists('menus');
    }
};
