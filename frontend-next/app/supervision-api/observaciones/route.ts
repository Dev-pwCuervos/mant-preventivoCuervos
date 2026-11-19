
import { NextRequest, NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";
import { obtenerSupervisor } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function convertirId(valor: string | null): bigint | null {
    if (!valor || !/^[1-9]\d*$/.test(valor)) {
        return null;
    }

    try {
        return BigInt(valor);
    } catch {
        return null;
    }
}

export async function GET(request: NextRequest) {
    try {
        const usuario = await obtenerSupervisor();

        if (!usuario) {
            return NextResponse.json(
                { message: "No autorizado." },
                { status: 401 }
            );
        }

        const mantenimientoId = convertirId(
            request.nextUrl.searchParams.get("mantenimiento_id")
        );

        if (!mantenimientoId) {
            return NextResponse.json(
                { message: "Mantenimiento inválido." },
                { status: 422 }
            );
        }

        const observaciones =
            await prisma.observaciones_supervision.findMany({
                where: {
                    mantenimiento_id: mantenimientoId,
                },
                include: {
                    usuarios: {
                        select: {
                            id: true,
                            nombre: true,
                        },
                    },
                },
                orderBy: {
                    id: "desc",
                },
            });

        return NextResponse.json({
            data: observaciones.map((item) => ({
                id: item.id.toString(),
                mantenimiento_id:
                    item.mantenimiento_id.toString(),
                supervisor_id:
                    item.supervisor_id.toString(),
                supervisor: item.usuarios.nombre,
                comentario: item.comentario,
                created_at: item.created_at,
            })),
        });
    } catch (error) {
        console.error("Error al consultar observaciones:", error);

        return NextResponse.json(
            { message: "Error al consultar observaciones." },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const usuario = await obtenerSupervisor();

        if (!usuario) {
            return NextResponse.json(
                { message: "No autorizado." },
                { status: 401 }
            );
        }

        const origen = request.headers.get("origin");
        const origenEsperado = request.nextUrl.origin;

        if (origen !== origenEsperado) {
            return NextResponse.json(
                { message: "Origen no autorizado." },
                { status: 403 }
            );
        }

        const body = await request.json();

        const mantenimientoId = convertirId(
            String(body.mantenimiento_id ?? "")
        );

        const comentario =
            typeof body.comentario === "string"
                ? body.comentario.trim()
                : "";

        if (!mantenimientoId) {
            return NextResponse.json(
                { message: "Mantenimiento inválido." },
                { status: 422 }
            );
        }

        if (
            comentario.length < 10 ||
            comentario.length > 5000
        ) {
            return NextResponse.json(
                {
                    message:
                        "El comentario debe contener entre 10 y 5000 caracteres.",
                },
                { status: 422 }
            );
        }

        const mantenimiento =
            await prisma.mantenimientos.findUnique({
                where: {
                    id: mantenimientoId,
                },
                select: {
                    id: true,
                },
            });

        if (!mantenimiento) {
            return NextResponse.json(
                { message: "Mantenimiento no encontrado." },
                { status: 404 }
            );
        }

        const observacion =
    await prisma.observaciones_supervision.create({
        data: {
            mantenimiento_id: mantenimientoId,
            supervisor_id: BigInt(usuario.id),
            comentario,
            created_at: new Date(),
        },
    });

        return NextResponse.json(
            {
                message:
                    "Observación registrada correctamente.",
                data: {
                    id: observacion.id.toString(),
                    comentario: observacion.comentario,
                    mantenimiento_id:
                        observacion.mantenimiento_id.toString(),
                },
            },
            { status: 201 }
        );
    } catch (error) {
        console.error("Error al registrar observación:", error);

        return NextResponse.json(
            { message: "No fue posible registrar la observación." },
            { status: 500 }
        );
    }
}
