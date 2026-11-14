
<?php

use App\Models\Rol;
use Illuminate\Validation\Rule;
use Livewire\Component;

new class extends Component
{
    public string $nombre = '';
    public string $descripcion = '';

    public ?int $rolEditando = null;

    public function guardar(): void
    {
        $datos = $this->validate([
            'nombre' => [
                'required',
                'string',
                'max:50',
                Rule::unique('roles', 'nombre')
                    ->ignore($this->rolEditando),
            ],
            'descripcion' => [
                'nullable',
                'string',
                'max:255',
            ],
        ]);

        if ($this->rolEditando !== null) {
            $rol = Rol::findOrFail($this->rolEditando);

            // No permitir renombrar roles principales
            if (in_array($rol->nombre, [
                'Administrador',
                'Supervisor',
                'Técnico',
            ]) && $datos['nombre'] !== $rol->nombre) {
                $this->addError(
                    'nombre',
                    'No puedes cambiar el nombre de un rol principal.'
                );
                return;
            }

            $rol->update($datos);
        } else {
            Rol::create($datos);
        }

        session()->flash(
            'mensaje',
            'Rol guardado correctamente.'
        );

        $this->cancelar();
    }

    public function editar(int $id): void
    {
        $rol = Rol::findOrFail($id);

        $this->rolEditando = $rol->id;
        $this->nombre = $rol->nombre;
        $this->descripcion = $rol->descripcion ?? '';
    }

    public function cancelar(): void
    {
        $this->reset([
            'nombre',
            'descripcion',
            'rolEditando',
        ]);
        $this->resetValidation();
    }

    public function eliminar(int $id): void
    {
        $rol = Rol::findOrFail($id);

        if (in_array($rol->nombre, [
            'Administrador',
            'Supervisor',
            'Técnico',
        ])) {
            $this->addError(
                'eliminar',
                'No puedes eliminar un rol principal.'
            );
            return;
        }

        if ($rol->usuarios()->exists()) {
            $this->addError(
                'eliminar',
                'No puedes eliminar un rol asignado a usuarios.'
            );
            return;
        }

        $rol->delete();

        session()->flash(
            'mensaje',
            'Rol eliminado correctamente.'
        );
    }

    public function with(): array
    {
        return [
            'roles' => Rol::orderBy('nombre')->get(),
        ];
    }
};

?>

<div class="max-w-5xl mx-auto p-6 space-y-6">

    <h1 class="text-2xl font-bold">
        Gestión de Roles
    </h1>

    @if (session()->has('mensaje'))
        <div class="p-3 rounded bg-green-100 text-green-800">
            {{ session('mensaje') }}
        </div>
    @endif

    @error('eliminar')
        <div class="p-3 rounded bg-red-100 text-red-800">
            {{ $message }}
        </div>
    @enderror

    <form wire:submit="guardar" class="space-y-4">

        <flux:input
            wire:model="nombre"
            label="Nombre del rol"
            placeholder="Ej. Supervisor"
        />

        <flux:textarea
            wire:model="descripcion"
            label="Descripción"
            placeholder="Responsabilidades del rol"
        />

        <div class="flex gap-2">
            <flux:button type="submit" variant="primary">
                {{ $rolEditando ? 'Actualizar rol' : 'Guardar rol' }}
            </flux:button>

            @if ($rolEditando)
                <flux:button type="button" wire:click="cancelar">
                    Cancelar
                </flux:button>
            @endif
        </div>
    </form>

    <div class="overflow-x-auto">
        <table class="w-full text-left border-collapse">
            <thead>
                <tr class="border-b">
                    <th class="p-3">ID</th>
                    <th class="p-3">Nombre</th>
                    <th class="p-3">Descripción</th>
                    <th class="p-3">Acciones</th>
                </tr>
            </thead>

            <tbody>
                @forelse ($roles as $rol)
                    <tr wire:key="rol-{{ $rol->id }}" class="border-b">
                        <td class="p-3">{{ $rol->id }}</td>
                        <td class="p-3">{{ $rol->nombre }}</td>
                        <td class="p-3">{{ $rol->descripcion }}</td>
                        <td class="p-3">
                            <div class="flex gap-2">
                                <flux:button
                                    size="sm"
                                    wire:click="editar({{ $rol->id }})"
                                >
                                    Editar
                                </flux:button>

                                <flux:button
                                    size="sm"
                                    variant="danger"
                                    wire:click="eliminar({{ $rol->id }})"
                                    wire:confirm="¿Eliminar este rol?"
                                >
                                    Eliminar
                                </flux:button>
                            </div>
                        </td>
                    </tr>
                @empty
                    <tr>
                        <td colspan="4" class="p-4 text-center">
                            No hay roles registrados.
                        </td>
                    </tr>
                @endforelse
            </tbody>
        </table>
    </div>
</div>
