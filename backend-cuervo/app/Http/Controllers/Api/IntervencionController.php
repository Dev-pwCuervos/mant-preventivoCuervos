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

class IntervencionController extends Controller
{
    private function autorizarTecnico(
        Request $request,
        Mantenimiento $mantenimiento
    ): void {
        $usuario = $request->user();

        abort_unless(
            $usuario &&
            (bool) $usuario->activo &&
            $usuario->roles()
                ->where('nombre', 'Técnico')
                ->exists(),
            403,
            'Esta operación requiere un Técnico activo.'
        );

        abort_unless(
            $mantenimiento->tecnicos()
                ->whereKey($usuario->id)
                ->exists(),
            403,
            'No estás asignado a este mantenimiento.'
        );
    }

    private function estadoId(string $codigo): int
    {
        return EstadoMantenimiento::query()
            ->where('codigo', $codigo)
            ->firstOrFail()
            ->id;
    }

    public function iniciar(
        Request $request,
        Mantenimiento $mantenimiento
    ): JsonResponse {
        $this->autorizarTecnico($request, $mantenimiento);

        DB::transaction(function () use ($request, $mantenimiento) {
            $orden = Mantenimiento::query()
                ->lockForUpdate()
                ->findOrFail($mantenimiento->id);

            $orden->load('estado');

            if ($orden->estado?->codigo !== 'PENDIENTE') {
                throw ValidationException::withMessages([
                    'estado' => 'El mantenimiento debe estar pendiente.',
                ]);
            }

            $anteriorId = $orden->estado_mantenimiento_id;
            $nuevoId = $this->estadoId('EN_PROCESO');

            $orden->estado_mantenimiento_id = $nuevoId;
            $orden->save();

            HistorialEstadoMantenimiento::create([
                'mantenimiento_id' => $orden->id,
                'estado_anterior_id' => $anteriorId,
                'estado_nuevo_id' => $nuevoId,
                'usuario_id' => $request->user()->id,
                'motivo' => 'Inicio del trabajo de mantenimiento.',
            ]);
        });

        return response()->json([
            'message' => 'Intervención iniciada correctamente.',
            'mantenimiento' => $mantenimiento->fresh()
                ->load(['plan', 'estado', 'prioridad']),
        ]);
    }

    public function finalizar(
        Request $request,
        Mantenimiento $mantenimiento
    ): JsonResponse {
        $this->autorizarTecnico($request, $mantenimiento);

        $datos = $request->validate([
            'observaciones' => [
                'required',
                'string',
                'max:5000',
            ],
        ]);

        DB::transaction(function () use (
            $request,
            $mantenimiento,
            $datos
        ) {
            $orden = Mantenimiento::query()
                ->lockForUpdate()
                ->findOrFail($mantenimiento->id);

            $orden->load('estado');

            if ($orden->estado?->codigo !== 'EN_PROCESO') {
                throw ValidationException::withMessages([
                    'estado' => 'El mantenimiento debe estar en proceso.',
                ]);
            }

            $anteriorId = $orden->estado_mantenimiento_id;
            $nuevoId = $this->estadoId('EN_REVISION');

            $orden->estado_mantenimiento_id = $nuevoId;
            $orden->trabajo_terminado_por = $request->user()->id;
            $orden->fecha_trabajo_terminado = now();
            $orden->observaciones = $datos['observaciones'];

            $orden->save();

            HistorialEstadoMantenimiento::create([
                'mantenimiento_id' => $orden->id,
                'estado_anterior_id' => $anteriorId,
                'estado_nuevo_id' => $nuevoId,
                'usuario_id' => $request->user()->id,
                'motivo' => 'Trabajo terminado y enviado a revisión.',
            ]);
        });

        return response()->json([
            'message' => 'Trabajo enviado a revisión correctamente.',
            'mantenimiento' => $mantenimiento->fresh()
                ->load(['plan', 'estado', 'prioridad']),
        ]);
    }
}
