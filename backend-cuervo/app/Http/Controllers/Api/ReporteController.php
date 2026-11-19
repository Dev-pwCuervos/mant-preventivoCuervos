<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Mantenimiento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;

class ReporteController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        $usuario = $request->user();

        abort_unless(
            $usuario &&
            (bool) $usuario->activo &&
            $usuario->roles()
                ->whereIn('nombre', [
                    'Administrador',
                    'Supervisor',
                ])
                ->exists(),
            403,
            'No tienes permisos para consultar reportes.'
        );

        $datos = $request->validate([
            'desde' => ['nullable', 'date_format:Y-m-d'],
            'hasta' => ['nullable', 'date_format:Y-m-d'],
        ]);

        $desde = isset($datos['desde'])
            ? Carbon::parse($datos['desde'])->startOfDay()
            : now()->startOfYear();

        $hasta = isset($datos['hasta'])
            ? Carbon::parse($datos['hasta'])->endOfDay()
            : now()->endOfDay();

        abort_if(
            $desde->greaterThan($hasta),
            422,
            'La fecha inicial no puede superar la fecha final.'
        );

        $ordenes = Mantenimiento::query()
            ->with([
                'plan:id,nombre',
                'estado:id,codigo,nombre',
                'prioridad:id,nombre,nivel',
                'tecnicos:id,nombre',
            ])
            ->whereBetween('fecha_programada', [
                $desde,
                $hasta,
            ])
            ->orderBy('fecha_programada')
            ->get();

        $total = $ordenes->count();

        $cerrados = $ordenes->filter(
            fn ($orden) =>
                $orden->estado?->codigo === 'CERRADO'
        )->count();

        $atrasados = $ordenes->filter(
            fn ($orden) =>
                $orden->fecha_programada?->isPast() &&
                !in_array(
                    $orden->estado?->codigo,
                    ['CERRADO', 'CANCELADO'],
                    true
                )
        )->count();

        $cerradosATiempo = $ordenes->filter(
            fn ($orden) =>
                $orden->estado?->codigo === 'CERRADO' &&
                $orden->fecha_cierre &&
                $orden->fecha_cierre->lessThanOrEqualTo(
                    $orden->fecha_programada
                )
        )->count();

        $porEstado = $ordenes
            ->groupBy(
                fn ($orden) =>
                    $orden->estado?->nombre ?? 'Sin estado'
            )
            ->map(fn ($grupo) => $grupo->count())
            ->map(fn ($cantidad, $nombre) => [
                'nombre' => $nombre,
                'cantidad' => $cantidad,
            ])
            ->values();

        $porPrioridad = $ordenes
            ->groupBy(
                fn ($orden) =>
                    $orden->prioridad?->nombre ?? 'Sin prioridad'
            )
            ->map(fn ($grupo) => $grupo->count())
            ->map(fn ($cantidad, $nombre) => [
                'nombre' => $nombre,
                'cantidad' => $cantidad,
            ])
            ->values();

        $porMes = $ordenes
            ->groupBy(
                fn ($orden) =>
                    $orden->fecha_programada->format('Y-m')
            )
            ->map(fn ($grupo, $mes) => [
                'mes' => $mes,
                'cantidad' => $grupo->count(),
                'cerrados' => $grupo->filter(
                    fn ($orden) =>
                        $orden->estado?->codigo === 'CERRADO'
                )->count(),
            ])
            ->values();

        $tecnicos = [];

        foreach ($ordenes as $orden) {
            foreach ($orden->tecnicos as $tecnico) {
                $id = $tecnico->id;

                if (!isset($tecnicos[$id])) {
                    $tecnicos[$id] = [
                        'id' => $id,
                        'nombre' => $tecnico->nombre,
                        'asignados' => 0,
                        'cerrados' => 0,
                    ];
                }

                $tecnicos[$id]['asignados']++;

                if ($orden->estado?->codigo === 'CERRADO') {
                    $tecnicos[$id]['cerrados']++;
                }
            }
        }

        return response()->json([
            'periodo' => [
                'desde' => $desde->toDateString(),
                'hasta' => $hasta->toDateString(),
            ],
            'indicadores' => [
                'total' => $total,
                'cerrados' => $cerrados,
                'atrasados' => $atrasados,
                'cerrados_a_tiempo' => $cerradosATiempo,
                'porcentaje_cierre' => $total > 0
                    ? round(($cerrados / $total) * 100, 1)
                    : 0,
            ],
            'por_estado' => $porEstado,
            'por_prioridad' => $porPrioridad,
            'por_mes' => $porMes,
            'tecnicos' => array_values($tecnicos),
            'ordenes' => $ordenes->map(fn ($orden) => [
                'id' => $orden->id,
                'plan' => $orden->plan?->nombre,
                'estado' => $orden->estado?->nombre,
                'prioridad' => $orden->prioridad?->nombre,
                'fecha_programada' =>
                    $orden->fecha_programada?->toDateTimeString(),
                'fecha_cierre' =>
                    $orden->fecha_cierre?->toDateTimeString(),
                'tecnicos' => $orden->tecnicos
                    ->pluck('nombre')
                    ->values()
                    ->all(),
            ])->values(),
        ]);
    }
}
