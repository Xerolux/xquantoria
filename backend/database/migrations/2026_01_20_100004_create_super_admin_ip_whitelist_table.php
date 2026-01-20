<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('super_admin_ip_whitelist', function (Blueprint $table) {
            $table->id();
            $table->string('ip_address', 45);
            $table->text('description')->nullable();
            $table->foreignId('added_by')->nullable()->constrained('users')->onDelete('set null');
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            $table->unique('ip_address');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('super_admin_ip_whitelist');
    }
};
