<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasTable('projects')) {
            Schema::table('projects', function (Blueprint $table) {
                if (!Schema::hasColumn('projects', 'bonus_budget')) {
                    $table->decimal('bonus_budget', 10, 2)->default(0)->after('budget');
                }

                if (!Schema::hasColumn('projects', 'finished_at')) {
                    $table->timestamp('finished_at')->nullable()->after('status');
                }

                if (!Schema::hasColumn('projects', 'bonus_paid_at')) {
                    $table->timestamp('bonus_paid_at')->nullable()->after('finished_at');
                }

                if (!Schema::hasColumn('projects', 'bonus_payroll_id')) {
                    $table->unsignedBigInteger('bonus_payroll_id')->nullable()->index()->after('bonus_paid_at');
                }
            });
        }
    }

    public function down(): void
    {
        if (Schema::hasTable('projects')) {
            Schema::table('projects', function (Blueprint $table) {
                if (Schema::hasColumn('projects', 'bonus_payroll_id')) {
                    $table->dropIndex(['bonus_payroll_id']);
                    $table->dropColumn('bonus_payroll_id');
                }

                foreach (['bonus_paid_at', 'finished_at', 'bonus_budget'] as $column) {
                    if (Schema::hasColumn('projects', $column)) {
                        $table->dropColumn($column);
                    }
                }
            });
        }
    }
};
