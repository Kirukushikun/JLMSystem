<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('reviewer','vp','purchasing','requestor','admin') NOT NULL DEFAULT 'reviewer'");
    }

    public function down(): void
    {
        DB::statement("ALTER TABLE users MODIFY COLUMN role ENUM('reviewer','vp','purchasing','admin') NOT NULL DEFAULT 'reviewer'");
    }
};
