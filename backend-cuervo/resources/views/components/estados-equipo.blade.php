<?php

use App\Models\EstadoEquipo;
use Illuminate\Validation\Rule;
use Livewire\Component;

new class extends Component
{
    public ?int $estadoEditando = null;
    public bool $mostrarFormulario = false;

    public string $codigo = '';
    public string $nombre = '';
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
            'codigo' => [
                'required',
                'string',
                'max:30',
                'regex:/^[A-Za-z0-9_-]+$/',
                Rule::unique('estados_equipo', 'codigo')
                    ->ignore($this->estadoEditando),
            ],
            'nombre' => [
                'required',
                'string',
                'max:100',
                Rule::unique('estados_equipo', 'nombre')
                    ->ignore($this->estadoEditando),
            ],
        ]);

        $datos['codigo'] = strtoupper($datos['codigo']);

        if ($this->estadoEditando !== null) {

            $estado = EstadoEquipo::findOrFail(
                $this->estadoEditando
            );

            // Evitar cambiar el código si tiene equipos asociados
            if (
                $estado->codigo !== $datos['codigo']
                && $estado->equipos()->exists()
            ) {
                $this->addError(
                    'codigo',
                    'No puedes cambiar el código de un estado que tiene equipos asociados.'
                );

                return;
            }

            $estado->update($datos);

            $mensaje = 'Estado actualizado correctamente.';

        } else {

            EstadoEquipo::create($datos);

            $mensaje = 'Estado registrado correctamente.';
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

        $estado = EstadoEquipo::findOrFail($id);

        $this->estadoEditando = $estado->id;
        $this->codigo = $estado->codigo;
        $this->nombre = $estado->nombre;
        $this->mostrarFormulario = true;
    }

    public function eliminar(int $id): void
    {
        $this->autorizarAdministrador();

        $estado = EstadoEquipo::findOrFail($id);

        if ($estado->equipos()->exists()) {
            $this->addError(
                'eliminar',
                'No puedes eliminar un estado que tiene equipos asociados.'
            );

            return;
        }

        $estado->delete();

        session()->flash(
            'mensaje',
            'Estado eliminado correctamente.'
        );
    }

    public function cancelar(): void
    {
        $this->autorizarAdministrador();

        $this->reset([
            'estadoEditando',
            'codigo',
            'nombre',
        ]);

        $this->resetValidation();
        $this->mostrarFormulario = false;
    }

    public function with(): array
    {
        $this->autorizarAdministrador();

        return [
            'estados' => EstadoEquipo::withCount('equipos')
                ->where(function ($query) {
                    $query->where(
                        'nombre',
                        'like',
                        '%' . $this->busqueda . '%'
                    )->orWhere(
                        'codigo',
                        'like',
                        '%' . $this->busqueda . '%'
                    );
                })
                ->orderBy('nombre')
                ->get(),
        ];
    }
};

?>

<div class="max-w-6xl mx-auto p-6 space-y-6">

    <flux:heading size="xl">
        Gestión de Estados de Equipos
    </flux:heading>

    <flux:text>
        Administra los estados operativos de los equipos
        registrados en Cuervo.
    </flux:text>

    @if(session()->has('mensaje'))
        <div class="rounded bg-green-100 p-3 text-green-800">
            {{ session('mensaje') }}
        </div>
    @endif

    @error('eliminar')
        <div class="rounded bg-red-100 p-3 text-red-800">
            {{ $message }}
        </div>
    @enderror

    <!-- FORMULARIO -->
    <div class="flex justify-end">
        <flux:button type="button" variant="primary" wire:click="abrirFormulario">Nuevo estado</flux:button>
    </div>

    @if($mostrarFormulario)
        <section class="rounded-lg border border-zinc-200 p-5 dark:border-zinc-700">
        <h2 class="mb-4 text-lg font-semibold">{{ $estadoEditando ? 'Editar estado' : 'Nuevo estado' }}</h2>
        <form wire:submit="guardar" class="space-y-4">

        <flux:input
            wire:model="codigo"
            label="Código del estado"
            placeholder="Ej. OPERATIVO"
        />

        <flux:input
            wire:model="nombre"
            label="Nombre del estado"
            placeholder="Ej. Operativo"
        />

        <div class="flex gap-2">

            <flux:button
                type="submit"
                variant="primary"
            >
                {{ $estadoEditando
                    ? 'Actualizar estado'
                    : 'Registrar estado' }}
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
        label="Buscar estado"
        placeholder="Buscar por nombre o código"
    />

    <!-- TABLA -->
    <div class="overflow-x-auto">

        <table class="w-full text-left">

            <thead>
                <tr class="border-b">
                    <th class="p-3">Código</th>
                    <th class="p-3">Nombre</th>
                    <th class="p-3">Equipos</th>
                    <th class="p-3">Acciones</th>
                </tr>
            </thead>

            <tbody>

                @forelse($estados as $estado)

                    <tr
                        wire:key="estado-{{ $estado->id }}"
                        class="border-b"
                    >

                        <td class="p-3">
                            {{ $estado->codigo }}
                        </td>

                        <td class="p-3">
                            {{ $estado->nombre }}
                        </td>

                        <td class="p-3">
                            {{ $estado->equipos_count }}
                        </td>

                        <td class="p-3">
                            <div class="flex gap-2">

                                <flux:button
                                    size="sm"
                                    wire:click="editar({{ $estado->id }})"
                                >
                                    Editar
                                </flux:button>

                                <flux:button
                                    size="sm"
                                    variant="danger"
                                    wire:click="eliminar({{ $estado->id }})"
                                    wire:confirm="¿Eliminar este estado?"
                                >
                                    Eliminar
                                </flux:button>

                            </div>
                        </td>

                    </tr>

                @empty

                    <tr>
                        <td colspan="4" class="p-4 text-center">
                            No hay estados registrados.
                        </td>
                    </tr>

                @endforelse

            </tbody>

        </table>
    </div>
</div>
