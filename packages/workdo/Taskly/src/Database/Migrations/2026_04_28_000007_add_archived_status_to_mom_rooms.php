<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE mom_rooms MODIFY COLUMN `status` ENUM('active', 'closed', 'archived') NOT NULL DEFAULT 'active'");
    }

    public function down(): void
    {
        // Move any archived rooms to closed before reverting
        DB::statement("UPDATE mom_rooms SET status = 'closed' WHERE status = 'archived'");
        DB::statement("ALTER TABLE mom_rooms MODIFY COLUMN `status` ENUM('active', 'closed') NOT NULL DEFAULT 'active'");
    }
};
