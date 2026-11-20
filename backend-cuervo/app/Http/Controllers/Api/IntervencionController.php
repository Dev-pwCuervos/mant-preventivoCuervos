<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EstadoMantenimiento;
use App\Models\HistorialEstadoMantenimiento;
use App\Models\Mantenimiento;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\ValidationException;
use Illuminate\Support\Str;

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
            'evidencias' => ['nullable', 'array', 'max:3'],
            'evidencias.*' => [
                'required',
                'file',
                'image',
                'mimes:jpg,jpeg,png,webp',
                'max:2048',
            ],
        ]);

        $disco = config('filesystems.evidence_disk', 'local');
        $rutasGuardadas = [];

        try {
            DB::transaction(function () use (
                $request,
                $mantenimiento,
                $datos,
                $disco,
                &$rutasGuardadas
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

                foreach ($datos['evidencias'] ?? [] as $archivo) {
                    $ruta = $archivo->store(
                        "evidencias/mantenimientos/{$orden->id}",
                        $disco
                    );

                    if (!$ruta) {
                        throw new \RuntimeException(
                            'No fue posible guardar la evidencia fotográfica.'
                        );
                    }

                    $rutasGuardadas[] = $ruta;

                    $orden->evidencias()->create([
                        'usuario_id' => $request->user()->id,
                        'disco' => $disco,
                        'ruta' => $ruta,
                        'nombre_original' => Str::limit(
                            $archivo->getClientOriginalName(),
                            255,
                            ''
                        ),
                        'mime_type' => $archivo->getMimeType(),
                        'tamano' => $archivo->getSize(),
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
        } catch (\Throwable $error) {
            foreach ($rutasGuardadas as $ruta) {
                try {
                    Storage::disk($disco)->delete($ruta);
                } catch (\Throwable $errorLimpieza) {
                    report($errorLimpieza);
                }
            }

            throw $error;
        }

        return response()->json([
            'message' => 'Trabajo enviado a revisión correctamente.',
            'mantenimiento' => $mantenimiento->fresh()
                ->load(['plan', 'estado', 'prioridad', 'evidencias']),
        ]);
    }
}
