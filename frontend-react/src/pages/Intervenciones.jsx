
import { useCallback, useEffect, useState } from 'react';
import {
    Wrench,
    Play,
    CheckCircle2,
    RefreshCw,
    ClipboardCheck,
    Clock3,
    MapPin,
    Camera,
} from 'lucide-react';

import api from '../services/api';
import EvidenciasFotos from '../components/EvidenciasFotos';

const ESTADOS = {
    PENDIENTE: 'Pendiente',
    EN_PROCESO: 'En proceso',
    EN_REVISION: 'En revisión',
    CERRADO: 'Cerrado',
    CANCELADO: 'Cancelado',
};

function formatearFecha(fecha) {
    if (!fecha) return '—';

    const valor = new Date(fecha);

    return Number.isNaN(valor.getTime())
        ? fecha
        : valor.toLocaleString('es-GT');
}

function mensajeError(error) {
    if (error.response?.status === 401) {
        return 'Tu sesión expiró. Inicia sesión nuevamente.';
    }

    if (error.response?.status === 403) {
        return 'No tienes permisos para realizar esta acción.';
    }

    if (error.response?.status === 422) {
        const errores = error.response.data?.errors;

        return errores
            ? Object.values(errores).flat().join(' ')
            : error.response.data?.message || 'Datos inválidos.';
    }

    return (
        error.response?.data?.message ||
        'No fue posible completar la operación.'
    );
}

export default function Intervenciones({ usuario }) {
    const [mantenimientos, setMantenimientos] = useState([]);
    const [cargando, setCargando] = useState(true);
    const [procesando, setProcesando] = useState(null);
    const [observaciones, setObservaciones] = useState({});
    const [evidenciasSeleccionadas, setEvidenciasSeleccionadas] = useState({});
    const [error, setError] = useState('');
    const [mensaje, setMensaje] = useState('');

    const roles = Array.isArray(usuario.roles)
        ? usuario.roles
        : [];

    const esTecnico = roles.includes('Técnico');

    const cargarMantenimientos = useCallback(async () => {
        setCargando(true);
        setError('');

        try {
            let pagina = 1;
            let ultimaPagina = 1;
            const registros = [];

            do {
                const respuesta = await api.get('/api/mantenimientos', {
                    params: { page: pagina },
                });

                registros.push(...(respuesta.data.data || []));
                ultimaPagina = respuesta.data.last_page || 1;
                pagina++;
            } while (pagina <= ultimaPagina);

            setMantenimientos(registros);
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setCargando(false);
        }
    }, []);

    useEffect(() => {
        cargarMantenimientos();
    }, [cargarMantenimientos]);

    const iniciarTrabajo = async (id) => {
        setProcesando(id);
        setError('');
        setMensaje('');

        try {
            await api.post(`/api/mantenimientos/${id}/iniciar`);

            setMensaje(`Mantenimiento #${id} iniciado correctamente.`);
            await cargarMantenimientos();
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setProcesando(null);
        }
    };

    const finalizarTrabajo = async (id) => {
        const texto = observaciones[id]?.trim();

        if (!texto) {
            setError('Debes escribir las observaciones del trabajo.');
            return;
        }

        setProcesando(id);
        setError('');
        setMensaje('');

        try {
            const datos = new FormData();
            datos.append('observaciones', texto);

            for (const archivo of evidenciasSeleccionadas[id] || []) {
                datos.append('evidencias[]', archivo);
            }

            await api.post(
                `/api/mantenimientos/${id}/finalizar`,
                datos,
                { headers: { 'Content-Type': false } }
            );

            setMensaje(
                `Mantenimiento #${id} enviado a revisión correctamente.`
            );

            setObservaciones((actuales) => ({
                ...actuales,
                [id]: '',
            }));
            setEvidenciasSeleccionadas((actuales) => ({
                ...actuales,
                [id]: [],
            }));

            await cargarMantenimientos();
        } catch (err) {
            setError(mensajeError(err));
        } finally {
            setProcesando(null);
        }
    };

    const seleccionarEvidencias = (id, evento) => {
        const archivos = Array.from(evento.target.files || []);
        const permitidos = ['image/jpeg', 'image/png', 'image/webp'];

        if (archivos.length > 3 || archivos.some((archivo) =>
            !permitidos.includes(archivo.type) || archivo.size > 2 * 1024 * 1024
        )) {
            setError('Selecciona hasta 3 fotos JPG, PNG o WebP de máximo 2 MB cada una.');
            evento.target.value = '';
            return;
        }

        setError('');
        setEvidenciasSeleccionadas((actuales) => ({
            ...actuales,
            [id]: archivos,
        }));
    };

    return (
        <div className="dashboard-content">
            <div className="page-heading">
                <div>
                    <span className="eyebrow">OPERACIONES</span>
                    <h1>Intervenciones</h1>
                    <p>
                        Consulta los trabajos asignados, registra
                        su ejecución y envíalos a revisión.
                    </p>
                </div>

                <button
                    className="maintenance-refresh assignment-refresh"
                    onClick={cargarMantenimientos}
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

            {!esTecnico && (
                <div className="panel intervention-notice">
                    <ClipboardCheck size={22} />
                    <div>
                        <strong>Vista de consulta</strong>
                        <p>
                            Solo los usuarios con rol Técnico pueden
                            iniciar o finalizar intervenciones.
                        </p>
                    </div>
                </div>
            )}

            {cargando ? (
                <div className="panel">
                    <div className="empty-state">
                        <p>Cargando intervenciones...</p>
                    </div>
                </div>
            ) : mantenimientos.length === 0 ? (
                <div className="panel">
                    <div className="empty-state">
                        <Wrench size={38} />
                        <h3>No hay intervenciones disponibles</h3>
                        <p>
                            Los trabajos asignados aparecerán aquí.
                        </p>
                    </div>
                </div>
            ) : (
                <div className="intervention-grid">
                    {mantenimientos.map((item) => {
                        const codigo = item.estado?.codigo;
                        const pendiente = codigo === 'PENDIENTE';
                        const enProceso = codigo === 'EN_PROCESO';
                        const ultimoRechazo = item.historial_estados?.[0];

                        return (
                            <section
                                className="panel intervention-card"
                                key={item.id}
                            >
                                <div className="intervention-heading">
                                    <div>
                                        <span className="eyebrow">
                                            ORDEN #{item.id}
                                        </span>

                                        <h2>
                                            {item.plan?.nombre || 'Sin plan'}
                                        </h2>
                                    </div>

                                    <span className="maintenance-status">
                                        {ESTADOS[codigo] || codigo || '—'}
                                    </span>
                                </div>

                                <div className="intervention-info">
                                    <div>
                                        <Clock3 size={17} />
                                        <span>
                                            {formatearFecha(
                                                item.fecha_programada
                                            )}
                                        </span>
                                    </div>

                                    <div>
                                        <ClipboardCheck size={17} />
                                        <span>
                                            Prioridad:{' '}
                                            {item.prioridad?.nombre || '—'}
                                        </span>
                                    </div>

                                    <div>
                                        <MapPin size={17} />
                                        <span>
                                            Ubicación:{' '}
                                            {item.plan?.equipo?.ubicacion?.nombre ||
                                                'Sin ubicación asignada'}
                                        </span>
                                    </div>
                                </div>

                                {esTecnico && pendiente && (
                                    <button
                                        className="primary-button"
                                        disabled={procesando === item.id}
                                        onClick={() =>
                                            iniciarTrabajo(item.id)
                                        }
                                    >
                                        <Play size={17} />
                                        Iniciar trabajo
                                    </button>
                                )}

                                {esTecnico && enProceso && (
                                    <div className="intervention-finish">
                                        {ultimoRechazo?.motivo && (
                                            <div className="app-error" role="status">
                                                <strong>Correcciones solicitadas:</strong>{' '}
                                                {ultimoRechazo.motivo}
                                            </div>
                                        )}

                                        <label htmlFor={`obs-${item.id}`}>
                                            Observaciones del trabajo
                                        </label>

                                        <textarea
                                            id={`obs-${item.id}`}
                                            rows={4}
                                            maxLength={5000}
                                            placeholder="Describe las actividades realizadas..."
                                            value={observaciones[item.id] || ''}
                                            onChange={(e) =>
                                                setObservaciones((actuales) => ({
                                                    ...actuales,
                                                    [item.id]: e.target.value,
                                                }))
                                            }
                                        />

                                        <label className="evidence-upload-button">
                                            <Camera size={17} />
                                            Evidencia fotográfica
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                multiple
                                                disabled={procesando === item.id}
                                                onChange={(evento) =>
                                                    seleccionarEvidencias(item.id, evento)
                                                }
                                            />
                                        </label>

                                        <small className="evidence-help">
                                            Hasta 3 fotos JPG, PNG o WebP de 2 MB cada una.
                                        </small>

                                        {(evidenciasSeleccionadas[item.id] || []).length > 0 && (
                                            <ul className="evidence-selected">
                                                {evidenciasSeleccionadas[item.id].map((archivo) => (
                                                    <li key={`${archivo.name}-${archivo.lastModified}`}>
                                                        {archivo.name}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        <button
                                            className="primary-button"
                                            disabled={procesando === item.id}
                                            onClick={() =>
                                                finalizarTrabajo(item.id)
                                            }
                                        >
                                            <CheckCircle2 size={17} />
                                            Enviar a revisión
                                        </button>
                                    </div>
                                )}

                                <EvidenciasFotos evidencias={item.evidencias} />

                                {codigo === 'EN_REVISION' && (
                                    <p className="intervention-message">
                                        Trabajo terminado. Pendiente de revisión.
                                    </p>
                                )}

                                {codigo === 'CERRADO' && (
                                    <p className="intervention-message">
                                        Mantenimiento cerrado.
                                    </p>
                                )}
                            </section>
                        );
                    })}
                </div>
            )}
        </div>
    );
}
