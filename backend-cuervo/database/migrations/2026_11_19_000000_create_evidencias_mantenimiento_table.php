<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('evidencias_mantenimiento', function (Blueprint $table) {
            $table->id();
            $table->foreignId('mantenimiento_id')
                ->constrained('mantenimientos')
                ->cascadeOnDelete();
            $table->foreignId('usuario_id')
                ->constrained('usuarios')
                ->restrictOnDelete();
            $table->string('disco', 50);
            $table->string('ruta', 500)->unique();
            $table->string('nombre_original');
            $table->string('mime_type', 100);
            $table->unsignedBigInteger('tamano');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('evidencias_mantenimiento');
    }
};
