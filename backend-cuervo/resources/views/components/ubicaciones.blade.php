
<?php

use App\Models\Ubicacion;
use Illuminate\Validation\Rule;
use Livewire\Component;

new class extends Component
{
    public ?int $ubicacionEditando = null;
    public bool $mostrarFormulario = false;

    public string $nombre = '';
    public string $descripcion = '';
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
            'nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique('ubicaciones', 'nombre')
                    ->ignore($this->ubicacionEditando),
            ],
            'descripcion' => [
                'nullable',
                'string',
            ],
        ]);

        if ($this->ubicacionEditando !== null) {

            $ubicacion = Ubicacion::findOrFail(
                $this->ubicacionEditando
            );

            $ubicacion->update($datos);

            $mensaje = 'Ubicación actualizada correctamente.';

        } else {

            Ubicacion::create([
                ...$datos,
                'activo' => true,
            ]);

            $mensaje = 'Ubicación registrada correctamente.';
        }

        $this->cancelar();

        session()->flash('mensaje', $mensaje);
    }

    public function abrirFormulario(): void
    {
        $this->cancelar();
        $this->mostrarFormulario = true;
    }

    public function editar(int $id): void
    {
        $this->autorizarAdministrador();

        $ubicacion = Ubicacion::findOrFail($id);

        $this->ubicacionEditando = $ubicacion->id;
        $this->nombre = $ubicacion->nombre;
        $this->descripcion = $ubicacion->descripcion ?? '';
        $this->mostrarFormulario = true;
    }

    public function cambiarEstado(int $id): void
    {
        $this->autorizarAdministrador();

        $ubicacion = Ubicacion::findOrFail($id);

        // Evitar desactivar ubicaciones con equipos activos
        if (
            $ubicacion->activo &&
            $ubicacion->equipos()->exists()
        ) {
            $this->addError(
                'estado',
                'No puedes desactivar una ubicación que tiene equipos registrados.'
            );

            return;
        }

        $ubicacion->update([
            'activo' => !$ubicacion->activo,
        ]);

        session()->flash(
            'mensaje',
            'Estado de ubicación actualizado.'
        );
    }

    public function cancelar(): void
    {
        $this->reset([
            'ubicacionEditando',
            'nombre',
            'descripcion',
        ]);

        $this->resetValidation();
        $this->mostrarFormulario = false;
    }

    public function with(): array
    {
        $this->autorizarAdministrador();

        return [
            'ubicaciones' => Ubicacion::withCount('equipos')
                ->where(
                    'nombre',
                    'like',
                    '%' . $this->busqueda . '%'
                )
                ->orderBy('nombre')
                ->get(),
        ];
    }
};

?>

<div class="max-w-6xl mx-auto p-6 space-y-6">

    <flux:heading size="xl">
        Gestión de Ubicaciones
    </flux:heading>

    <flux:text>
        Administra las áreas donde se encuentran
        los equipos de mantenimiento.
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
    <div class="flex justify-end">
        <flux:button type="button" variant="primary" wire:click="abrirFormulario">Nueva ubicaci?n</flux:button>
    </div>

    @if($mostrarFormulario)
        <section class="rounded-lg border border-zinc-200 p-5 dark:border-zinc-700">
        <h2 class="mb-4 text-lg font-semibold">{{ $ubicacionEditando ? 'Editar ubicaci?n' : 'Nueva ubicaci?n' }}</h2>
        <form wire:submit="guardar" class="space-y-4">

        <flux:input
            wire:model="nombre"
            label="Nombre de la ubicación"
            placeholder="Ej. Planta de producción"
        />

        <flux:textarea
            wire:model="descripcion"
            label="Descripción"
            placeholder="Describe la ubicación"
        />

        <div class="flex gap-2">

            <flux:button
                type="submit"
                variant="primary"
            >
                {{ $ubicacionEditando
                    ? 'Actualizar ubicación'
                    : 'Registrar ubicación' }}
            </flux:button>

            <flux:button
                type="button"
                wire:click="cancelar"
            >
                Cancelar
            </flux:button>

        </div>
        </form>
        </section>
    @endif

    <flux:separator />

    <!-- BUSCADOR -->
    <flux:input
        wire:model.live.debounce.300ms="busqueda"
        label="Buscar ubicación"
        placeholder="Buscar por nombre"
    />

    <!-- TABLA -->
    <div class="overflow-x-auto">

        <table class="w-full text-left">

            <thead>
                <tr class="border-b">
                    <th class="p-3">Nombre</th>
                    <th class="p-3">Descripción</th>
                    <th class="p-3">Equipos</th>
                    <th class="p-3">Estado</th>
                    <th class="p-3">Acciones</th>
                </tr>
            </thead>

            <tbody>

                @forelse($ubicaciones as $ubicacion)

                    <tr
                        wire:key="ubicacion-{{ $ubicacion->id }}"
                        class="border-b"
                    >

                        <td class="p-3">
                            {{ $ubicacion->nombre }}
                        </td>

                        <td class="p-3">
                            {{ $ubicacion->descripcion }}
                        </td>

                        <td class="p-3">
                            {{ $ubicacion->equipos_count }}
                        </td>

                        <td class="p-3">

                            @if($ubicacion->activo)
                                <span class="text-green-600">
                                    Activa
                                </span>
                            @else
                                <span class="text-red-500">
                                    Inactiva
                                </span>
                            @endif

                        </td>

                        <td class="p-3">
                            <div class="flex gap-2">

                                <flux:button
                                    size="sm"
                                    wire:click="editar({{ $ubicacion->id }})"
                                >
                                    Editar
                                </flux:button>

                                <flux:button
                                    size="sm"
                                    wire:click="cambiarEstado({{ $ubicacion->id }})"
                                    wire:confirm="¿Cambiar estado de esta ubicación?"
                                >
                                    {{ $ubicacion->activo
                                        ? 'Desactivar'
                                        : 'Activar' }}
                                </flux:button>

                            </div>
                        </td>

                    </tr>

                @empty

                    <tr>
                        <td colspan="5" class="p-4 text-center">
                            No hay ubicaciones registradas.
                        </td>
                    </tr>

                @endforelse

            </tbody>
        </table>
    </div>
</div>
