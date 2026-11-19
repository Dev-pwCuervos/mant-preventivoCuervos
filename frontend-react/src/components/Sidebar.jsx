import {
    Bird,
    LayoutDashboard,
    CalendarDays,
    Users,
    Wrench,
    ClipboardCheck,
    LogOut,
    X,
} from 'lucide-react';

const opciones = [
    {
        id: 'dashboard',
        nombre: 'Dashboard',
        icono: LayoutDashboard,
        roles: ['Administrador', 'Supervisor', 'Técnico'],
    },
    {
        id: 'mantenimientos',
        nombre: 'Mantenimientos',
        icono: CalendarDays,
        roles: ['Administrador', 'Supervisor', 'Técnico'],
    },
    {
        id: 'asignaciones',
        nombre: 'Asignaciones',
        icono: Users,
        roles: ['Administrador', 'Supervisor'],
    },
    {
        id: 'intervenciones',
        nombre: 'Intervenciones',
        icono: Wrench,
        roles: ['Administrador', 'Supervisor', 'Técnico'],
    },
    {
        id: 'seguimiento',
        nombre: 'Seguimiento',
        icono: ClipboardCheck,
        roles: ['Administrador', 'Supervisor'],
    },
];

export default function Sidebar({
    usuario,
    pagina,
    onNavigate,
    onLogout,
    abierto,
    onClose,
}) {
    const roles = Array.isArray(usuario.roles)
        ? usuario.roles
        : [];

    const opcionesVisibles = opciones.filter((opcion) =>
        opcion.roles.some((rol) => roles.includes(rol))
    );

    return (
        <>
            {abierto && (
                <button
                    className="sidebar-overlay"
                    aria-label="Cerrar menú"
                    onClick={onClose}
                />
            )}

            <aside className={`sidebar ${abierto ? 'sidebar-open' : ''}`}>
                <div className="sidebar-brand">
                    <Bird size={27} />
                    <span>CUERVO</span>

                    <button
                        className="sidebar-close"
                        onClick={onClose}
                        aria-label="Cerrar menú"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="sidebar-section-label">
                    OPERACIONES
                </div>

                <nav className="sidebar-nav">
                    {opcionesVisibles.map((opcion) => {
                        const Icono = opcion.icono;

                        return (
                            <button
                                key={opcion.id}
                                className={`sidebar-link ${
                                    pagina === opcion.id ? 'active' : ''
                                }`}
                                onClick={() => {
                                    onNavigate(opcion.id);
                                    onClose();
                                }}
                            >
                                <Icono size={19} />
                                <span>{opcion.nombre}</span>
                            </button>
                        );
                    })}
                </nav>

                <div className="sidebar-bottom">
                    <div className="sidebar-user">
                        <div className="user-avatar">
                            {usuario.nombre?.charAt(0).toUpperCase() || 'U'}
                        </div>

                        <div className="user-details">
                            <strong>{usuario.nombre}</strong>
                            <span>{roles.join(', ')}</span>
                        </div>
                    </div>

                    <button
                        className="sidebar-link logout-link"
                        onClick={onLogout}
                    >
                        <LogOut size={19} />
                        <span>Cerrar sesión</span>
                    </button>
                </div>
            </aside>
        </>
    );
}
