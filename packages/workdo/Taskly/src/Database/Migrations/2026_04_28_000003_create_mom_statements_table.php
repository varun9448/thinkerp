<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mom_statements', function (Blueprint $table) {
            $table->id();
            $table->foreignId('room_id')->constrained('mom_rooms')->cascadeOnDelete();
            $table->unsignedBigInteger('parent_id')->nullable();
            $table->unsignedBigInteger('user_id');
            $table->text('content');
            $table->string('sl_no', 100);
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->foreign('parent_id')->references('id')->on('mom_statements')->cascadeOnDelete();
            $table->index(['room_id', 'parent_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mom_statements');
    }
};
