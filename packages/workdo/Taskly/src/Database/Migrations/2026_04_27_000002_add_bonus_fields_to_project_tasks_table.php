<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('project_tasks')) {
            Schema::table('project_tasks', function (Blueprint $table) {
                if (!Schema::hasColumn('project_tasks', 'bonus_stars')) {
                    $table->decimal('bonus_stars', 8, 2)->default(0)->after('priority');
                }

                if (!Schema::hasColumn('project_tasks', 'bonus_lead_days')) {
                    $table->unsignedInteger('bonus_lead_days')->nullable()->after('bonus_stars');
                }

                if (!Schema::hasColumn('project_tasks', 'completed_at')) {
                    $table->timestamp('completed_at')->nullable()->after('stage_id');
                }

                if (!Schema::hasColumn('project_tasks', 'bonus_awarded_at')) {
                    $table->timestamp('bonus_awarded_at')->nullable()->after('completed_at');
                }

                if (!Schema::hasColumn('project_tasks', 'bonus_awarded_to')) {
                    $table->json('bonus_awarded_to')->nullable()->after('bonus_awarded_at');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('project_tasks')) {
            Schema::table('project_tasks', function (Blueprint $table) {
                foreach (['bonus_awarded_to', 'bonus_awarded_at', 'completed_at', 'bonus_lead_days', 'bonus_stars'] as $column) {
                    if (Schema::hasColumn('project_tasks', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
