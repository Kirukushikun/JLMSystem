<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            // A second, optional supporting-file slot — the "Supporting Image"
            // field now accepts up to two files. Flat columns, mirroring the
            // existing attachment/attachment_name pair, rather than a JSON
            // array, since the count is fixed at two, not open-ended.
            $table->string('attachment_2')->nullable()->after('attachment');
            $table->string('attachment_2_name')->nullable()->after('attachment_name');
        });
    }

    public function down(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            $table->dropColumn(['attachment_2', 'attachment_2_name']);
        });
    }
};
