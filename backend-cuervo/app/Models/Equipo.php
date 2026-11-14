<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Equipo extends Model
{
    use SoftDeletes;

    protected $table = 'equipos';

    protected $fillable = [
        'codigo',
        'nombre',
        'descripcion',
        'marca',
        'modelo',
        'numero_serie',
        'categoria_id',
        'ubicacion_id',
        'estado_equipo_id',
        'fecha_adquisicion',
    ];

    protected function casts(): array
    {
        return [
            'fecha_adquisicion' => 'date',
        ];
    }

    public function categoria(): BelongsTo
    {
        return $this->belongsTo(
            CategoriaEquipo::class,
            'categoria_id'
        );
    }

    public function ubicacion(): BelongsTo
    {
        return $this->belongsTo(
            Ubicacion::class,
            'ubicacion_id'
        );
    }

    public function estado(): BelongsTo
    {
        return $this->belongsTo(
            EstadoEquipo::class,
            'estado_equipo_id'
        );
    }

    public function planesMantenimiento(): HasMany
    {
        return $this->hasMany(
            PlanMantenimiento::class,
            'equipo_id'
        );
    }
}
