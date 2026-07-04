<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('task_work_submissions')) {
            Schema::create('task_work_submissions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('task_id')->constrained('project_tasks')->cascadeOnDelete();
                $table->unsignedBigInteger('user_id');
                $table->text('notes')->nullable();
                $table->timestamp('submitted_at');
                $table->enum('status', ['pending', 'approved', 'rejected'])->default('pending');
                $table->unsignedBigInteger('approved_by')->nullable();
                $table->timestamp('approved_at')->nullable();
                $table->text('rejection_reason')->nullable();
                $table->unsignedBigInteger('created_by')->nullable();
                $table->timestamps();

                $table->unique(['task_id', 'user_id']);
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('task_work_submissions');
    }
};
