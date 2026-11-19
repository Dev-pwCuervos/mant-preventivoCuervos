<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ordenes_mantenimiento', function (Blueprint $table) {
            $table->id();

            $table->foreignId('plan_mantenimiento_id')
                ->constrained('planes_mantenimiento')
                ->restrictOnDelete();

            $table->foreignId('tecnico_id')
                ->nullable()
                ->constrained('usuarios')
                ->nullOnDelete();

            $table->date('fecha_programada');

            $table->dateTime('fecha_inicio')->nullable();
            $table->dateTime('fecha_finalizacion')->nullable();

            $table->enum('estado', [
                'pendiente',
                'en_proceso',
                'en_revision',
                'completado',
            ])->default('pendiente');

            $table->text('observaciones')->nullable();

            $table->timestamps();

            $table->index(['estado', 'fecha_programada']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('ordenes_mantenimiento');
    }
};
