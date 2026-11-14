<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EstadoMantenimiento extends Model
{
    protected $table = 'estados_mantenimiento';

    protected $fillable = [
        'codigo',
        'nombre',
    ];

    public function mantenimientos(): HasMany
    {
        return $this->hasMany(
            Mantenimiento::class,
            'estado_mantenimiento_id'
        );
    }
}