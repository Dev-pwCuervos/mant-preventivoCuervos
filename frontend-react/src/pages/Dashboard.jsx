
import { useCallback, useEffect, useState } from 'react';
import {
    Clock3,
    Wrench,
    CheckCircle2,
    ClipboardCheck,
    CalendarDays,
    Activity,
    ArrowUpRight,
    RefreshCw,
    Bell,
} from 'lucide-react';

import api from '../services/api';

const TARJETAS = [
    {
        titulo: 'Mantenimientos pendientes',
        clave: 'pendientes',
        icono: Clock3,
        color: 'orange',
    },
    {
        titulo: 'En proceso',
        clave: 'en_proceso',
        icono: Wrench,
        color: 'blue',
    },
    {
        titulo: 'Completados',
        clave: 'completados',
        icono: CheckCircle2,
        color: 'green',
    },
    {
        titulo: 'En revisión',
        clave: 'en_revision',
        icono: ClipboardCheck,
        color: 'purple',
    },
];

function formatearFecha(fecha) {
    if (!fecha) return '—';

    const valor = new Date(fecha);

    return Number.isNaN(valor.getTime())
        ? fecha
        : valor.toLocaleString('es-GT');
}

function formatearFechaPlan(fecha) {
    if (!fecha) return '—';

    const [anio, mes, dia] = fecha.split('-').map(Number);
    const valor = new Date(anio, mes - 1, dia);

    return Number.isNaN(valor.getTime())
        ? fecha
        : valor.toLocaleDateString('es-GT', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        });
}

function textoVencimiento(dias) {
    if (dias === 0) return 'Hoy';
    if (dias === 1) return 'Mañana';

    return `En ${dias} días`;
}

export default function Dashboard({ usuario, onNavigate }) {
    const [estadisticas, setEstadisticas] = useState(null);
    const [recientes, setRecientes] = useState([]);
    const [proximosPlanes, setProximosPlanes] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');

    const roles = Array.isArray(usuario.roles)
        ? usuario.roles
        : [];

    const puedeGestionar = roles.some((rol) =>
        ['Administrador', 'Supervisor'].includes(rol)
    );

    const cargarDashboard = useCallback(async () => {
        setCargando(true);
        setError('');

        try {
            const respuesta = await api.get('/api/dashboard');

            setEstadisticas(respuesta.data.estadisticas);
            setRecientes(respuesta.data.recientes || []);
            setProximosPlanes(
                puedeGestionar ? respuesta.data.proximos_planes || [] : []
            );
        } catch (err) {
            setProximosPlanes([]);
            setError(
                err.response?.data?.message ||
                'No fue posible cargar las estadísticas.'
            );
        } finally {
            setCargando(false);
        }
    }, [puedeGestionar]);

    useEffect(() => {
        cargarDashboard();
    }, [cargarDashboard]);

    return (
        <div className="dashboard-content">
            <div className="page-heading">
                <div>
                    <span className="eyebrow">PANEL OPERATIVO</span>

                    <h1>Bienvenido, {usuario.nombre}</h1>

                    <p>
                        {puedeGestionar
                            ? 'Vista general de las operaciones de Cuervo.'
                            : 'Consulta tus trabajos de mantenimiento asignados.'}
                    </p>
                </div>

                <div className="dashboard-actions">
                    <button
                        className="maintenance-refresh assignment-refresh"
                        onClick={cargarDashboard}
                        disabled={cargando}
                    >
                        <RefreshCw size={17} />
                        Actualizar
                    </button>

                    <button
                        className="primary-button"
                        onClick={() => onNavigate('mantenimientos')}
                    >
                        <CalendarDays size={18} />
                        Ver mantenimientos
                    </button>
                </div>
            </div>

            {error && (
                <div className="app-error" role="alert">
                    {error}
                </div>
            )}

            <div className="stats-grid">
                {TARJETAS.map((tarjeta) => {
                    const Icono = tarjeta.icono;

                    return (
                        <div className="stat-card" key={tarjeta.clave}>
                            <div className="stat-card-top">
                                <span>{tarjeta.titulo}</span>

                                <div className={`stat-icon ${tarjeta.color}`}>
                                    <Icono size={21} />
                                </div>
                            </div>

                            <strong className="stat-value">
                                {cargando
                                    ? '...'
                                    : estadisticas?.[tarjeta.clave] ?? '—'}
                            </strong>

                            <span className="stat-caption">
                                {error
                                    ? 'Información no disponible'
                                    : cargando
                                    ? 'Actualizando información...'
                                    : 'Datos actualizados desde Laravel'}
                            </span>
                        </div>
                    );
                })}
            </div>

            {puedeGestionar && (
                <section className="panel upcoming-panel">
                    <div className="panel-heading">
                        <div>
                            <h2>Próximos mantenimientos</h2>
                            <p>
                                Fechas calculadas con la frecuencia de los planes activos
                            </p>
                        </div>

                        <div className="upcoming-heading-icon">
                            <Bell size={20} />
                        </div>
                    </div>

                    {cargando ? (
                        <div className="empty-state">
                            <p>Calculando próximos mantenimientos...</p>
                        </div>
                    ) : proximosPlanes.length === 0 ? (
                        <div className="empty-state">
                            <CalendarDays size={35} />
                            <h3>Sin planes próximos</h3>
                            <p>No hay planes activos con fecha y frecuencia válidas.</p>
                        </div>
                    ) : (
                        <div className="upcoming-list">
                            {proximosPlanes.map((plan) => (
                                <div className="upcoming-item" key={plan.id}>
                                    <div className="upcoming-item-top">
                                        <strong>{plan.nombre}</strong>
                                        <span className={`upcoming-days ${plan.dias_restantes <= 7 ? 'soon' : ''}`}>
                                            {textoVencimiento(plan.dias_restantes)}
                                        </span>
                                    </div>

                                    <p>
                                        {plan.codigo_equipo} · {plan.equipo}
                                    </p>

                                    <div className="upcoming-item-meta">
                                        <span>{formatearFechaPlan(plan.fecha_proxima)}</span>
                                        <span>Cada {plan.frecuencia_dias} días</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            )}

            <div className="dashboard-grid">
                <section className="panel">
                    <div className="panel-heading">
                        <div>
                            <h2>Mantenimientos recientes</h2>
                            <p>Últimos trabajos registrados</p>
                        </div>

                        <Activity size={20} />
                    </div>

                    {cargando ? (
                        <div className="empty-state">
                            <p>Cargando mantenimientos...</p>
                        </div>
                    ) : recientes.length === 0 ? (
                        <div className="empty-state">
                            <CalendarDays size={35} />
                            <h3>Sin registros recientes</h3>
                            <p>
                                Los mantenimientos aparecerán aquí
                                cuando existan registros disponibles.
                            </p>
                        </div>
                    ) : (
                        <div className="dashboard-recent-list">
                            {recientes.map((item) => (
                                <div
                                    className="dashboard-recent-item"
                                    key={item.id}
                                >
                                    <div>
                                        <strong>
                                            #{item.id} — {item.plan?.nombre || 'Sin plan'}
                                        </strong>

                                        <span>
                                            {formatearFecha(item.fecha_programada)}
                                        </span>

                                        <span>
                                            Prioridad: {item.prioridad?.nombre || '—'}
                                        </span>

                                        <span>
                                            Técnicos: {item.tecnicos?.length
                                                ? item.tecnicos
                                                    .map((t) => t.nombre)
                                                    .join(', ')
                                                : 'Sin asignar'}
                                        </span>
                                    </div>

                                    <span className="maintenance-status">
                                        {item.estado?.nombre || '—'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>

                <section className="panel">
                    <div className="panel-heading">
                        <div>
                            <h2>Accesos rápidos</h2>
                            <p>Funciones del sistema</p>
                        </div>
                    </div>

                    <div className="quick-actions">
                        <button onClick={() => onNavigate('mantenimientos')}>
                            <CalendarDays size={20} />
                            <span>Mantenimientos</span>
                            <ArrowUpRight size={17} />
                        </button>

                        {puedeGestionar && (
                            <button onClick={() => onNavigate('asignaciones')}>
                                <Wrench size={20} />
                                <span>Asignaciones</span>
                                <ArrowUpRight size={17} />
                            </button>
                        )}

                        <button onClick={() => onNavigate('intervenciones')}>
                            <ClipboardCheck size={20} />
                            <span>Intervenciones</span>
                            <ArrowUpRight size={17} />
                        </button>
                    </div>
                </section>
            </div>
        </div>
    );
}
