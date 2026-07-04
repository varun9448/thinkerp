<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('mom_acknowledgments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('statement_id')->constrained('mom_statements')->cascadeOnDelete();
            $table->unsignedBigInteger('user_id');
            $table->enum('type', [
                'agree',
                'accepted',
                'rejected',
                'pending_decision',
                'accepted_with_remarks',
                'rejected_with_remarks',
            ]);
            $table->text('remarks')->nullable();
            $table->unsignedBigInteger('created_by')->nullable();
            $table->timestamps();

            $table->unique(['statement_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('mom_acknowledgments');
    }
};
