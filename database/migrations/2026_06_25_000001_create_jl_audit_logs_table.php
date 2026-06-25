<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('jl_audit_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('jl_entry_id')->constrained('jl_entries')->cascadeOnDelete();
            $table->string('event', 50); // submitted | reviewed | approved | rejected | vp_rejected
            $table->string('actor', 150)->nullable(); // null = public submission
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('jl_audit_logs');
    }
};
