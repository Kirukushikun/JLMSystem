<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            // 'document' = the original attachment-upload form; 'structured' = the
            // no-attachment form that captures the same info as discrete fields.
            $table->string('entry_type')->default('document')->after('user_id');
            $table->text('body')->nullable()->after('attachment_name');
            $table->text('justification')->nullable()->after('body');
            // Item rows (name/quantity/purpose/image path) and cost-breakdown rows
            // (description/quantity/unit cost) — only meaningful for entry_type =
            // 'structured'; null for document-mode entries.
            $table->json('items')->nullable()->after('justification');
            $table->json('cost_breakdown')->nullable()->after('items');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('jl_entries', function (Blueprint $table) {
            $table->dropColumn(['entry_type', 'body', 'justification', 'items', 'cost_breakdown']);
        });
    }
};
