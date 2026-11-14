<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class PlanMantenimiento extends Model
{
    protected $table = 'planes_mantenimiento';

    protected $fillable = [
        'equipo_id',
        'nombre',
        'descripcion',
        'frecuencia_dias',
        'fecha_inicio',
        'activo',
    ];

    protected function casts(): array
    {
        return [
            'fecha_inicio' => 'date',
            'activo' => 'boolean',
            'frecuencia_dias' => 'integer',
        ];
    }

    public function equipo(): BelongsTo
    {
        return $this->belongsTo(
            Equipo::class,
            'equipo_id'
        );
    }

    public function mantenimientos(): HasMany
    {
        return $this->hasMany(
            Mantenimiento::class,
            'plan_id'
        );
    }
}