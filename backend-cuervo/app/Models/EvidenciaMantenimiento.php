<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class EvidenciaMantenimiento extends Model
{
    protected $table = 'evidencias_mantenimiento';

    protected $fillable = [
        'usuario_id',
        'disco',
        'ruta',
        'nombre_original',
        'mime_type',
        'tamano',
    ];

    protected $hidden = ['disco', 'ruta'];

    protected function casts(): array
    {
        return ['tamano' => 'integer'];
    }

    public function mantenimiento(): BelongsTo
    {
        return $this->belongsTo(Mantenimiento::class, 'mantenimiento_id');
    }

    public function usuario(): BelongsTo
    {
        return $this->belongsTo(User::class, 'usuario_id');
    }
}
