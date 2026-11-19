
<?php

use App\Models\Equipo;
use App\Models\Ubicacion;
use App\Models\CategoriaEquipo;
use App\Models\EstadoEquipo;
use Illuminate\Validation\Rule;
use Livewire\Component;

new class extends Component
{
    public ?int $equipoEditando = null;
    public bool $mostrarFormulario = false;

    public string $codigo = '';
    public string $nombre = '';
    public string $descripcion = '';
    public string $marca = '';
    public string $modelo = '';
    public string $numero_serie = '';

    public string $categoria_id = '';
    public string $ubicacion_id = '';
    public string $estado_equipo_id = '';
    public string $fecha_adquisicion = '';

    public string $busqueda = '';
    public bool $mostrarRetirados = false;

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
                Rule::unique('equipos', 'codigo')
                    ->ignore($this->equipoEditando),
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
            'marca' => [
                'nullable',
                'string',
                'max:100',
            ],
            'modelo' => [
                'nullable',
                'string',
                'max:100',
            ],
            'numero_serie' => [
                'nullable',
                'string',
                'max:100',
            ],
            'categoria_id' => [
                'required',
                'integer',
                Rule::exists('categorias_equipos', 'id'),
            ],
            'ubicacion_id' => [
                'required',
                'integer',
                Rule::exists('ubicaciones', 'id')
                    ->where('activo', 1),
            ],
            'estado_equipo_id' => [
                'required',
                'integer',
                Rule::exists('estados_equipo', 'id'),
            ],
            'fecha_adquisicion' => [
                'nullable',
                'date',
            ],
        ]);

        if ($this->equipoEditando !== null) {
            $equipo = Equipo::findOrFail(
                $this->equipoEditando
            );

            $equipo->update($datos);

            $mensaje = 'Equipo actualizado correctamente.';
        } else {
            Equipo::create($datos);

            $mensaje = 'Equipo registrado correctamente.';
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

        $equipo = Equipo::findOrFail($id);

        $this->equipoEditando = $equipo->id;
        $this->codigo = $equipo->codigo;
        $this->nombre = $equipo->nombre;
        $this->descripcion = $equipo->descripcion ?? '';
        $this->marca = $equipo->marca ?? '';
        $this->modelo = $equipo->modelo ?? '';
        $this->numero_serie = $equipo->numero_serie ?? '';

        $this->categoria_id = (string) $equipo->categoria_id;
        $this->ubicacion_id = (string) $equipo->ubicacion_id;
        $this->estado_equipo_id = (string) $equipo->estado_equipo_id;

        $this->fecha_adquisicion = $equipo->fecha_adquisicion
            ? $equipo->fecha_adquisicion->format('Y-m-d')
            : '';
        $this->mostrarFormulario = true;
    }

    public function retirar(int $id): void
    {
        $this->autorizarAdministrador();

        $equipo = Equipo::findOrFail($id);

        // Evitar retirar equipos con mantenimientos abiertos
        $tieneAbiertos = $equipo->planesMantenimiento()
            ->whereHas('mantenimientos', function ($query) {
                $query->whereHas('estado', function ($estado) {
                    $estado->whereNotIn(
                        'codigo',
                        ['CERRADO', 'CANCELADO']
                    );
                });
            })
            ->exists();

        if ($tieneAbiertos) {
            $this->addError(
                'retirar',
                'No puedes retirar un equipo con mantenimientos pendientes.'
            );

            return;
        }

        $equipo->delete();

        session()->flash(
            'mensaje',
            'Equipo retirado correctamente.'
        );
    }

    public function restaurar(int $id): void
    {
        $this->autorizarAdministrador();

        $equipo = Equipo::onlyTrashed()->findOrFail($id);

        $equipo->restore();

        session()->flash(
            'mensaje',
            'Equipo restaurado correctamente.'
        );
    }

    public function cancelar(): void
    {
        $this->autorizarAdministrador();

        $this->reset([
            'equipoEditando',
            'codigo',
            'nombre',
            'descripcion',
            'marca',
            'modelo',
            'numero_serie',
            'categoria_id',
            'ubicacion_id',
            'estado_equipo_id',
            'fecha_adquisicion',
        ]);

        $this->resetValidation();
        $this->mostrarFormulario = false;
    }

    public function with(): array
    {
        $this->autorizarAdministrador();

        $consulta = Equipo::with([
            'categoria',
            'ubicacion',
            'estado',
        ]);

        if ($this->mostrarRetirados) {
            $consulta->onlyTrashed();
        }

        $consulta->where(function ($query) {
            $query->where(
                'codigo',
                'like',
                '%' . $this->busqueda . '%'
            )->orWhere(
                'nombre',
                'like',
                '%' . $this->busqueda . '%'
            );
        });

        return [
            'equipos' => $consulta
                ->orderBy('nombre')
                ->get(),

            'categorias' => CategoriaEquipo::orderBy('nombre')
                ->get(),

            'ubicaciones' => Ubicacion::where('activo', true)
                ->orderBy('nombre')
                ->get(),

            'estados' => EstadoEquipo::orderBy('nombre')
                ->get(),
        ];
    }
};

?>

<div class="max-w-7xl mx-auto p-6 space-y-6">

    <flux:heading size="xl">
        Gestión de Equipos
    </flux:heading>

    <flux:text>
        Administra los equipos registrados en Cuervo
        y sus características operativas.
    </flux:text>

    @if(session()->has('mensaje'))
        <div class="rounded bg-green-100 p-3 text-green-800">
            {{ session('mensaje') }}
        </div>
    @endif

    @error('retirar')
        <div class="rounded bg-red-100 p-3 text-red-800">
            {{ $message }}
        </div>
    @enderror

    <!-- FORMULARIO -->
    <div class="flex justify-end">
        <flux:button type="button" variant="primary" wire:click="abrirFormulario">Nuevo equipo</flux:button>
    </div>

    @if($mostrarFormulario)
        <section class="rounded-lg border border-zinc-200 p-5 dark:border-zinc-700">
        <h2 class="mb-4 text-lg font-semibold">{{ $equipoEditando ? 'Editar equipo' : 'Nuevo equipo' }}</h2>
        <form wire:submit="guardar" class="space-y-4">

        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">

            <flux:input
                wire:model="codigo"
                label="Código del equipo"
                placeholder="Ej. EQ-001"
            />

            <flux:input
                wire:model="nombre"
                label="Nombre del equipo"
                placeholder="Ej. Motor industrial"
            />

            <flux:input
                wire:model="marca"
                label="Marca"
                placeholder="Ej. Siemens"
            />

            <flux:input
                wire:model="modelo"
                label="Modelo"
                placeholder="Ej. M200"
            />

            <flux:input
                wire:model="numero_serie"
                label="Número de serie"
                placeholder="Ej. SN-12345"
            />

            <flux:input
                wire:model="fecha_adquisicion"
                type="date"
                label="Fecha de adquisición"
            />

        </div>

        <flux:textarea
            wire:model="descripcion"
            label="Descripción"
            placeholder="Descripción del equipo"
        />

        <!-- RELACIONES -->
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4">

            <flux:select
                wire:model="categoria_id"
                label="Categoría"
                placeholder="Seleccione categoría"
            >
                @foreach($categorias as $categoria)
                    <flux:select.option value="{{ $categoria->id }}">
                        {{ $categoria->nombre }}
                    </flux:select.option>
                @endforeach
            </flux:select>

            <flux:select
                wire:model="ubicacion_id"
                label="Ubicación"
                placeholder="Seleccione ubicación"
            >
                @foreach($ubicaciones as $ubicacion)
                    <flux:select.option value="{{ $ubicacion->id }}">
                        {{ $ubicacion->nombre }}
                    </flux:select.option>
                @endforeach
            </flux:select>

            <flux:select
                wire:model="estado_equipo_id"
                label="Estado operativo"
                placeholder="Seleccione estado"
            >
                @foreach($estados as $estado)
                    <flux:select.option value="{{ $estado->id }}">
                        {{ $estado->nombre }}
                    </flux:select.option>
                @endforeach
            </flux:select>

        </div>

        <div class="flex gap-2">

            <flux:button type="submit" variant="primary">
                {{ $equipoEditando
                    ? 'Actualizar equipo'
                    : 'Registrar equipo' }}
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

    <!-- FILTROS -->
    <div class="flex flex-col md:flex-row gap-4">

        <div class="flex-1">
            <flux:input
                wire:model.live.debounce.300ms="busqueda"
                label="Buscar equipos"
                placeholder="Buscar por código o nombre"
            />
        </div>

        <div class="flex items-end">
            <flux:checkbox
                wire:model.live="mostrarRetirados"
                label="Mostrar equipos retirados"
            />
        </div>

    </div>

    <!-- TABLA -->
    <div class="overflow-x-auto">

        <table class="w-full text-left">

            <thead>
                <tr class="border-b">
                    <th class="p-3">Código</th>
                    <th class="p-3">Equipo</th>
                    <th class="p-3">Categoría</th>
                    <th class="p-3">Ubicación</th>
                    <th class="p-3">Estado</th>
                    <th class="p-3">Acciones</th>
                </tr>
            </thead>

            <tbody>
                @forelse($equipos as $equipo)

                    <tr
                        wire:key="equipo-{{ $equipo->id }}"
                        class="border-b"
                    >

                        <td class="p-3">
                            {{ $equipo->codigo }}
                        </td>

                        <td class="p-3">
                            {{ $equipo->nombre }}
                        </td>

                        <td class="p-3">
                            {{ $equipo->categoria?->nombre }}
                        </td>

                        <td class="p-3">
                            {{ $equipo->ubicacion?->nombre }}
                        </td>

                        <td class="p-3">
                            {{ $equipo->estado?->nombre }}
                        </td>

                        <td class="p-3">
                            <div class="flex gap-2">

                                @if($mostrarRetirados)

                                    <flux:button
                                        size="sm"
                                        wire:click="restaurar({{ $equipo->id }})"
                                        wire:confirm="¿Restaurar este equipo?"
                                    >
                                        Restaurar
                                    </flux:button>

                                @else

                                    <flux:button
                                        size="sm"
                                        wire:click="editar({{ $equipo->id }})"
                                    >
                                        Editar
                                    </flux:button>

                                    <flux:button
                                        size="sm"
                                        variant="danger"
                                        wire:click="retirar({{ $equipo->id }})"
                                        wire:confirm="¿Retirar este equipo?"
                                    >
                                        Retirar
                                    </flux:button>

                                @endif

                            </div>
                        </td>

                    </tr>

                @empty

                    <tr>
                        <td colspan="6" class="p-4 text-center">
                            No hay equipos para mostrar.
                        </td>
                    </tr>

                @endforelse
            </tbody>

        </table>
    </div>
</div>
