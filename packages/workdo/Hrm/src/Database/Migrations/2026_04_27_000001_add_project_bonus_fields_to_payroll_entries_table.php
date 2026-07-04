<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('payroll_entries')) {
            Schema::table('payroll_entries', function (Blueprint $table) {
                if (!Schema::hasColumn('payroll_entries', 'project_bonus')) {
                    $table->decimal('project_bonus', 10, 2)->default(0)->after('total_manual_overtimes');
                }

                if (!Schema::hasColumn('payroll_entries', 'project_bonus_stars')) {
                    $table->decimal('project_bonus_stars', 10, 2)->default(0)->after('project_bonus');
                }

                if (!Schema::hasColumn('payroll_entries', 'project_bonus_breakdown')) {
                    $table->json('project_bonus_breakdown')->nullable()->after('loans_breakdown');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('payroll_entries')) {
            Schema::table('payroll_entries', function (Blueprint $table) {
                foreach (['project_bonus_breakdown', 'project_bonus_stars', 'project_bonus'] as $column) {
                    if (Schema::hasColumn('payroll_entries', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
