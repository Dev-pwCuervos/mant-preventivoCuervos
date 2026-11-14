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
    private function autorizarAdministrador(): void
    {
        abort_unless(
            auth()->check()
            && auth()->user()->activo
            && auth()->user()->tieneRol('Administrador'),
            403
        );
    }

    public function mount(): void
    {
        $this->autorizarAdministrador();
    }

    public function with(): array
    {
        $this->autorizarAdministrador();

        return [
            'totalEquipos' => Equipo::count(),

            'usuariosActivos' => User::where('activo', true)
                ->count(),

            'ubicacionesActivas' => Ubicacion::where('activo', true)
                ->count(),

            'planesActivos' => PlanMantenimiento::where('activo', true)
                ->count(),

            'totalCategorias' => CategoriaEquipo::count(),

            'equiposRetirados' => Equipo::onlyTrashed()->count(),

            'estados' => EstadoEquipo::withCount('equipos')
                ->orderBy('nombre')
                ->get(),

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
    }
};

?>

<div class="mx-auto max-w-7xl space-y-6 p-6">

    <!-- ENCABEZADO -->
    <div>
        <flux:heading size="xl">
            Dashboard Administrativo
        </flux:heading>

        <flux:text>
            Resumen general del Sistema Cuervo
        </flux:text>
    </div>

    <!-- INDICADORES -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">

        <div class="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
            <flux:text>Equipos registrados</flux:text>
            <div class="mt-3 text-3xl font-bold">
                {{ $totalEquipos }}
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
            <flux:text>Usuarios activos</flux:text>
            <div class="mt-3 text-3xl font-bold">
                {{ $usuariosActivos }}
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
            <flux:text>Ubicaciones activas</flux:text>
            <div class="mt-3 text-3xl font-bold">
                {{ $ubicacionesActivas }}
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
            <flux:text>Planes activos</flux:text>
            <div class="mt-3 text-3xl font-bold">
                {{ $planesActivos }}
            </div>
        </div>

    </div>

    <!-- INDICADORES ADICIONALES -->
    <div class="grid grid-cols-1 gap-4 md:grid-cols-2">

        <div class="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
            <flux:text>Categorías registradas</flux:text>
            <div class="mt-2 text-2xl font-semibold">
                {{ $totalCategorias }}
            </div>
        </div>

        <div class="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">
            <flux:text>Equipos retirados</flux:text>
            <div class="mt-2 text-2xl font-semibold">
                {{ $equiposRetirados }}
            </div>
        </div>

    </div>

    <!-- EQUIPOS POR ESTADO -->
    <div class="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">

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

                    <div class="h-3 overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-700">

                        <div
                            class="h-full rounded-full bg-blue-600"
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
    <div class="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">

        <flux:heading size="lg">
            Últimos equipos registrados
        </flux:heading>

        <div class="mt-4 overflow-x-auto">

            <table class="w-full text-left text-sm">

                <thead>
                    <tr class="border-b dark:border-zinc-700">
                        <th class="p-3">Código</th>
                        <th class="p-3">Equipo</th>
                        <th class="p-3">Categoría</th>
                        <th class="p-3">Ubicación</th>
                        <th class="p-3">Estado</th>
                    </tr>
                </thead>

                <tbody>
                    @forelse($equiposRecientes as $equipo)

                        <tr class="border-b dark:border-zinc-700">

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
    <div class="rounded-xl border border-zinc-200 p-5 dark:border-zinc-700">

        <flux:heading size="lg">
            Últimos planes de mantenimiento
        </flux:heading>

        <div class="mt-4 overflow-x-auto">

            <table class="w-full text-left text-sm">

                <thead>
                    <tr class="border-b dark:border-zinc-700">
                        <th class="p-3">Equipo</th>
                        <th class="p-3">Plan</th>
                        <th class="p-3">Frecuencia</th>
                        <th class="p-3">Estado</th>
                    </tr>
                </thead>

                <tbody>
                    @forelse($planesRecientes as $plan)

                        <tr class="border-b dark:border-zinc-700">

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
