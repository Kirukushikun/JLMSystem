<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        // Expand enum to include both values while data is being migrated
        DB::statement("ALTER TABLE jl_entries MODIFY COLUMN status ENUM('Pending','Checked','Reviewed','Rejected','Approved','VP Rejected') NOT NULL DEFAULT 'Pending'");
        DB::table('jl_entries')->where('status', 'Checked')->update(['status' => 'Reviewed']);
        // Remove the old value
        DB::statement("ALTER TABLE jl_entries MODIFY COLUMN status ENUM('Pending','Reviewed','Rejected','Approved','VP Rejected') NOT NULL DEFAULT 'Pending'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE jl_entries MODIFY COLUMN status ENUM('Pending','Checked','Reviewed','Rejected','Approved','VP Rejected') NOT NULL DEFAULT 'Pending'");
        DB::table('jl_entries')->where('status', 'Reviewed')->update(['status' => 'Checked']);
        DB::statement("ALTER TABLE jl_entries MODIFY COLUMN status ENUM('Pending','Checked','Rejected','Approved','VP Rejected') NOT NULL DEFAULT 'Pending'");
    }
};
