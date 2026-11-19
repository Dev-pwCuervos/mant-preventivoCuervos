<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class HistorialEstadoMantenimiento extends Model
{
    protected $table = 'historial_estados_mantenimiento';

    public const UPDATED_AT = null;

    protected $fillable = [
        'mantenimiento_id',
        'estado_anterior_id',
        'estado_nuevo_id',
        'usuario_id',
        'motivo',
    ];

    protected function casts(): array
    {
        return [
            'created_at' => 'datetime',
        ];
    }

    public function mantenimiento(): BelongsTo
    {
        return $this->belongsTo(
            Mantenimiento::class,
            'mantenimiento_id'
        );
    }

    public function estadoAnterior(): BelongsTo
    {
        return $this->belongsTo(
            EstadoMantenimiento::class,
            'estado_anterior_id'
        );
    }

    public function estadoNuevo(): BelongsTo
    {
        return $this->belongsTo(
            EstadoMantenimiento::class,
            'estado_nuevo_id'
        );
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(
            User::class,
            'usuario_id'
        );
    }
}
