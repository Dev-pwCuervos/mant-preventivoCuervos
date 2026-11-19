
import { useEffect, useState } from 'react';

// Páginas del sistema
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Mantenimientos from './pages/Mantenimientos';
import Asignaciones from './pages/Asignaciones';
import Intervenciones from './pages/Intervenciones';
import Seguimiento from './pages/Seguimiento';

// Componentes
import Sidebar from './components/Sidebar';

// API Laravel
import api from './services/api';

// Estilos generales
import './index.css';

/*
|--------------------------------------------------------------------------
| CUERVO - SISTEMA DE MANTENIMIENTO PREVENTIVO
|--------------------------------------------------------------------------
|
| Laravel + Livewire: Administración
| React: Operaciones de mantenimiento
| Next.js: Supervisión
|
*/

const ROLES_PERMITIDOS = [
    'Administrador',
    'Supervisor',
    'Técnico',
];

function App() {

    /*
    |--------------------------------------------------------------------------
    | Estados principales
    |--------------------------------------------------------------------------
    */

    const [usuario, setUsuario] = useState(null);
    const [cargando, setCargando] = useState(true);

    const [pagina, setPagina] = useState('dashboard');

    const [menuAbierto, setMenuAbierto] = useState(false);

    const [errorSalida, setErrorSalida] = useState('');

    /*
    |--------------------------------------------------------------------------
    | Verificar sesión al iniciar React
    |--------------------------------------------------------------------------
    */

    useEffect(() => {

        let activo = true;

        const verificarSesion = async () => {

            try {

                const respuesta = await api.get('/api/user');

                const datos = respuesta.data;

                const permitido =
                    datos.activo &&
                    Array.isArray(datos.roles) &&
                    datos.roles.some((rol) =>
                        ROLES_PERMITIDOS.includes(rol)
                    );

                if (activo && permitido) {
                    setUsuario(datos);
                }

            } catch (error) {

                if (error.response?.status !== 401) {
                    console.error(
                        'Error verificando sesión:',
                        error.message
                    );
                }

            } finally {

                if (activo) {
                    setCargando(false);
                }

            }

        };

        verificarSesion();

        return () => {
            activo = false;
        };

    }, []);

    /*
    |--------------------------------------------------------------------------
    | Navegación entre módulos
    |--------------------------------------------------------------------------
    */

    const navegar = (nuevaPagina) => {

        setPagina(nuevaPagina);

        setMenuAbierto(false);

        setErrorSalida('');

    };

    /*
    |--------------------------------------------------------------------------
    | Cerrar sesión
    |--------------------------------------------------------------------------
    */

    const cerrarSesion = async () => {

        setErrorSalida('');

        try {

            await api.post('/logout');

            setUsuario(null);

            setPagina('dashboard');

            setMenuAbierto(false);

        } catch (error) {

            console.error(
                'Error al cerrar sesión:',
                error.message
            );

            setErrorSalida(
                'No se pudo cerrar sesión. Intenta nuevamente.'
            );

        }

    };

    /*
    |--------------------------------------------------------------------------
    | Pantalla de carga
    |--------------------------------------------------------------------------
    */

    if (cargando) {

        return (
            <div className="loading-screen">

                <div className="loading-spinner" />

                <p>
                    Verificando sesión de Cuervo...
                </p>

            </div>
        );

    }

    /*
    |--------------------------------------------------------------------------
    | Pantalla de inicio de sesión
    |--------------------------------------------------------------------------
    */

    if (!usuario) {

        return (
            <Login
                onLogin={(datos) => {

                    setUsuario(datos);

                    setPagina('dashboard');

                    setErrorSalida('');

                }}
            />
        );

    }

    /*
    |--------------------------------------------------------------------------
    | Roles del usuario
    |--------------------------------------------------------------------------
    */

    const roles = Array.isArray(usuario.roles)
        ? usuario.roles
        : [];

    const puedeGestionar = roles.some((rol) =>
        ['Administrador', 'Supervisor'].includes(rol)
    );

    /*
    |--------------------------------------------------------------------------
    | Estructura principal
    |--------------------------------------------------------------------------
    */

    return (

        <div className="app-layout">

            {/*
            |--------------------------------------------------------------------------
            | Menú lateral
            |--------------------------------------------------------------------------
            */}

            <Sidebar
                usuario={usuario}
                pagina={pagina}
                onNavigate={navegar}
                onLogout={cerrarSesion}
                abierto={menuAbierto}
                onClose={() => setMenuAbierto(false)}
            />

            {/*
            |--------------------------------------------------------------------------
            | Área principal
            |--------------------------------------------------------------------------
            */}

            <div className="main-area">

                {/*
                |--------------------------------------------------------------------------
                | Barra superior
                |--------------------------------------------------------------------------
                */}

                <header className="topbar">

                    <button
                        type="button"
                        className="mobile-menu-button"
                        onClick={() => setMenuAbierto(true)}
                        aria-label="Abrir menú"
                    >
                        ☰
                    </button>

                    <strong className="topbar-title">
                        Sistema de Mantenimiento Preventivo
                    </strong>

                    <div className="topbar-right">

                        <span>
                            {usuario.nombre}
                        </span>

                    </div>

                </header>

                {/*
                |--------------------------------------------------------------------------
                | Contenido de los módulos
                |--------------------------------------------------------------------------
                */}

                <main className="main-content">

                    {errorSalida && (

                        <div
                            className="app-error"
                            role="alert"
                        >
                            {errorSalida}
                        </div>

                    )}

                    {/*
                    |--------------------------------------------------------------------------
                    | Dashboard
                    |--------------------------------------------------------------------------
                    */}

                    {pagina === 'dashboard' && (

                        <Dashboard
                            usuario={usuario}
                            onNavigate={navegar}
                        />

                    )}

                    {/*
                    |--------------------------------------------------------------------------
                    | Gestión de Mantenimientos
                    |--------------------------------------------------------------------------
                    */}

                    {pagina === 'mantenimientos' && (

                        <Mantenimientos
                            usuario={usuario}
                        />

                    )}

                    {/*
                    |--------------------------------------------------------------------------
                    | Asignación de Técnicos
                    |--------------------------------------------------------------------------
                    */}

                    {pagina === 'asignaciones' && (

                        puedeGestionar ? (

                            <Asignaciones
                                usuario={usuario}
                            />

                        ) : (

                            <div className="module-placeholder">

                                <h1>
                                    Acceso restringido
                                </h1>

                                <p>
                                    No tienes permisos para gestionar
                                    asignaciones de técnicos.
                                </p>

                            </div>

                        )

                    )}

                    {/*
                    |--------------------------------------------------------------------------
                    | Intervenciones
                    |--------------------------------------------------------------------------
                    */}

                    {pagina === 'intervenciones' && (

                        <Intervenciones
                            usuario={usuario}
                        />

                    )}

                    {/*
                    |--------------------------------------------------------------------------
                    | Seguimiento y Cierre
                    |--------------------------------------------------------------------------
                    */}

                    {pagina === 'seguimiento' && (

                        puedeGestionar ? (

                            <Seguimiento
                                usuario={usuario}
                            />

                        ) : (

                            <div className="module-placeholder">

                                <h1>
                                    Acceso restringido
                                </h1>

                                <p>
                                    El seguimiento y cierre de
                                    mantenimientos está disponible
                                    para Administradores y Supervisores.
                                </p>

                            </div>

                        )

                    )}

                    {/*
                    |--------------------------------------------------------------------------
                    | Página no encontrada
                    |--------------------------------------------------------------------------
                    */}

                    {![
                        'dashboard',
                        'mantenimientos',
                        'asignaciones',
                        'intervenciones',
                        'seguimiento',
                    ].includes(pagina) && (

                        <div className="module-placeholder">

                            <h1>
                                Módulo no encontrado
                            </h1>

                            <p>
                                La sección solicitada no existe.
                            </p>

                            <button
                                type="button"
                                className="primary-button"
                                onClick={() => navegar('dashboard')}
                            >
                                Volver al Dashboard
                            </button>

                        </div>

                    )}

                </main>

            </div>

        </div>

    );

}

export default App;
