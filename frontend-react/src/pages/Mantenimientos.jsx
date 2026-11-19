
import { useEffect, useState } from 'react';
import {
    CalendarDays,
    Plus,
    Search,
    RefreshCw,
    ClipboardList,
} from 'lucide-react';

import api from '../services/api';

const ROLES_GESTION = ['Administrador', 'Supervisor'];

const ESTADOS = [
    { codigo: '', nombre: 'Todos los estados' },
    { codigo: 'PENDIENTE', nombre: 'Pendiente' },
    { codigo: 'EN_PROCESO', nombre: 'En proceso' },
    { codigo: 'EN_REVISION', nombre: 'En revisión' },
    { codigo: 'CERRADO', nombre: 'Cerrado' },
    { codigo: 'CANCELADO', nombre: 'Cancelado' },
];

const formularioInicial = {
    plan_id: '',
    prioridad_id: '',
    fecha_programada: '',
    observaciones: '',
};

function formatearFecha(fecha) {
    if (!fecha) return '—';

    const valor = new Date(fecha);

    if (Number.isNaN(valor.getTime())) {
        return fecha;
    }

    return valor.toLocaleString('es-GT');
}

function obtenerError(error) {
    if (error.response?.status === 401) {
        return 'Tu sesión expiró. Inicia sesión nuevamente.';
    }

    if (error.response?.status === 403) {
        return 'No tienes permisos para realizar esta operación.';
    }

    if (error.response?.status === 422) {
        const errores = error.response.data?.errors;

        if (errores) {
            return Object.values(errores).flat().join(' ');
        }

        return 'Verifica los datos del formulario.';
    }

    return (
        error.response?.data?.message ||
        'No fue posible completar la solicitud.'
    );
}

export default function Mantenimientos({ usuario }) {
    const roles = Array.isArray(usuario.roles)
        ? usuario.roles
        : [];

    const puedeGestionar = roles.some((rol) =>
        ROLES_GESTION.includes(rol)
    );

    const [mantenimientos, setMantenimientos] = useState([]);
    const [catalogos, setCatalogos] = useState({
        planes: [],
        prioridades: [],
        estados: [],
    });

    const [formulario, setFormulario] = useState(formularioInicial);
    const [buscar, setBuscar] = useState('');
    const [estado, setEstado] = useState('');
    const [pagina, setPagina] = useState(1);
    const [ultimaPagina, setUltimaPagina] = useState(1);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    const cargarMantenimientos = async (paginaActual = 1) => {
        setCargando(true);
        setError('');

        try {
            const respuesta = await api.get('/api/mantenimientos', {
                params: {
                    page: paginaActual,
                    ...(estado ? { estado } : {}),
                    ...(buscar.trim()
                        ? { buscar: buscar.trim() }
                        : {}),
                },
            });

            setMantenimientos(respuesta.data.data || []);
            setPagina(respuesta.data.current_page || 1);
            setUltimaPagina(respuesta.data.last_page || 1);
        } catch (err) {
            setError(obtenerError(err));
        } finally {
            setCargando(false);
        }
    };

    const cargarCatalogos = async () => {
        if (!puedeGestionar) return;

        try {
            const respuesta = await api.get(
                '/api/mantenimientos/catalogos'
            );

            setCatalogos(respuesta.data);
        } catch (err) {
            setError(obtenerError(err));
        }
    };

    useEffect(() => {
        cargarMantenimientos(1);
        cargarCatalogos();
        // Carga inicial
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const cambiarCampo = (evento) => {
        const { name, value } = evento.target;

        setFormulario((anterior) => ({
            ...anterior,
            [name]: value,
        }));
    };

    const programarMantenimiento = async (evento) => {
        evento.preventDefault();

        if (!puedeGestionar) return;

        setGuardando(true);
        setError('');
        setMensaje('');

        try {
            if (!formulario.fecha_programada) {
                setError('Selecciona una fecha programada.');
                return;
            }

            const fecha = formulario.fecha_programada
                .replace('T', ' ');

            await api.post('/api/mantenimientos', {
                plan_id: Number(formulario.plan_id),
                prioridad_id: Number(formulario.prioridad_id),
                fecha_programada:
                    fecha.length === 16 ? `${fecha}:00` : fecha,
                observaciones: formulario.observaciones || null,
            });

            setMensaje('Mantenimiento programado correctamente.');
            setFormulario(formularioInicial);
            setMostrarFormulario(false);

            await cargarMantenimientos(1);
        } catch (err) {
            setError(obtenerError(err));
        } finally {
            setGuardando(false);
        }
    };

    const buscarMantenimientos = (evento) => {
        evento.preventDefault();
        cargarMantenimientos(1);
    };

    return (
        <div className="dashboard-content">
            <div className="page-heading">
                <div>
                    <span className="eyebrow">
                        OPERACIONES
                    </span>

                    <h1>Gestión de Mantenimientos</h1>

                    <p>
                        Programa, consulta y supervisa los trabajos
                        de mantenimiento preventivo.
                    </p>
                </div>

                {puedeGestionar && (
                    <button
                        className="primary-button"
                        onClick={() => {
                            setMostrarFormulario(!mostrarFormulario);
                            setError('');
                        }}
                    >
                        <Plus size={18} />
                        {mostrarFormulario
                            ? 'Cerrar formulario'
                            : 'Programar mantenimiento'}
                    </button>
                )}
            </div>

            {error && (
                <div className="app-error" role="alert">
                    {error}
                </div>
            )}

            {mensaje && (
                <div className="maintenance-success" role="status">
                    {mensaje}
                </div>
            )}

            {mostrarFormulario && puedeGestionar && (
                <section className="panel maintenance-form-panel">
                    <div className="panel-heading">
                        <div>
                            <h2>Nueva orden de mantenimiento</h2>
                            <p>Completa los datos de programación.</p>
                        </div>
                    </div>

                    <form
                        className="maintenance-form"
                        onSubmit={programarMantenimiento}
                    >
                        <div className="maintenance-field">
                            <label htmlFor="plan_id">
                                Plan de mantenimiento
                            </label>

                            <select
                                id="plan_id"
                                name="plan_id"
                                value={formulario.plan_id}
                                onChange={cambiarCampo}
                                required
                            >
                                <option value="">
                                    Seleccionar plan
                                </option>

                                {catalogos.planes?.map((plan) => (
                                    <option key={plan.id} value={plan.id}>
                                        {plan.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="maintenance-field">
                            <label htmlFor="prioridad_id">
                                Prioridad
                            </label>

                            <select
                                id="prioridad_id"
                                name="prioridad_id"
                                value={formulario.prioridad_id}
                                onChange={cambiarCampo}
                                required
                            >
                                <option value="">
                                    Seleccionar prioridad
                                </option>

                                {catalogos.prioridades?.map((prioridad) => (
                                    <option
                                        key={prioridad.id}
                                        value={prioridad.id}
                                    >
                                        {prioridad.nombre}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="maintenance-field">
                            <label htmlFor="fecha_programada">
                                Fecha y hora programadas
                            </label>

                            <input
                                id="fecha_programada"
                                name="fecha_programada"
                                type="datetime-local"
                                value={formulario.fecha_programada}
                                onChange={cambiarCampo}
                                required
                            />
                        </div>

                        <div className="maintenance-field maintenance-full">
                            <label htmlFor="observaciones">
                                Observaciones
                            </label>

                            <textarea
                                id="observaciones"
                                name="observaciones"
                                rows={4}
                                maxLength={5000}
                                placeholder="Detalles adicionales del trabajo..."
                                value={formulario.observaciones}
                                onChange={cambiarCampo}
                            />
                        </div>

                        <div className="maintenance-full">
                            <button
                                className="primary-button"
                                type="submit"
                                disabled={guardando}
                            >
                                <CalendarDays size={18} />
                                {guardando
                                    ? 'Guardando...'
                                    : 'Registrar mantenimiento'}
                            </button>
                        </div>
                    </form>
                </section>
            )}

            <section className="panel maintenance-list-panel">
                <div className="panel-heading">
                    <div>
                        <h2>Mantenimientos registrados</h2>
                        <p>Consulta los trabajos existentes.</p>
                    </div>

                    <ClipboardList size={22} />
                </div>

                <form
                    className="maintenance-filters"
                    onSubmit={buscarMantenimientos}
                >
                    <input
                        type="search"
                        placeholder="Buscar por nombre del plan..."
                        value={buscar}
                        onChange={(e) => setBuscar(e.target.value)}
                    />

                    <select
                        value={estado}
                        onChange={(e) => {
                            setEstado(e.target.value);
                        }}
                    >
                        {ESTADOS.map((item) => (
                            <option
                                key={item.codigo}
                                value={item.codigo}
                            >
                                {item.nombre}
                            </option>
                        ))}
                    </select>

                    <button
                        type="submit"
                        className="primary-button"
                    >
                        <Search size={17} />
                        Buscar
                    </button>

                    <button
                        type="button"
                        className="maintenance-refresh"
                        onClick={() => cargarMantenimientos(1)}
                        aria-label="Actualizar listado"
                    >
                        <RefreshCw size={19} />
                    </button>
                </form>

                {cargando ? (
                    <div className="empty-state">
                        <p>Cargando mantenimientos...</p>
                    </div>
                ) : mantenimientos.length === 0 ? (
                    <div className="empty-state">
                        <ClipboardList size={35} />
                        <h3>No hay mantenimientos</h3>
                        <p>
                            No se encontraron registros con los filtros
                            seleccionados.
                        </p>
                    </div>
                ) : (
                    <div className="maintenance-table-wrapper">
                        <table className="maintenance-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Plan</th>
                                    <th>Prioridad</th>
                                    <th>Fecha programada</th>
                                    <th>Estado</th>
                                    <th>Técnicos</th>
                                </tr>
                            </thead>

                            <tbody>
                                {mantenimientos.map((item) => (
                                    <tr key={item.id}>
                                        <td>#{item.id}</td>

                                        <td>
                                            {item.plan?.nombre || '—'}
                                        </td>

                                        <td>
                                            {item.prioridad?.nombre || '—'}
                                        </td>

                                        <td>
                                            {formatearFecha(
                                                item.fecha_programada
                                            )}
                                        </td>

                                        <td>
                                            <span className="maintenance-status">
                                                {item.estado?.nombre || '—'}
                                            </span>
                                        </td>

                                        <td>
                                            {item.tecnicos?.length
                                                ? item.tecnicos
                                                    .map((t) => t.nombre)
                                                    .join(', ')
                                                : 'Sin asignar'}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                <div className="maintenance-pagination">
                    <button
                        type="button"
                        disabled={cargando || pagina <= 1}
                        onClick={() =>
                            cargarMantenimientos(pagina - 1)
                        }
                    >
                        Anterior
                    </button>

                    <span>
                        Página {pagina} de {ultimaPagina}
                    </span>

                    <button
                        type="button"
                        disabled={
                            cargando || pagina >= ultimaPagina
                        }
                        onClick={() =>
                            cargarMantenimientos(pagina + 1)
                        }
                    >
                        Siguiente
                    </button>
                </div>
            </section>
        </div>
    );
}
