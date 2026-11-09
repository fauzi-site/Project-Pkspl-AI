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
        Schema::table('ai_history', function (Blueprint $table) {
            $table->string('session_id', 64)->nullable()->after('id_user')->index();
            $table->foreignId('id_proyek')
                ->nullable()
                ->after('session_id')
                ->constrained('proyek', 'id_proyek')
                ->cascadeOnUpdate()
                ->nullOnDelete();
            $table->string('page_context', 50)->nullable()->after('id_proyek');

            $table->index(['id_user', 'session_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('ai_history', function (Blueprint $table) {
            $table->dropIndex(['id_user', 'session_id']);
            $table->dropForeign(['id_proyek']);
            $table->dropColumn(['page_context', 'id_proyek', 'session_id']);
        });
    }
};
