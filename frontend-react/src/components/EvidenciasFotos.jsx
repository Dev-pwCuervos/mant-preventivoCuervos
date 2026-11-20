export default function EvidenciasFotos({ evidencias }) {
    if (!Array.isArray(evidencias) || evidencias.length === 0) {
        return null;
    }

    return (
        <div className="evidence-gallery">
            <strong>Evidencia fotográfica</strong>
            <div className="evidence-gallery-grid">
                {evidencias.map((foto) => (
                    <a
                        key={foto.id}
                        href={`/api/evidencias/${foto.id}`}
                        target="_blank"
                        rel="noopener"
                        title={`Abrir ${foto.nombre_original}`}
                    >
                        <img
                            src={`/api/evidencias/${foto.id}`}
                            alt={`Evidencia: ${foto.nombre_original}`}
                            loading="lazy"
                        />
                        <span>{foto.nombre_original}</span>
                    </a>
                ))}
            </div>
        </div>
    );
}
