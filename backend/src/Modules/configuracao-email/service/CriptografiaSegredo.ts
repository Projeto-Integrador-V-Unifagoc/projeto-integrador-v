import crypto from "node:crypto";

import { obterJwtSecret } from "../../../config/jwt";

const ALGORITMO = "aes-256-gcm";
const PREFIXO = "v1";

function derivarChave(): Buffer {
    return crypto.createHash("sha256").update(`smtp:${obterJwtSecret()}`).digest();
}

export function cifrar(valor: string): string {
    if (!valor) return "";

    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGORITMO, derivarChave(), iv);
    const conteudo = Buffer.concat([cipher.update(valor, "utf8"), cipher.final()]);
    const tag = cipher.getAuthTag();

    return [PREFIXO, iv.toString("base64"), tag.toString("base64"), conteudo.toString("base64")].join(":");
}

export function decifrar(valor: string): string {
    if (!valor) return "";

    const partes = valor.split(":");
    if (partes.length !== 4 || partes[0] !== PREFIXO) {
        throw new Error("A senha SMTP armazenada está em um formato inválido. Cadastre a senha novamente.");
    }

    try {
        const decipher = crypto.createDecipheriv(ALGORITMO, derivarChave(), Buffer.from(partes[1], "base64"));
        decipher.setAuthTag(Buffer.from(partes[2], "base64"));

        return Buffer.concat([decipher.update(Buffer.from(partes[3], "base64")), decipher.final()]).toString("utf8");
    } catch {
        throw new Error(
            "Não foi possível ler a senha SMTP salva. Isso acontece quando o JWT_SECRET muda; cadastre a senha novamente.",
        );
    }
}
