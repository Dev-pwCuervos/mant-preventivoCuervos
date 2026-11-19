<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\EstadoMantenimiento;
use App\Models\Mantenimiento;
use App\Models\PlanMantenimiento;
use App\Models\Prioridad;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class MantenimientoController extends Controller
{
    private function puedeGestionar($usuario): bool
    {
        return $usuario->roles()
            ->whereIn('nombre', [
                'Administrador',
                'Supervisor',
            ])
            ->exists();
    }

    private function esTecnico($usuario): bool
    {
        return $usuario->roles()
            ->where('nombre', 'Técnico')
            ->exists();
    }

    private function autorizarAcceso(Request $request): void
    {
        $usuario = $request->user();

        abort_unless(
            $usuario &&
            (bool) $usuario->activo &&
            (
                $this->puedeGestionar($usuario) ||
                $this->esTecnico($usuario)
            ),
            403,
            'No tienes permisos para acceder.'
        );
    }

    /**
     * Listar mantenimientos.
     */
    public function index(Request $request): JsonResponse
    {
        $this->autorizarAcceso($request);

        $usuario = $request->user();

        $consulta = Mantenimiento::query()
            ->with([
                'plan',
                'estado',
                'prioridad',
                'tecnicos',
            ]);

        // Los técnicos solo ven sus asignaciones.
        if (!$this->puedeGestionar($usuario)) {
            $consulta->whereHas(
                'tecnicos',
                fn ($query) =>
                    $query->whereKey($usuario->id)
            );
        }

        if ($request->filled('estado')) {
            $consulta->whereHas(
                'estado',
                fn ($query) =>
                    $query->where(
                        'codigo',
                        $request->input('estado')
                    )
            );
        }

        if ($request->filled('buscar')) {
            $buscar = $request->input('buscar');

            $consulta->whereHas(
                'plan',
                fn ($query) =>
                    $query->where(
                        'nombre',
                        'like',
                        '%' . $buscar . '%'
                    )
            );
        }

        $mantenimientos = $consulta
            ->orderByDesc('fecha_programada')
            ->paginate(10);

        return response()->json($mantenimientos);
    }

    /**
     * Obtener catálogos para el formulario.
     */
    public function catalogos(Request $request): JsonResponse
    {
        $this->autorizarAcceso($request);

        abort_unless(
            $this->puedeGestionar($request->user()),
            403,
            'No puedes programar mantenimientos.'
        );

        return response()->json([
            'planes' => PlanMantenimiento::query()
                ->where('activo', true)
                ->orderBy('nombre')
                ->get([
                    'id',
                    'equipo_id',
                    'nombre',
                    'frecuencia_dias',
                ]),

            'prioridades' => Prioridad::query()
                ->orderBy('nivel')
                ->get([
                    'id',
                    'nombre',
                    'nivel',
                ]),

            'estados' => EstadoMantenimiento::query()
                ->orderBy('id')
                ->get([
                    'id',
                    'codigo',
                    'nombre',
                ]),
        ]);
    }

    /**
     * Programar mantenimiento.
     */
    public function store(Request $request): JsonResponse
    {
        $this->autorizarAcceso($request);

        abort_unless(
            $this->puedeGestionar($request->user()),
            403,
            'No puedes programar mantenimientos.'
        );

        $datos = $request->validate([
            'plan_id' => [
                'required',
                'integer',
                Rule::exists(
                    'planes_mantenimiento',
                    'id'
                )->where('activo', 1),
            ],

            'prioridad_id' => [
                'required',
                'integer',
                'exists:prioridades,id',
            ],

            'fecha_programada' => [
                'required',
                'date_format:Y-m-d H:i:s',
            ],

            'observaciones' => [
                'nullable',
                'string',
                'max:5000',
            ],
        ]);

        $estadoPendiente = EstadoMantenimiento::query()
            ->where('codigo', 'PENDIENTE')
            ->firstOrFail();

        $mantenimiento = DB::transaction(
            function () use ($datos, $estadoPendiente) {
                return Mantenimiento::create([
                    'plan_id' => $datos['plan_id'],
                    'prioridad_id' => $datos['prioridad_id'],
                    'estado_mantenimiento_id' =>
                        $estadoPendiente->id,
                    'fecha_programada' =>
                        $datos['fecha_programada'],
                    'observaciones' =>
                        $datos['observaciones'] ?? null,
                ]);
            }
        );

        return response()->json([
            'message' =>
                'Mantenimiento programado correctamente.',
            'mantenimiento' => $mantenimiento->load([
                'plan',
                'estado',
                'prioridad',
            ]),
        ], 201);
    }

    /**
     * Consultar un mantenimiento.
     */
    public function show(
        Request $request,
        Mantenimiento $mantenimiento
    ): JsonResponse {
        $this->autorizarAcceso($request);

        $usuario = $request->user();

        if (!$this->puedeGestionar($usuario)) {
            abort_unless(
                $mantenimiento->tecnicos()
                    ->whereKey($usuario->id)
                    ->exists(),
                403,
                'No tienes acceso a este mantenimiento.'
            );
        }

        return response()->json(
            $mantenimiento->load([
                'plan',
                'estado',
                'prioridad',
                'tecnicos',
                'trabajoTerminadoPor',
                'cerradoPor',
            ])
        );
    }
}
