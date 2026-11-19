
import { useCallback, useEffect, useState } from 'react';
import {
    Users,
    UserCheck,
    ClipboardList,
    RefreshCw,
    CheckCircle2,
    AlertCircle,
} from 'lucide-react';

import api from '../services/api';

export default function Asignaciones({ usuario }) {
    const [mantenimientos, setMantenimientos] = useState([]);
    const [tecnicos, setTecnicos] = useState([]);

    const [mantenimientoId, setMantenimientoId] = useState('');
    const [tecnicosSeleccionados, setTecnicosSeleccionados] = useState([]);

    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    const roles = Array.isArray(usuario?.roles)
        ? usuario.roles
        : [];

    const puedeGestionar = roles.some((rol) =>
        ['Administrador', 'Supervisor'].includes(rol)
    );

    const cargarDatos = useCallback(async () => {
        setCargando(true);
        setError('');

        try {
            const respuesta = await api.get('/api/asignaciones');

            setMantenimientos(respuesta.data.mantenimientos || []);
            setTecnicos(respuesta.data.tecnicos || []);
        } catch (err) {
            setError(
                err.response?.data?.message ||
                'No fue posible cargar las asignaciones.'
            );
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        if (puedeGestionar) {
            cargarDatos();
        }
    }, [puedeGestionar, cargarDatos]);

    const mantenimientoSeleccionado = mantenimientos.find(
        (item) => String(item.id) === String(mantenimientoId)
    );

    const cambiarMantenimiento = (id) => {
        setMantenimientoId(id);
        setTecnicosSeleccionados([]);
        setMensaje('');
        setError('');
    };

    const seleccionarTecnico = (id) => {
        setTecnicosSeleccionados((actuales) =>
            actuales.includes(id)
                ? actuales.filter((item) => item !== id)
                : [...actuales, id]
        );
    };

    const guardarAsignacion = async (evento) => {
        evento.preventDefault();

        if (!mantenimientoId || tecnicosSeleccionados.length === 0) {
            setError('Selecciona un mantenimiento y al menos un técnico.');
            return;
        }

        setGuardando(true);
        setError('');
        setMensaje('');

        try {
            await api.post(
                `/api/mantenimientos/${mantenimientoId}/tecnicos`,
                {
                    tecnicos: tecnicosSeleccionados,
                }
            );

            setMensaje('Técnicos asignados correctamente.');
            setTecnicosSeleccionados([]);

            await cargarDatos();
        } catch (err) {
            const errores = err.response?.data?.errors;

            setError(
                errores
                    ? Object.values(errores).flat().join(' ')
                    : err.response?.data?.message ||
                      'No fue posible guardar la asignación.'
            );
        } finally {
            setGuardando(false);
        }
    };

    if (!puedeGestionar) {
        return (
            <div className="module-placeholder">
                <h1>Acceso restringido</h1>
                <p>No tienes permisos para gestionar asignaciones.</p>
            </div>
        );
    }

    return (
        <div className="dashboard-content">
            <div className="page-heading">
                <div>
                    <span className="eyebrow">OPERACIONES</span>
                    <h1>Asignación de Técnicos</h1>
                    <p>
                        Asigna técnicos a los mantenimientos programados
                        y consulta los responsables de cada trabajo.
                    </p>
                </div>

                <button
                    className="maintenance-refresh assignment-refresh"
                    onClick={cargarDatos}
                    disabled={cargando}
                    type="button"
                >
                    <RefreshCw size={18} />
                    Actualizar
                </button>
            </div>

            {error && (
                <div className="app-error" role="alert">
                    <AlertCircle size={17} />
                    {error}
                </div>
            )}

            {mensaje && (
                <div className="maintenance-success" role="status">
                    <CheckCircle2 size={17} />
                    {mensaje}
                </div>
            )}

            <div className="assignment-grid">
                <section className="panel assignment-panel">
                    <div className="panel-heading">
                        <div>
                            <h2>Nueva asignación</h2>
                            <p>Selecciona una orden y sus responsables.</p>
                        </div>
                        <UserCheck size={22} />
                    </div>

                    {cargando ? (
                        <p className="assignment-muted">
                            Cargando información...
                        </p>
                    ) : (
                        <form
                            onSubmit={guardarAsignacion}
                            className="assignment-form"
                        >
                            <div className="maintenance-field">
                                <label htmlFor="mantenimiento_asignacion">
                                    Mantenimiento
                                </label>

                                <select
                                    id="mantenimiento_asignacion"
                                    value={mantenimientoId}
                                    onChange={(e) =>
                                        cambiarMantenimiento(e.target.value)
                                    }
                                    required
                                >
                                    <option value="">
                                        Seleccionar mantenimiento
                                    </option>

                                    {mantenimientos.map((item) => (
                                        <option
                                            key={item.id}
                                            value={item.id}
                                        >
                                            #{item.id} - {item.plan?.nombre || 'Sin plan'}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {mantenimientoSeleccionado && (
                                <div className="assignment-detail">
                                    <strong>
                                        {mantenimientoSeleccionado.plan?.nombre}
                                    </strong>

                                    <span>
                                        Estado: {mantenimientoSeleccionado.estado?.nombre}
                                    </span>

                                    <span>
                                        Prioridad: {mantenimientoSeleccionado.prioridad?.nombre}
                                    </span>

                                    <span>
                                        Técnicos actuales:{' '}
                                        {mantenimientoSeleccionado.tecnicos?.length
                                            ? mantenimientoSeleccionado.tecnicos
                                                .map((t) => t.nombre)
                                                .join(', ')
                                            : 'Sin asignar'}
                                    </span>
                                </div>
                            )}

                            <div className="maintenance-field">
                                <label>Técnicos disponibles</label>

                                <div className="assignment-technicians">
                                    {tecnicos.length === 0 ? (
                                        <p className="assignment-muted">
                                            No hay técnicos activos disponibles.
                                        </p>
                                    ) : (
                                        tecnicos.map((tecnico) => {
                                            const yaAsignado =
                                                mantenimientoSeleccionado?.tecnicos?.some(
                                                    (item) => item.id === tecnico.id
                                                ) || false;

                                            return (
                                                <label
                                                    className="assignment-technician"
                                                    key={tecnico.id}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={
                                                            yaAsignado ||
                                                            tecnicosSeleccionados.includes(tecnico.id)
                                                        }
                                                        disabled={
                                                            !mantenimientoId ||
                                                            yaAsignado ||
                                                            guardando
                                                        }
                                                        onChange={() =>
                                                            seleccionarTecnico(tecnico.id)
                                                        }
                                                    />

                                                    <div>
                                                        <strong>{tecnico.nombre}</strong>
                                                        <span>{tecnico.email}</span>
                                                        {yaAsignado && (
                                                            <small>Ya asignado</small>
                                                        )}
                                                    </div>
                                                </label>
                                            );
                                        })
                                    )}
                                </div>
                            </div>

                            <button
                                type="submit"
                                className="primary-button"
                                disabled={
                                    guardando ||
                                    !mantenimientoId ||
                                    tecnicosSeleccionados.length === 0
                                }
                            >
                                <UserCheck size={18} />
                                {guardando
                                    ? 'Guardando...'
                                    : 'Asignar técnicos'}
                            </button>
                        </form>
                    )}
                </section>

                <section className="panel assignment-panel">
                    <div className="panel-heading">
                        <div>
                            <h2>Órdenes y responsables</h2>
                            <p>Mantenimientos pendientes o en proceso.</p>
                        </div>
                        <ClipboardList size={22} />
                    </div>

                    {cargando ? (
                        <p className="assignment-muted">
                            Cargando mantenimientos...
                        </p>
                    ) : mantenimientos.length === 0 ? (
                        <div className="empty-state">
                            <Users size={35} />
                            <h3>No hay mantenimientos disponibles</h3>
                            <p>
                                Programa un mantenimiento para comenzar
                                a asignar técnicos.
                            </p>
                        </div>
                    ) : (
                        <div className="assignment-orders">
                            {mantenimientos.map((item) => (
                                <div
                                    className="assignment-order"
                                    key={item.id}
                                >
                                    <div className="assignment-order-heading">
                                        <strong>
                                            #{item.id} — {item.plan?.nombre || 'Sin plan'}
                                        </strong>

                                        <span className="maintenance-status">
                                            {item.estado?.nombre}
                                        </span>
                                    </div>

                                    <p>
                                        Prioridad: {item.prioridad?.nombre || '—'}
                                    </p>

                                    <div className="assignment-order-users">
                                        <Users size={16} />

                                        <span>
                                            {item.tecnicos?.length
                                                ? item.tecnicos
                                                    .map((t) => t.nombre)
                                                    .join(', ')
                                                : 'Sin técnicos asignados'}
                                        </span>
                                    </div>

                                    <button
                                        type="button"
                                        className="assignment-select"
                                        onClick={() =>
                                            cambiarMantenimiento(String(item.id))
                                        }
                                    >
                                        Seleccionar orden
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
            </div>
        </div>
    );
}
