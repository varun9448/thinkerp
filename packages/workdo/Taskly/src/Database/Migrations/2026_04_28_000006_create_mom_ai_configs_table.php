<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mom_ai_configs', function (Blueprint $table) {
            $table->id();
            $table->unsignedBigInteger('created_by')->unique();
            $table->enum('provider', ['anthropic', 'openai', 'google'])->default('anthropic');
            $table->text('api_key'); // stored encrypted
            $table->string('model')->default('claude-sonnet-4-6');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mom_ai_configs');
    }
};
