<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class OrdenMantenimiento extends Model
{
    protected $table = 'ordenes_mantenimiento';

    protected $fillable = [
        'plan_mantenimiento_id',
        'tecnico_id',
        'fecha_programada',
        'fecha_inicio',
        'fecha_finalizacion',
        'estado',
        'observaciones',
    ];

    protected function casts(): array
    {
        return [
            'fecha_programada' => 'date',
            'fecha_inicio' => 'datetime',
            'fecha_finalizacion' => 'datetime',
        ];
    }

    public function plan(): BelongsTo
    {
        return $this->belongsTo(
            PlanMantenimiento::class,
            'plan_mantenimiento_id'
        );
    }

    public function tecnico(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'tecnico_id'
        );
    }
}
