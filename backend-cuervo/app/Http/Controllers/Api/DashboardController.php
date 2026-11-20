<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mantenimiento;
use App\Models\PlanMantenimiento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends Controller
{
    private function proximosPlanes(): array
    {
        $hoy = now()->startOfDay();

        return PlanMantenimiento::query()
            ->where('activo', true)
            ->whereNotNull('fecha_inicio')
            ->where('frecuencia_dias', '>', 0)
            ->whereHas('equipo')
            ->with('equipo:id,codigo,nombre')
            ->get()
            ->map(function (PlanMantenimiento $plan) use ($hoy): array {
                $frecuencia = (int) $plan->frecuencia_dias;
                $proximaFecha = $plan->fecha_inicio->copy()
                    ->startOfDay()
                    ->addDays($frecuencia);

                if ($proximaFecha->lessThan($hoy)) {
                    $diasTranscurridos = abs($proximaFecha->diffInDays($hoy));
                    $ciclos = (int) ceil($diasTranscurridos / $frecuencia);
                    $proximaFecha->addDays($ciclos * $frecuencia);
                }

                return [
                    'id' => $plan->id,
                    'nombre' => $plan->nombre,
                    'equipo' => $plan->equipo->nombre,
                    'codigo_equipo' => $plan->equipo->codigo,
                    'frecuencia_dias' => $frecuencia,
                    'fecha_proxima' => $proximaFecha->toDateString(),
                    'dias_restantes' => (int) $hoy->diffInDays($proximaFecha),
                ];
            })
            ->sortBy('fecha_proxima')
            ->take(5)
            ->values()
            ->all();
    }

    public function index(Request $request): JsonResponse
    {
        $usuario = $request->user();

        abort_unless(
            $usuario && (bool) $usuario->activo,
            403,
            'Cuenta desactivada.'
        );

        $roles = $usuario->roles()
            ->pluck('nombre')
            ->all();

        $puedeGestionar = count(array_intersect(
            $roles,
            ['Administrador', 'Supervisor']
        )) > 0;

        $esTecnico = in_array('Técnico', $roles, true);

        abort_unless(
            $puedeGestionar || $esTecnico,
            403,
            'No tienes permisos.'
        );

        $consulta = Mantenimiento::query();

        // Los técnicos solo ven trabajos asignados.
        if (!$puedeGestionar) {
            $consulta->whereHas('tecnicos', function ($query) use ($usuario) {
                $query->whereKey($usuario->id);
            });
        }

        $contarEstado = function (string $codigo) use ($consulta): int {
            return (clone $consulta)
                ->whereHas('estado', function ($query) use ($codigo) {
                    $query->where('codigo', $codigo);
                })
                ->count();
        };

        $recientes = (clone $consulta)
            ->with([
                'plan',
                'estado',
                'prioridad',
                'tecnicos:id,nombre',
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->limit(5)
            ->get();

        $respuesta = [
            'estadisticas' => [
                'pendientes' => $contarEstado('PENDIENTE'),
                'en_proceso' => $contarEstado('EN_PROCESO'),
                'completados' => $contarEstado('CERRADO'),
                'en_revision' => $contarEstado('EN_REVISION'),
            ],
            'recientes' => $recientes,
        ];

        if ($puedeGestionar) {
            $respuesta['proximos_planes'] = $this->proximosPlanes();
        }

        return response()->json($respuesta);
    }
}
