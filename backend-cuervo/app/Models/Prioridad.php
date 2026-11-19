<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Prioridad extends Model
{
    protected $table = 'prioridades';

    public $timestamps = false;

    protected $fillable = [
        'nombre',
        'nivel',
    ];

    public function mantenimientos(): HasMany
    {
        return $this->hasMany(
            Mantenimiento::class,
            'prioridad_id'
        );
    }
}
