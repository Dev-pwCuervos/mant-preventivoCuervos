
"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, LoaderCircle, X } from "lucide-react";
import axios from "axios";

type Observacion = {
    id: string;
    supervisor: string;
    comentario: string;
    created_at: string | null;
};

type Props = {
    mantenimientoId: number;
    nombrePlan: string;
    onClose: () => void;
};

function obtenerMensaje(error: unknown): string {
    if (axios.isAxiosError(error)) {
        return error.response?.data?.message ||
            "No fue posible completar la operación.";
    }

    return "Ocurrió un error inesperado.";
}

export default function ObservacionesModal({
    mantenimientoId,
    nombrePlan,
    onClose,
}: Props) {
    const [observaciones, setObservaciones] =
        useState<Observacion[]>([]);
    const [comentario, setComentario] = useState("");
    const [cargando, setCargando] = useState(true);
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState("");
    const [mensaje, setMensaje] = useState("");

    const cargar = useCallback(async () => {
        setCargando(true);
        setError("");

        try {
            const respuesta = await axios.get<{
                data: Observacion[];
            }>("/supervision-api/observaciones", {
                params: {
                    mantenimiento_id: mantenimientoId,
                },
                withCredentials: true,
            });

            setObservaciones(respuesta.data.data);
        } catch (err) {
            setError(obtenerMensaje(err));
        } finally {
            setCargando(false);
        }
    }, [mantenimientoId]);

    useEffect(() => {
        void cargar();
    }, [cargar]);

    const guardar = async (evento: FormEvent<HTMLFormElement>) => {
        evento.preventDefault();

        const texto = comentario.trim();

        if (texto.length < 10) {
            setError("Escribe al menos 10 caracteres.");
            return;
        }

        setGuardando(true);
        setError("");
        setMensaje("");

        try {
            await axios.post(
                "/supervision-api/observaciones",
                {
                    mantenimiento_id: mantenimientoId,
                    comentario: texto,
                },
                {
                    withCredentials: true,
                    headers: {
                        Accept: "application/json",
                    },
                }
            );

            setComentario("");
            await cargar();

            setMensaje("Observación guardada correctamente.");
        } catch (err) {
            setError(obtenerMensaje(err));
        } finally {
            setGuardando(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
            <section
                role="dialog"
                aria-modal="true"
                aria-labelledby="titulo-observaciones"
                className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-7 shadow-2xl"
            >
                <div className="mb-6 flex items-start justify-between gap-4">
                    <div>
                        <h2
                            id="titulo-observaciones"
                            className="text-xl font-bold text-slate-950"
                        >
                            Observaciones de Supervisión
                        </h2>
                        <p className="mt-2 text-sm text-slate-500">
                            Orden #{mantenimientoId} — {nombrePlan}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={guardando}
                        aria-label="Cerrar"
                        className="rounded-lg bg-slate-100 p-2 text-slate-600"
                    >
                        <X size={20} />
                    </button>
                </div>

                {error && (
                    <div
                        role="alert"
                        className="mb-4 flex items-center gap-2 rounded-lg bg-red-50 p-4 text-sm text-red-700"
                    >
                        <AlertCircle size={18} />
                        {error}
                    </div>
                )}

                {mensaje && (
                    <div
                        role="status"
                        className="mb-4 flex items-center gap-2 rounded-lg bg-green-50 p-4 text-sm text-green-700"
                    >
                        <CheckCircle2 size={18} />
                        {mensaje}
                    </div>
                )}

                <form onSubmit={guardar}>
                    <label
                        htmlFor="comentario-supervision"
                        className="mb-2 block text-sm font-semibold text-slate-700"
                    >
                        Nueva observación
                    </label>

                    <textarea
                        id="comentario-supervision"
                        required
                        minLength={10}
                        maxLength={5000}
                        rows={4}
                        value={comentario}
                        onChange={(e) => setComentario(e.target.value)}
                        placeholder="Escribe una recomendación o hallazgo..."
                        className="w-full resize-y rounded-lg border border-slate-300 p-3 text-sm text-slate-900 outline-none focus:border-slate-600"
                    />

                    <div className="mt-4 flex justify-end">
                        <button
                            type="submit"
                            disabled={guardando}
                            className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-3 text-sm font-semibold text-white disabled:opacity-50"
                        >
                            {guardando && (
                                <LoaderCircle
                                    size={17}
                                    className="animate-spin"
                                />
                            )}
                            {guardando ? "Guardando..." : "Guardar observación"}
                        </button>
                    </div>
                </form>

                <div className="mt-8 border-t border-slate-200 pt-6">
                    <h3 className="mb-4 font-bold text-slate-900">
                        Historial de observaciones
                    </h3>

                    {cargando ? (
                        <p className="text-sm text-slate-500">
                            Cargando observaciones...
                        </p>
                    ) : observaciones.length === 0 ? (
                        <p className="rounded-lg bg-slate-50 p-5 text-center text-sm text-slate-500">
                            No hay observaciones registradas.
                        </p>
                    ) : (
                        <div className="space-y-3">
                            {observaciones.map((item) => (
                                <article
                                    key={item.id}
                                    className="rounded-lg border border-slate-200 p-4"
                                >
                                    <div className="mb-2 flex flex-wrap justify-between gap-2">
                                        <strong className="text-sm text-slate-900">
                                            {item.supervisor}
                                        </strong>

                                        <span className="text-xs text-slate-500">
                                            {item.created_at
                                                ? new Date(
                                                    item.created_at
                                                ).toLocaleString("es-GT")
                                                : "Sin fecha"}
                                        </span>
                                    </div>

                                    <p className="whitespace-pre-wrap text-sm leading-6 text-slate-600">
                                        {item.comentario}
                                    </p>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>
        </div>
    );
}
