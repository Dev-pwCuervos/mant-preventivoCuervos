
<?php

use App\Models\Equipo;
use App\Models\PlanMantenimiento;
use Illuminate\Validation\Rule;
use Livewire\Component;

new class extends Component
{
    public ?int $planEditando = null;

    public string $equipo_id = '';
    public string $nombre = '';
    public string $descripcion = '';
    public string $frecuencia_dias = '';
    public string $fecha_inicio = '';

    public string $busqueda = '';

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

    public function guardar(): void
    {
        $this->autorizarAdministrador();

        $datos = $this->validate([
            'equipo_id' => [
                'required',
                'integer',
                Rule::exists('equipos', 'id')
                    ->whereNull('deleted_at'),
            ],
            'nombre' => [
                'required',
                'string',
                'max:150',
            ],
            'descripcion' => [
                'nullable',
                'string',
            ],
            'frecuencia_dias' => [
                'required',
                'integer',
                'min:1',
                'max:3650',
            ],
            'fecha_inicio' => [
                'required',
                'date',
            ],
        ]);

        if ($this->planEditando !== null) {

            $plan = PlanMantenimiento::findOrFail(
                $this->planEditando
            );

            $plan->update($datos);

            $mensaje = 'Plan actualizado correctamente.';

        } else {

            PlanMantenimiento::create([
                ...$datos,
                'activo' => true,
            ]);

            $mensaje = 'Plan registrado correctamente.';
        }

        $this->cancelar();

        session()->flash('mensaje', $mensaje);
    }

    public function editar(int $id): void
    {
        $this->autorizarAdministrador();

        $plan = PlanMantenimiento::findOrFail($id);

        $this->planEditando = $plan->id;
        $this->equipo_id = (string) $plan->equipo_id;
        $this->nombre = $plan->nombre;
        $this->descripcion = $plan->descripcion ?? '';
        $this->frecuencia_dias = (string) $plan->frecuencia_dias;
        $this->fecha_inicio = $plan->fecha_inicio
            ? $plan->fecha_inicio->format('Y-m-d')
            : '';
    }

    public function cambiarEstado(int $id): void
    {
        $this->autorizarAdministrador();

        $plan = PlanMantenimiento::findOrFail($id);

        // Evitar activar planes de equipos retirados
        if (!$plan->activo && !$plan->equipo) {
            $this->addError(
                'estado',
                'No puedes activar un plan de un equipo retirado.'
            );
            return;
        }

        $plan->update([
            'activo' => !$plan->activo,
        ]);

        session()->flash(
            'mensaje',
            'Estado del plan actualizado.'
        );
    }

    public function cancelar(): void
    {
        $this->autorizarAdministrador();

        $this->reset([
            'planEditando',
            'equipo_id',
            'nombre',
            'descripcion',
            'frecuencia_dias',
            'fecha_inicio',
        ]);

        $this->resetValidation();
    }

    public function with(): array
    {
        $this->autorizarAdministrador();

        return [
            'planes' => PlanMantenimiento::with('equipo')
                ->where(function ($query) {
                    $query->where(
                        'nombre',
                        'like',
                        '%' . $this->busqueda . '%'
                    )->orWhereHas('equipo', function ($equipo) {
                        $equipo->where(
                            'nombre',
                            'like',
                            '%' . $this->busqueda . '%'
                        );
                    });
                })
                ->orderBy('nombre')
                ->get(),

            'equipos' => Equipo::orderBy('nombre')->get(),
        ];
    }
};

?>

<div class="max-w-6xl mx-auto p-6 space-y-6">

    <flux:heading size="xl">
        Gestión de Planes de Mantenimiento
    </flux:heading>

    <flux:text>
        Configura los planes preventivos de los equipos
        registrados en Cuervo.
    </flux:text>

    @if(session()->has('mensaje'))
        <div class="rounded bg-green-100 p-3 text-green-800">
            {{ session('mensaje') }}
        </div>
    @endif

    @error('estado')
        <div class="rounded bg-red-100 p-3 text-red-800">
            {{ $message }}
        </div>
    @enderror

    <!-- FORMULARIO -->
    <form wire:submit="guardar" class="space-y-4">

        <flux:select
            wire:model="equipo_id"
            label="Equipo"
            placeholder="Seleccione un equipo"
        >
            @foreach($equipos as $equipo)
                <flux:select.option value="{{ $equipo->id }}">
                    {{ $equipo->codigo }} - {{ $equipo->nombre }}
                </flux:select.option>
            @endforeach
        </flux:select>

        <flux:input
            wire:model="nombre"
            label="Nombre del plan"
            placeholder="Ej. Lubricación preventiva"
        />

        <flux:textarea
            wire:model="descripcion"
            label="Descripción"
            placeholder="Describe las actividades del plan"
        />

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <flux:input
                wire:model="frecuencia_dias"
                type="number"
                min="1"
                label="Frecuencia en días"
                placeholder="Ej. 30"
            />

            <flux:input
                wire:model="fecha_inicio"
                type="date"
                label="Fecha de inicio"
            />

        </div>

        <div class="flex gap-2">

            <flux:button type="submit" variant="primary">
                {{ $planEditando
                    ? 'Actualizar plan'
                    : 'Registrar plan' }}
            </flux:button>

            @if($planEditando)
                <flux:button
                    type="button"
                    wire:click="cancelar"
                >
                    Cancelar
                </flux:button>
            @endif

        </div>
    </form>

    <flux:separator />

    <!-- BUSCADOR -->
    <flux:input
        wire:model.live.debounce.300ms="busqueda"
        label="Buscar planes"
        placeholder="Buscar por plan o equipo"
    />

    <!-- TABLA -->
    <div class="overflow-x-auto">

        <table class="w-full text-left">
            <thead>
                <tr class="border-b">
                    <th class="p-3">Equipo</th>
                    <th class="p-3">Plan</th>
                    <th class="p-3">Frecuencia</th>
                    <th class="p-3">Fecha de inicio</th>
                    <th class="p-3">Estado</th>
                    <th class="p-3">Acciones</th>
                </tr>
            </thead>

            <tbody>
                @forelse($planes as $plan)
                    <tr
                        wire:key="plan-{{ $plan->id }}"
                        class="border-b"
                    >
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
                            {{ $plan->fecha_inicio?->format('d/m/Y') }}
                        </td>

                        <td class="p-3">
                            @if($plan->activo)
                                <span class="text-green-600">Activo</span>
                            @else
                                <span class="text-red-500">Inactivo</span>
                            @endif
                        </td>

                        <td class="p-3">
                            <div class="flex gap-2">

                                <flux:button
                                    size="sm"
                                    wire:click="editar({{ $plan->id }})"
                                >
                                    Editar
                                </flux:button>

                                <flux:button
                                    size="sm"
                                    wire:click="cambiarEstado({{ $plan->id }})"
                                    wire:confirm="¿Cambiar el estado de este plan?"
                                >
                                    {{ $plan->activo
                                        ? 'Desactivar'
                                        : 'Activar' }}
                                </flux:button>

                            </div>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="6" class="p-4 text-center">
                            No hay planes registrados.
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</div>
