<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Mantenimiento extends Model
{
    /*
    |--------------------------------------------------------------------------
    | Tabla de base de datos
    |--------------------------------------------------------------------------
    */

    protected $table = 'mantenimientos';

    /*
    |--------------------------------------------------------------------------
    | Campos permitidos para asignación masiva
    |--------------------------------------------------------------------------
    */

    protected $fillable = [
        'plan_id',
        'estado_mantenimiento_id',
        'prioridad_id',
        'fecha_programada',
        'observaciones',
    ];

    /*
    |--------------------------------------------------------------------------
    | Conversión de tipos
    |--------------------------------------------------------------------------
    */

    protected function casts(): array
    {
        return [
            'fecha_programada' => 'datetime',
            'fecha_trabajo_terminado' => 'datetime',
            'fecha_cierre' => 'datetime',
        ];
    }

    /*
    |--------------------------------------------------------------------------
    | Plan de mantenimiento
    |--------------------------------------------------------------------------
    */

    public function plan(): BelongsTo
    {
        return $this->belongsTo(
            PlanMantenimiento::class,
            'plan_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Estado del mantenimiento
    |--------------------------------------------------------------------------
    */

    public function estado(): BelongsTo
    {
        return $this->belongsTo(
            EstadoMantenimiento::class,
            'estado_mantenimiento_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Prioridad del mantenimiento
    |--------------------------------------------------------------------------
    */

    public function prioridad(): BelongsTo
    {
        return $this->belongsTo(
            Prioridad::class,
            'prioridad_id'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Técnicos asignados
    |--------------------------------------------------------------------------
    */

    public function tecnicos(): BelongsToMany
    {
        return $this->belongsToMany(
            User::class,
            'mantenimiento_tecnico',
            'mantenimiento_id',
            'tecnico_id'
        )
        ->withPivot('fecha_asignacion')
        ->withTimestamps();
    }

    /*
    |--------------------------------------------------------------------------
    | Usuario que terminó el trabajo
    |--------------------------------------------------------------------------
    */

    public function trabajoTerminadoPor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'trabajo_terminado_por'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Usuario que cerró el mantenimiento
    |--------------------------------------------------------------------------
    */

    public function cerradoPor(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'cerrado_por'
        );
    }
    public function historialEstados(): HasMany
{
    return $this->hasMany(
        HistorialEstadoMantenimiento::class,
        'mantenimiento_id'
    )->orderByDesc('created_at');
}
}
