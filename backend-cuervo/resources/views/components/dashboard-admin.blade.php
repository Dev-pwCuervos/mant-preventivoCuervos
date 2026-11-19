<?php

use App\Models\Equipo;
use App\Models\User;
use App\Models\Ubicacion;
use App\Models\CategoriaEquipo;
use App\Models\EstadoEquipo;
use App\Models\PlanMantenimiento;
use Livewire\Component;

new class extends Component
{
    private function autorizarDashboard(): void
    {
        abort_unless(
            auth()->check()
            && auth()->user()->activo
            && auth()->user()->roles()->whereIn('nombre', ['Administrador', 'Supervisor'])->exists(),
            403
        );
    }

    public function mount(): void
    {
        $this->autorizarDashboard();
    }

    public function with(): array
    {
        $this->autorizarDashboard();

        $esAdministrador = auth()->user()->tieneRol('Administrador');
        $estados = EstadoEquipo::withCount('equipos')
            ->orderBy('nombre')
            ->get();

        $datos = [
            'esAdministrador' => $esAdministrador,
            'totalEquipos' => Equipo::count(),
            'planesActivos' => PlanMantenimiento::where('activo', true)
                ->count(),
            'totalCategorias' => CategoriaEquipo::count(),
            'totalEstados' => $estados->count(),
            'equiposRetirados' => Equipo::onlyTrashed()->count(),
            'estados' => $estados,
            'equiposRecientes' => Equipo::with([
                'categoria',
                'ubicacion',
                'estado',
            ])
                ->latest('id')
                ->take(5)
                ->get(),

            'planesRecientes' => PlanMantenimiento::with('equipo')
                ->latest('id')
                ->take(5)
                ->get(),
        ];

        if ($esAdministrador) {
            $datos['usuariosActivos'] = User::where('activo', true)->count();
            $datos['ubicacionesActivas'] = Ubicacion::where('activo', true)->count();
        }

        return $datos;
    }
};

?>

<div class="cuervo-dashboard mx-auto max-w-7xl space-y-6 p-5 sm:p-8">

    <!-- ENCABEZADO -->
    <header class="cuervo-dashboard-heading">
        <span class="cuervo-eyebrow">PANEL DE CONTROL</span>
        <h1>{{ $esAdministrador ? 'Dashboard Administrativo' : 'Dashboard de Supervisor' }}</h1>
        <p>{{ $esAdministrador ? 'Resumen general del Sistema Cuervo' : 'Resumen de equipos y planes de mantenimiento' }}</p>
    </header>

    <!-- INDICADORES -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

        <div class="cuervo-panel cuervo-metric">
            <flux:text>Equipos registrados</flux:text>
            <div class="cuervo-metric-value">
                {{ $totalEquipos }}
            </div>
        </div>

        @if($esAdministrador)
            <div class="cuervo-panel cuervo-metric">
                <flux:text>Usuarios activos</flux:text>
                <div class="cuervo-metric-value">{{ $usuariosActivos }}</div>
            </div>

            <div class="cuervo-panel cuervo-metric">
                <flux:text>Ubicaciones activas</flux:text>
                <div class="cuervo-metric-value">{{ $ubicacionesActivas }}</div>
            </div>
        @else
            <div class="cuervo-panel cuervo-metric">
                <flux:text>Categorías registradas</flux:text>
                <div class="cuervo-metric-value">{{ $totalCategorias }}</div>
            </div>

            <div class="cuervo-panel cuervo-metric">
                <flux:text>Estados registrados</flux:text>
                <div class="cuervo-metric-value">{{ $totalEstados }}</div>
            </div>
        @endif

        <div class="cuervo-panel cuervo-metric">
            <flux:text>Planes activos</flux:text>
            <div class="cuervo-metric-value">
                {{ $planesActivos }}
            </div>
        </div>

    </div>

    <!-- INDICADORES ADICIONALES -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">

        @if($esAdministrador)
            <div class="cuervo-panel cuervo-metric">
                <flux:text>Categorías registradas</flux:text>
                <div class="cuervo-metric-value cuervo-metric-value-small">
                    {{ $totalCategorias }}
                </div>
            </div>
        @endif

        <div class="cuervo-panel cuervo-metric">
            <flux:text>Equipos retirados</flux:text>
            <div class="cuervo-metric-value cuervo-metric-value-small">
                {{ $equiposRetirados }}
            </div>
        </div>

    </div>

    <!-- EQUIPOS POR ESTADO -->
    <div class="cuervo-panel">

        <flux:heading size="lg">
            Equipos por estado
        </flux:heading>

        <div class="mt-5 space-y-4">

            @forelse($estados as $estado)

                <div class="space-y-2">

                    <div class="flex items-center justify-between">
                        <span class="text-sm">
                            {{ $estado->nombre }}
                        </span>

                        <span class="text-sm font-semibold">
                            {{ $estado->equipos_count }}
                        </span>
                    </div>

                    <div class="cuervo-progress">

                        <div
                            class="cuervo-progress-fill"
                            style="width: {{ $totalEquipos > 0
                                ? ($estado->equipos_count / $totalEquipos) * 100
                                : 0 }}%"
                        ></div>

                    </div>

                </div>

            @empty

                <flux:text>
                    No hay estados registrados.
                </flux:text>

            @endforelse

        </div>

    </div>

    <!-- EQUIPOS RECIENTES -->
    <div class="cuervo-panel">

        <flux:heading size="lg">
            Últimos equipos registrados
        </flux:heading>

        <div class="mt-4 overflow-x-auto">

            <table class="cuervo-data-table w-full text-left text-sm">

                <thead>
                    <tr class="border-b border-slate-100">
                        <th class="p-3">Código</th>
                        <th class="p-3">Equipo</th>
                        <th class="p-3">Categoría</th>
                        <th class="p-3">Ubicación</th>
                        <th class="p-3">Estado</th>
                    </tr>
                </thead>

                <tbody>
                    @forelse($equiposRecientes as $equipo)

                        <tr class="border-b border-slate-100">

                            <td class="p-3">
                                {{ $equipo->codigo }}
                            </td>

                            <td class="p-3">
                                {{ $equipo->nombre }}
                            </td>

                            <td class="p-3">
                                {{ $equipo->categoria?->nombre ?? 'Sin categoría' }}
                            </td>

                            <td class="p-3">
                                {{ $equipo->ubicacion?->nombre ?? 'Sin ubicación' }}
                            </td>

                            <td class="p-3">
                                {{ $equipo->estado?->nombre ?? 'Sin estado' }}
                            </td>

                        </tr>

                    @empty

                        <tr>
                            <td colspan="5" class="p-4 text-center">
                                No hay equipos registrados.
                            </td>
                        </tr>

                    @endforelse
                </tbody>

            </table>

        </div>
    </div>

    <!-- PLANES RECIENTES -->
    <div class="cuervo-panel">

        <flux:heading size="lg">
            Últimos planes de mantenimiento
        </flux:heading>

        <div class="mt-4 overflow-x-auto">

            <table class="cuervo-data-table w-full text-left text-sm">

                <thead>
                    <tr class="border-b border-slate-100">
                        <th class="p-3">Equipo</th>
                        <th class="p-3">Plan</th>
                        <th class="p-3">Frecuencia</th>
                        <th class="p-3">Estado</th>
                    </tr>
                </thead>

                <tbody>
                    @forelse($planesRecientes as $plan)

                        <tr class="border-b border-slate-100">

                            <td class="p-3">
                                {{ $plan->equipo?->nombre ?? 'Equipo retirado' }}
                            </td>

                            <td class="p-3">
                                {{ $plan->nombre }}
                            </td>

                            <td class="p-3">
                                Cada {{ $plan->frecuencia_dias }} días
                            </td>

                            <td class="p-3">
                                {{ $plan->activo ? 'Activo' : 'Inactivo' }}
                            </td>

                        </tr>

                    @empty

                        <tr>
                            <td colspan="4" class="p-4 text-center">
                                No hay planes registrados.
                            </td>
                        </tr>

                    @endforelse
                </tbody>

            </table>

        </div>
    </div>

</div>
