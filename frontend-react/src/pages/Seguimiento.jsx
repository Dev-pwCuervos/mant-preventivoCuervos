
import { useCallback, useEffect, useState } from 'react';
import {
    ClipboardCheck,
    RefreshCw,
    History,
    CheckCircle2,
    RotateCcw,
    Clock3,
    UserRound,
    CalendarDays,
    X,
} from 'lucide-react';

import api from '../services/api';
import EvidenciasFotos from '../components/EvidenciasFotos';

const ESTADOS = [
    { codigo: '', nombre: 'Todos los estados' },
    { codigo: 'PENDIENTE', nombre: 'Pendiente' },
    { codigo: 'EN_PROCESO', nombre: 'En proceso' },
    { codigo: 'EN_REVISION', nombre: 'En revisión' },
    { codigo: 'CERRADO', nombre: 'Cerrado' },
    { codigo: 'CANCELADO', nombre: 'Cancelado' },
];

function formatearFecha(fecha) {
    if (!fecha) return '—';

    const valor = new Date(fecha);

    return Number.isNaN(valor.getTime())
        ? fecha
        : valor.toLocaleString('es-GT');
}

function obtenerError(error) {
    if (error.response?.status === 401) {
        return 'Tu sesión expiró. Inicia sesión nuevamente.';
    }

    if (error.response?.status === 403) {
        return 'No tienes permisos para esta operación.';
    }

    if (error.response?.status === 422) {
        const errores = error.response?.data?.errors;

        return errores
            ? Object.values(errores).flat().join(' ')
            : error.response?.data?.message || 'Datos inválidos.';
    }

    return error.response?.data?.message ||
        'No fue posible completar la solicitud.';
}

export default function Seguimiento({ usuario }) {
    const [mantenimientos, setMantenimientos] = useState([]);
    const [estado, setEstado] = useState('');
    const [pagina, setPagina] = useState(1);
    const [ultimaPagina, setUltimaPagina] = useState(1);

    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(null);

    const [historial, setHistorial] = useState([]);
    const [ordenHistorial, setOrdenHistorial] = useState(null);
    const [cargandoHistorial, setCargandoHistorial] = useState(false);

    const [motivo, setMotivo] = useState('');
    const [ordenCierre, setOrdenCierre] = useState(null);
    const [ordenRechazo, setOrdenRechazo] = useState(null);
    const [motivoRechazo, setMotivoRechazo] = useState('');

    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    const roles = Array.isArray(usuario?.roles)
        ? usuario.roles
        : [];

    const puedeGestionar = roles.some((rol) =>
        ['Administrador', 'Supervisor'].includes(rol)
    );

    const cargarDatos = useCallback(async (paginaActual = 1) => {
        if (!puedeGestionar) {
            setCargando(false);
            return;
        }

        setCargando(true);
        setError('');

        try {
            const respuesta = await api.get('/api/seguimiento', {
                params: {
                    page: paginaActual,
                    ...(estado ? { estado } : {}),
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
    }, [estado, puedeGestionar]);

    useEffect(() => {
        cargarDatos(1);
    }, [cargarDatos]);

    const consultarHistorial = async (orden) => {
        setOrdenHistorial(orden);
        setHistorial([]);
        setCargandoHistorial(true);
        setError('');

        try {
            const respuesta = await api.get(
                `/api/mantenimientos/${orden.id}/historial`
            );

            setHistorial(respuesta.data.historial || []);
        } catch (err) {
            setError(obtenerError(err));
        } finally {
            setCargandoHistorial(false);
        }
    };

    const cerrarMantenimiento = async (evento) => {
        evento.preventDefault();

        if (!ordenCierre) return;

        setProcesando(ordenCierre.id);
        setError('');
        setMensaje('');

        try {
            await api.post(
                `/api/mantenimientos/${ordenCierre.id}/cerrar`,
                { motivo: motivo.trim() || null }
            );

            setMensaje(
                `Mantenimiento #${ordenCierre.id} cerrado correctamente.`
            );

            setOrdenCierre(null);
            setMotivo('');

            await cargarDatos(pagina);
        } catch (err) {
            setError(obtenerError(err));
        } finally {
            setProcesando(null);
        }
    };

    const rechazarMantenimiento = async (evento) => {
        evento.preventDefault();

        if (!ordenRechazo) return;

        const explicacion = motivoRechazo.trim();

        if (!explicacion) {
            setError('Explica al técnico qué debe corregir.');
            return;
        }

        setProcesando(ordenRechazo.id);
        setError('');
        setMensaje('');

        try {
            await api.post(
                `/api/mantenimientos/${ordenRechazo.id}/rechazar`,
                { motivo: explicacion }
            );

            setMensaje(
                `Mantenimiento #${ordenRechazo.id} devuelto al técnico.`
            );
            setOrdenRechazo(null);
            setMotivoRechazo('');
            await cargarDatos(pagina);
        } catch (err) {
            setError(obtenerError(err));
        } finally {
            setProcesando(null);
        }
    };

    if (!puedeGestionar) {
        return (
            <div className="module-placeholder">
                <h1>Acceso restringido</h1>
                <p>
                    El seguimiento y cierre corresponde al
                    Administrador o Supervisor.
                </p>
            </div>
        );
    }

    return (
        <div className="dashboard-content">
            <div className="page-heading">
                <div>
                    <span className="eyebrow">OPERACIONES</span>
                    <h1>Seguimiento de Mantenimientos</h1>
                    <p>
                        Consulta el avance, revisa el historial
                        y aprueba los trabajos terminados.
                    </p>
                </div>

                <button
                    type="button"
                    className="maintenance-refresh assignment-refresh"
                    onClick={() => cargarDatos(pagina)}
                    disabled={cargando}
                >
                    <RefreshCw size={18} />
                    Actualizar
                </button>
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

            <section className="panel tracking-panel">
                <div className="panel-heading">
                    <div>
                        <h2>Órdenes de mantenimiento</h2>
                        <p>Estado actual de los trabajos registrados.</p>
                    </div>
                    <ClipboardCheck size={22} />
                </div>

                <div className="tracking-filters">
                    <label htmlFor="filtro-estado">
                        Filtrar por estado
                    </label>

                    <select
                        id="filtro-estado"
                        value={estado}
                        onChange={(e) => setEstado(e.target.value)}
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
                </div>

                {cargando ? (
                    <div className="empty-state">
                        <p>Cargando mantenimientos...</p>
                    </div>
                ) : mantenimientos.length === 0 ? (
                    <div className="empty-state">
                        <ClipboardCheck size={36} />
                        <h3>No hay mantenimientos</h3>
                        <p>
                            No se encontraron trabajos con el estado seleccionado.
                        </p>
                    </div>
                ) : (
                    <div className="tracking-list">
                        {mantenimientos.map((orden) => (
                            <article
                                key={orden.id}
                                className="tracking-order"
                            >
                                <div className="tracking-order-top">
                                    <div>
                                        <span className="eyebrow">
                                            ORDEN #{orden.id}
                                        </span>

                                        <h3>
                                            {orden.plan?.nombre || 'Sin plan'}
                                        </h3>
                                    </div>

                                    <span className="maintenance-status">
                                        {orden.estado?.nombre || '—'}
                                    </span>
                                </div>

                                <div className="tracking-details">
                                    <span>
                                        <CalendarDays size={16} />
                                        {formatearFecha(orden.fecha_programada)}
                                    </span>

                                    <span>
                                        <UserRound size={16} />
                                        {orden.tecnicos?.length
                                            ? orden.tecnicos
                                                .map((t) => t.nombre)
                                                .join(', ')
                                            : 'Sin técnicos asignados'}
                                    </span>

                                    <span>
                                        <Clock3 size={16} />
                                        Prioridad: {orden.prioridad?.nombre || '—'}
                                    </span>
                                </div>

                                {orden.observaciones && (
                                    <div className="tracking-observations">
                                        <strong>Observaciones</strong>
                                        <p>{orden.observaciones}</p>
                                    </div>
                                )}

                                <EvidenciasFotos evidencias={orden.evidencias} />

                                <div className="tracking-actions">
                                    <button
                                        type="button"
                                        className="tracking-secondary"
                                        onClick={() =>
                                            consultarHistorial(orden)
                                        }
                                    >
                                        <History size={17} />
                                        Ver historial
                                    </button>

                                    {orden.estado?.codigo === 'EN_REVISION' && (
                                        <>
                                            <button
                                                type="button"
                                                className="tracking-secondary"
                                                onClick={() => {
                                                    setOrdenRechazo(orden);
                                                    setMotivoRechazo('');
                                                    setError('');
                                                }}
                                            >
                                                <RotateCcw size={17} />
                                                Rechazar y devolver
                                            </button>

                                            <button
                                                type="button"
                                                className="primary-button"
                                                onClick={() => {
                                                    setOrdenCierre(orden);
                                                    setMotivo('');
                                                }}
                                            >
                                                <CheckCircle2 size={17} />
                                                Aprobar y cerrar
                                            </button>
                                        </>
                                    )}
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                <div className="maintenance-pagination">
                    <button
                        type="button"
                        disabled={cargando || pagina <= 1}
                        onClick={() => cargarDatos(pagina - 1)}
                    >
                        Anterior
                    </button>

                    <span>
                        Página {pagina} de {ultimaPagina}
                    </span>

                    <button
                        type="button"
                        disabled={cargando || pagina >= ultimaPagina}
                        onClick={() => cargarDatos(pagina + 1)}
                    >
                        Siguiente
                    </button>
                </div>
            </section>

            {ordenHistorial && (
                <div className="tracking-overlay">
                    <section
                        className="tracking-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Historial de mantenimiento"
                    >
                        <div className="tracking-modal-heading">
                            <div>
                                <h2>Historial de la orden #{ordenHistorial.id}</h2>
                                <p>
                                    Registro de cambios de estado.
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setOrdenHistorial(null)}
                                aria-label="Cerrar historial"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {cargandoHistorial ? (
                            <p>Cargando historial...</p>
                        ) : historial.length === 0 ? (
                            <p className="assignment-muted">
                                Esta orden todavía no tiene movimientos registrados.
                            </p>
                        ) : (
                            <div className="tracking-history">
                                {historial.map((movimiento) => (
                                    <div
                                        className="tracking-history-item"
                                        key={movimiento.id}
                                    >
                                        <strong>
                                            {movimiento.estado_anterior?.nombre || 'Inicio'}
                                            {' → '}
                                            {movimiento.estado_nuevo?.nombre || '—'}
                                        </strong>

                                        <span>
                                            Usuario: {movimiento.usuario?.nombre || '—'}
                                        </span>

                                        <span>
                                            {formatearFecha(movimiento.created_at)}
                                        </span>

                                        {movimiento.motivo && (
                                            <p>{movimiento.motivo}</p>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                    </section>
                </div>
            )}

            {ordenCierre && (
                <div className="tracking-overlay">
                    <section
                        className="tracking-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Confirmar cierre"
                    >
                        <div className="tracking-modal-heading">
                            <div>
                                <h2>Aprobar mantenimiento</h2>
                                <p>
                                    Orden #{ordenCierre.id}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setOrdenCierre(null)}
                                aria-label="Cancelar cierre"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={cerrarMantenimiento}>
                            <div className="maintenance-field">
                                <label htmlFor="motivo-cierre">
                                    Motivo u observaciones del cierre
                                </label>

                                <textarea
                                    id="motivo-cierre"
                                    rows={4}
                                    maxLength={5000}
                                    value={motivo}
                                    onChange={(e) =>
                                        setMotivo(e.target.value)
                                    }
                                    placeholder="Describe la aprobación del trabajo..."
                                />
                            </div>

                            <div className="tracking-actions">
                                <button
                                    type="button"
                                    className="tracking-secondary"
                                    onClick={() => setOrdenCierre(null)}
                                    disabled={procesando !== null}
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={procesando !== null}
                                >
                                    <CheckCircle2 size={17} />
                                    {procesando
                                        ? 'Cerrando...'
                                        : 'Confirmar cierre'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}

            {ordenRechazo && (
                <div className="tracking-overlay">
                    <section
                        className="tracking-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-label="Rechazar mantenimiento"
                    >
                        <div className="tracking-modal-heading">
                            <div>
                                <h2>Devolver al técnico</h2>
                                <p>Orden #{ordenRechazo.id}</p>
                            </div>

                            <button
                                type="button"
                                onClick={() => setOrdenRechazo(null)}
                                aria-label="Cancelar rechazo"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={rechazarMantenimiento}>
                            <div className="maintenance-field">
                                <label htmlFor="motivo-rechazo">
                                    Qué debe corregir el técnico
                                </label>
                                <textarea
                                    id="motivo-rechazo"
                                    rows={4}
                                    maxLength={5000}
                                    required
                                    value={motivoRechazo}
                                    onChange={(e) => setMotivoRechazo(e.target.value)}
                                    placeholder="Describe el error o trabajo pendiente..."
                                />
                            </div>

                            {error && <div className="app-error" role="alert">{error}</div>}

                            <div className="tracking-actions">
                                <button
                                    type="button"
                                    className="tracking-secondary"
                                    onClick={() => setOrdenRechazo(null)}
                                    disabled={procesando !== null}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="primary-button"
                                    disabled={procesando !== null}
                                >
                                    <RotateCcw size={17} />
                                    {procesando ? 'Devolviendo...' : 'Confirmar devolución'}
                                </button>
                            </div>
                        </form>
                    </section>
                </div>
            )}
        </div>
    );
}
