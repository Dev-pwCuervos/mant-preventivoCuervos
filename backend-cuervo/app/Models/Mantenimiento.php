<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class Mantenimiento extends Model
{
    protected $table = 'mantenimientos';

    protected $fillable = [
        'plan_id',
        'estado_mantenimiento_id',
        'prioridad_id',
        'fecha_programada',
        'trabajo_terminado_por',
        'fecha_trabajo_terminado',
        'cerrado_por',
        'fecha_cierre',
        'observaciones',
    ];

    protected function casts(): array
    {
        return [
            'fecha_programada' => 'datetime',
            'fecha_trabajo_terminado' => 'datetime',
            'fecha_cierre' => 'datetime',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(
            PlanMantenimiento::class,
            'plan_id'
        );
    }

    public function estado(): BelongsTo
    {
        return $this->belongsTo(
            EstadoMantenimiento::class,
            'estado_mantenimiento_id'
        );
    }
}