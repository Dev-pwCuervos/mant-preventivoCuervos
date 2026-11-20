<?php

namespace Database\Seeders;

use App\Models\Rol;
use Illuminate\Database\Seeder;

class RolesSeeder extends Seeder
{
    public function run(): void
    {
        $roles = [
            [
                'nombre' => 'Administrador',
                'descripcion' => 'Administra usuarios, equipos y catálogos.',
            ],
            [
                'nombre' => 'Supervisor',
                'descripcion' => 'Programa, revisa y cierra mantenimientos.',
            ],
            [
                'nombre' => 'Técnico',
                'descripcion' => 'Ejecuta intervenciones y registra evidencias.',
            ],
        ];

        foreach ($roles as $rol) {
            Rol::updateOrCreate(
                ['nombre' => $rol['nombre']],
                $rol
            );
        }
    }
}
