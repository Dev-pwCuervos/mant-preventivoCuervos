
<?php

use App\Models\User;
use App\Models\Rol;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Livewire\Component;

new class extends Component
{
    public ?int $usuarioEditando = null;

    public string $nombre = '';
    public string $email = '';
    public string $password = '';
    public string $password_confirmation = '';
    public string $rolSeleccionado = '';
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
            'nombre' => ['required', 'string', 'max:100'],

            'email' => [
                'required',
                'email',
                'max:150',
                Rule::unique('usuarios', 'email')
                    ->ignore($this->usuarioEditando),
            ],

            'password' => [
                $this->usuarioEditando ? 'nullable' : 'required',
                'confirmed',
                Password::defaults(),
            ],

            'rolSeleccionado' => [
                'required',
                'integer',
                Rule::exists('roles', 'id'),
            ],
        ]);

        DB::transaction(function () use ($datos) {

            $valores = [
                'nombre' => $datos['nombre'],
                'email' => $datos['email'],
            ];

            if (!empty($datos['password'])) {
                $valores['password'] = $datos['password'];
            }

            if ($this->usuarioEditando !== null) {
                $usuario = User::findOrFail(
                    $this->usuarioEditando
                );

                // Impedir quitarse el rol Administrador
                if ($usuario->id === auth()->id()) {
                    $rolAdmin = Rol::where(
                        'nombre',
                        'Administrador'
                    )->firstOrFail();

                    if (
                        (int) $datos['rolSeleccionado']
                        !== (int) $rolAdmin->id
                    ) {
                        abort(
                            403,
                            'No puedes quitarte tu rol Administrador.'
                        );
                    }
                }

                $usuario->update($valores);

            } else {
                $valores['activo'] = true;

                $usuario = User::create($valores);
            }

            // Asignar UN SOLO rol al usuario
            $usuario->roles()->sync([
                (int) $datos['rolSeleccionado']
            ]);
        });

        session()->flash(
            'mensaje',
            'Usuario guardado correctamente.'
        );

        $this->cancelar();
    }

    public function editar(int $id): void
    {
        $this->autorizarAdministrador();

        $usuario = User::with('roles')
            ->findOrFail($id);

        $this->usuarioEditando = $usuario->id;
        $this->nombre = $usuario->nombre;
        $this->email = $usuario->email;

        $this->rolSeleccionado = (string) (
            $usuario->roles->first()?->id ?? ''
        );

        $this->password = '';
        $this->password_confirmation = '';
    }

    public function cambiarEstado(int $id): void
    {
        $this->autorizarAdministrador();

        $usuario = User::findOrFail($id);

        // Evitar desactivar la propia cuenta
        if ($usuario->id === auth()->id()) {
            $this->addError(
                'estado',
                'No puedes desactivar tu propia cuenta.'
            );

            return;
        }

        $usuario->update([
            'activo' => !$usuario->activo,
        ]);

        session()->flash(
            'mensaje',
            'Estado del usuario actualizado.'
        );
    }

    public function cancelar(): void
    {
        $this->autorizarAdministrador();

        $this->reset([
            'usuarioEditando',
            'nombre',
            'email',
            'password',
            'password_confirmation',
            'rolSeleccionado',
        ]);

        $this->resetValidation();
    }

    public function with(): array
    {
        $this->autorizarAdministrador();

        return [
            'usuarios' => User::with('roles')
                ->where(function ($query) {
                    $query->where(
                        'nombre',
                        'like',
                        '%' . $this->busqueda . '%'
                    )->orWhere(
                        'email',
                        'like',
                        '%' . $this->busqueda . '%'
                    );
                })
                ->orderBy('nombre')
                ->get(),

            'rolesDisponibles' => Rol::orderBy('nombre')
                ->get(),
        ];
    }
};

?>

<div class="max-w-6xl mx-auto p-6 space-y-6">

    <flux:heading size="xl">
        Gestión de Usuarios
    </flux:heading>

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

        <flux:input
            wire:model="nombre"
            label="Nombre completo"
            placeholder="Nombre del usuario"
        />

        <flux:input
            wire:model="email"
            label="Correo electrónico"
            type="email"
            placeholder="correo@empresa.com"
        />

        <flux:input
            wire:model="password"
            label="Contraseña"
            type="password"
            viewable
        />

        <flux:input
            wire:model="password_confirmation"
            label="Confirmar contraseña"
            type="password"
            viewable
        />

        @if($usuarioEditando)
            <p class="text-sm text-zinc-500">
                Deja la contraseña vacía si no deseas cambiarla.
            </p>
        @endif

        <!-- SELECCIÓN DE UN SOLO ROL -->
        <flux:select
            wire:model="rolSeleccionado"
            label="Rol del usuario"
            placeholder="Seleccione un rol"
        >
            @foreach($rolesDisponibles as $rol)
                <flux:select.option
                    value="{{ $rol->id }}"
                >
                    {{ $rol->nombre }}
                </flux:select.option>
            @endforeach
        </flux:select>

        @error('rolSeleccionado')
            <p class="text-red-500 text-sm">
                {{ $message }}
            </p>
        @enderror

        <!-- BOTONES -->
        <div class="flex gap-2">

            <flux:button
                type="submit"
                variant="primary"
            >
                {{ $usuarioEditando
                    ? 'Actualizar usuario'
                    : 'Registrar usuario' }}
            </flux:button>

            @if($usuarioEditando)
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
        label="Buscar usuarios"
        placeholder="Buscar por nombre o correo"
    />

    <!-- LISTADO -->
    <div class="overflow-x-auto">
        <table class="w-full text-left">

            <thead>
                <tr class="border-b">
                    <th class="p-3">Nombre</th>
                    <th class="p-3">Correo</th>
                    <th class="p-3">Rol</th>
                    <th class="p-3">Estado</th>
                    <th class="p-3">Acciones</th>
                </tr>
            </thead>

            <tbody>
                @forelse($usuarios as $usuario)

                    <tr
                        wire:key="usuario-{{ $usuario->id }}"
                        class="border-b"
                    >

                        <td class="p-3">
                            {{ $usuario->nombre }}
                        </td>

                        <td class="p-3">
                            {{ $usuario->email }}
                        </td>

                        <td class="p-3">
                            {{ $usuario->roles->first()?->nombre ?? 'Sin rol' }}
                        </td>

                        <td class="p-3">
                            @if($usuario->activo)
                                <span class="text-green-600">
                                    Activo
                                </span>
                            @else
                                <span class="text-red-500">
                                    Inactivo
                                </span>
                            @endif
                        </td>

                        <td class="p-3">
                            <div class="flex gap-2">

                                <flux:button
                                    size="sm"
                                    wire:click="editar({{ $usuario->id }})"
                                >
                                    Editar
                                </flux:button>

                                <flux:button
                                    size="sm"
                                    wire:click="cambiarEstado({{ $usuario->id }})"
                                    wire:confirm="¿Cambiar el estado de este usuario?"
                                >
                                    {{ $usuario->activo
                                        ? 'Desactivar'
                                        : 'Activar' }}
                                </flux:button>

                            </div>
                        </td>

                    </tr>

                @empty
                    <tr>
                        <td colspan="5" class="p-4 text-center">
                            No hay usuarios registrados.
                        </td>
                    </tr>
                @endforelse
            </tbody>

        </table>
    </div>

</div>
