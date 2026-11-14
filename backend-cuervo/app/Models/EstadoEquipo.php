<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class EstadoEquipo extends Model
{
    // Nombre de la tabla en MariaDB
    protected $table = 'estados_equipo';

    // Esta tabla no tiene created_at ni updated_at
    public $timestamps = false;

    // Campos permitidos
    protected $fillable = [
        'codigo',
        'nombre',
    ];

    // Un estado puede pertenecer a varios equipos
    public function equipos(): HasMany
    {
        return $this->hasMany(
            Equipo::class,
            'estado_equipo_id'
        );
    }
}
