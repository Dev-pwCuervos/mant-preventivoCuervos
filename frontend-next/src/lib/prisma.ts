
import "server-only";

import { PrismaClient } from "@/generated/prisma/client";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
    throw new Error(
        "DATABASE_URL no está configurada."
    );
}

const url = new URL(databaseUrl);

const globalForPrisma = globalThis as unknown as {
    prisma?: PrismaClient;
};

function crearCliente(): PrismaClient {
    const adapter = new PrismaMariaDb({
        host: url.hostname,
        port: Number(url.port || 3306),
        user: decodeURIComponent(url.username),
        password: decodeURIComponent(url.password),
        database: decodeURIComponent(
            url.pathname.replace(/^\//, "")
        ),
        connectionLimit: 5,
    });

    return new PrismaClient({
        adapter,
    });
}

export const prisma =
    globalForPrisma.prisma ?? crearCliente();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}
