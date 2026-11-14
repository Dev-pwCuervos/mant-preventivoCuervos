
<?php

use App\Models\CategoriaEquipo;
use Illuminate\Validation\Rule;
use Livewire\Component;

new class extends Component
{
    public ?int $categoriaEditando = null;

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
                Rule::unique('categorias_equipos', 'nombre')
                    ->ignore($this->categoriaEditando),
            ],
            'descripcion' => [
                'nullable',
                'string',
            ],
        ]);

        if ($this->categoriaEditando !== null) {
            $categoria = CategoriaEquipo::findOrFail(
                $this->categoriaEditando
            );

            $categoria->update($datos);

            $mensaje = 'Categoría actualizada correctamente.';
        } else {
            CategoriaEquipo::create($datos);

            $mensaje = 'Categoría registrada correctamente.';
        }

        $this->cancelar();

        session()->flash('mensaje', $mensaje);
    }

    public function editar(int $id): void
    {
        $this->autorizarAdministrador();

        $categoria = CategoriaEquipo::findOrFail($id);

        $this->categoriaEditando = $categoria->id;
        $this->nombre = $categoria->nombre;
        $this->descripcion = $categoria->descripcion ?? '';
    }

    public function eliminar(int $id): void
    {
        $this->autorizarAdministrador();

        $categoria = CategoriaEquipo::findOrFail($id);

        if ($categoria->equipos()->exists()) {
            $this->addError(
                'eliminar',
                'No puedes eliminar una categoría con equipos asociados.'
            );

            return;
        }

        $categoria->delete();

        session()->flash(
            'mensaje',
            'Categoría eliminada correctamente.'
        );
    }

    public function cancelar(): void
    {
        $this->autorizarAdministrador();

        $this->reset([
            'categoriaEditando',
            'nombre',
            'descripcion',
        ]);

        $this->resetValidation();
    }

    public function with(): array
    {
        $this->autorizarAdministrador();

        return [
            'categorias' => CategoriaEquipo::withCount('equipos')
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
        Gestión de Categorías de Equipos
    </flux:heading>

    <flux:text>
        Administra las categorías utilizadas para
        clasificar los equipos de Cuervo.
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
    <form wire:submit="guardar" class="space-y-4">

        <flux:input
            wire:model="nombre"
            label="Nombre de la categoría"
            placeholder="Ej. Equipos eléctricos"
        />

        <flux:textarea
            wire:model="descripcion"
            label="Descripción"
            placeholder="Describe la categoría"
        />

        <div class="flex gap-2">

            <flux:button type="submit" variant="primary">
                {{ $categoriaEditando
                    ? 'Actualizar categoría'
                    : 'Registrar categoría' }}
            </flux:button>

            @if($categoriaEditando)
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
        label="Buscar categoría"
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
                    <th class="p-3">Acciones</th>
                </tr>
            </thead>

            <tbody>

                @forelse($categorias as $categoria)

                    <tr
                        wire:key="categoria-{{ $categoria->id }}"
                        class="border-b"
                    >

                        <td class="p-3">
                            {{ $categoria->nombre }}
                        </td>

                        <td class="p-3">
                            {{ $categoria->descripcion }}
                        </td>

                        <td class="p-3">
                            {{ $categoria->equipos_count }}
                        </td>

                        <td class="p-3">

                            <div class="flex gap-2">

                                <flux:button
                                    size="sm"
                                    wire:click="editar({{ $categoria->id }})"
                                >
                                    Editar
                                </flux:button>

                                <flux:button
                                    size="sm"
                                    variant="danger"
                                    wire:click="eliminar({{ $categoria->id }})"
                                    wire:confirm="¿Eliminar esta categoría?"
                                >
                                    Eliminar
                                </flux:button>

                            </div>

                        </td>

                    </tr>

                @empty

                    <tr>
                        <td colspan="4" class="p-4 text-center">
                            No hay categorías registradas.
                        </td>
                    </tr>

                @endforelse

            </tbody>

        </table>
    </div>
</div>
