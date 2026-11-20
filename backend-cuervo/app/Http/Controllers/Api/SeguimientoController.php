<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EstadoMantenimiento;
use App\Models\HistorialEstadoMantenimiento;
use App\Models\Mantenimiento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class SeguimientoController extends Controller
{
    private function autorizarGestion(Request $request): void
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
            'No tienes permisos para gestionar el seguimiento.'
        );
    }

    /*
    |--------------------------------------------------------------------------
    | Listado de mantenimientos para seguimiento
    |--------------------------------------------------------------------------
    */

    public function index(Request $request): JsonResponse
    {
        $this->autorizarGestion($request);

        $datos = $request->validate([
            'estado' => [
                'nullable',
                'string',
                'exists:estados_mantenimiento,codigo',
            ],
            'page' => [
                'nullable',
                'integer',
                'min:1',
            ],
        ]);

        $consulta = Mantenimiento::query()
            ->with([
                'plan',
                'estado',
                'prioridad',
                'tecnicos:id,nombre',
                'trabajoTerminadoPor:id,nombre',
                'cerradoPor:id,nombre',
                'evidencias',
            ]);

        if (!empty($datos['estado'])) {
            $consulta->whereHas(
                'estado',
                fn ($query) =>
                    $query->where('codigo', $datos['estado'])
            );
        }

        $mantenimientos = $consulta
            ->orderByDesc('fecha_programada')
            ->paginate(10);

        return response()->json($mantenimientos);
    }

    /*
    |--------------------------------------------------------------------------
    | Historial de cambios de una orden
    |--------------------------------------------------------------------------
    */

    public function historial(
        Request $request,
        Mantenimiento $mantenimiento
    ): JsonResponse {
        $this->autorizarGestion($request);

        $historial = HistorialEstadoMantenimiento::query()
            ->where('mantenimiento_id', $mantenimiento->id)
            ->with([
                'estadoAnterior:id,codigo,nombre',
                'estadoNuevo:id,codigo,nombre',
                'usuario:id,nombre',
            ])
            ->orderByDesc('created_at')
            ->orderByDesc('id')
            ->get();

        return response()->json([
            'mantenimiento_id' => $mantenimiento->id,
            'historial' => $historial,
        ]);
    }

    /*
    |--------------------------------------------------------------------------
    | Aprobar y cerrar un mantenimiento
    |--------------------------------------------------------------------------
    */

    public function cerrar(
        Request $request,
        Mantenimiento $mantenimiento
    ): JsonResponse {
        $this->autorizarGestion($request);

        $datos = $request->validate([
            'motivo' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ]);

        DB::transaction(function () use (
            $mantenimiento,
            $request,
            $datos
        ) {
            $orden = Mantenimiento::query()
                ->lockForUpdate()
                ->findOrFail($mantenimiento->id);

            $orden->load('estado');

            if ($orden->estado?->codigo !== 'EN_REVISION') {
                throw ValidationException::withMessages([
                    'estado' =>
                        'Solo se pueden cerrar mantenimientos en revisión.',
                ]);
            }

            if (
                !$orden->trabajo_terminado_por ||
                !$orden->fecha_trabajo_terminado
            ) {
                throw ValidationException::withMessages([
                    'estado' =>
                        'El trabajo debe estar terminado antes del cierre.',
                ]);
            }

            $estadoAnteriorId = $orden->estado_mantenimiento_id;

            $estadoCerrado = EstadoMantenimiento::query()
                ->where('codigo', 'CERRADO')
                ->firstOrFail();

            $orden->estado_mantenimiento_id = $estadoCerrado->id;
            $orden->cerrado_por = $request->user()->id;
            $orden->fecha_cierre = now();

            $orden->save();

            HistorialEstadoMantenimiento::create([
                'mantenimiento_id' => $orden->id,
                'estado_anterior_id' => $estadoAnteriorId,
                'estado_nuevo_id' => $estadoCerrado->id,
                'usuario_id' => $request->user()->id,
                'motivo' => $datos['motivo']
                    ?? 'Mantenimiento revisado y aprobado.',
            ]);
        });

        return response()->json([
            'message' => 'Mantenimiento cerrado correctamente.',
            'mantenimiento' => $mantenimiento->fresh()->load([
                'plan',
                'estado',
                'prioridad',
                'tecnicos',
                'trabajoTerminadoPor',
                'cerradoPor',
            ]),
        ]);
    }

    public function rechazar(
        Request $request,
        Mantenimiento $mantenimiento
    ): JsonResponse {
        $this->autorizarGestion($request);

        $datos = $request->validate([
            'motivo' => ['required', 'string', 'max:5000'],
        ]);

        DB::transaction(function () use ($mantenimiento, $request, $datos) {
            $orden = Mantenimiento::query()
                ->lockForUpdate()
                ->findOrFail($mantenimiento->id);

            $orden->load('estado');

            if ($orden->estado?->codigo !== 'EN_REVISION') {
                throw ValidationException::withMessages([
                    'estado' => 'Solo se pueden rechazar mantenimientos en revisión.',
                ]);
            }

            $estadoEnProceso = EstadoMantenimiento::query()
                ->where('codigo', 'EN_PROCESO')
                ->firstOrFail();

            $estadoAnteriorId = $orden->estado_mantenimiento_id;
            $orden->estado_mantenimiento_id = $estadoEnProceso->id;
            $orden->trabajo_terminado_por = null;
            $orden->fecha_trabajo_terminado = null;
            $orden->cerrado_por = null;
            $orden->fecha_cierre = null;
            $orden->save();

            HistorialEstadoMantenimiento::create([
                'mantenimiento_id' => $orden->id,
                'estado_anterior_id' => $estadoAnteriorId,
                'estado_nuevo_id' => $estadoEnProceso->id,
                'usuario_id' => $request->user()->id,
                'motivo' => $datos['motivo'],
            ]);
        });

        return response()->json([
            'message' => 'Mantenimiento devuelto al técnico para corrección.',
            'mantenimiento' => $mantenimiento->fresh()->load([
                'plan', 'estado', 'prioridad', 'tecnicos',
                'trabajoTerminadoPor', 'cerradoPor',
            ]),
        ]);
    }
}
