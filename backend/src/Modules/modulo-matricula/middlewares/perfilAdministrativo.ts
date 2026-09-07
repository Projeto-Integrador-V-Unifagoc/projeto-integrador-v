import { Request, Response, NextFunction } from "express";

/**
 * Perfis com acesso administrativo ao módulo de Matrícula, Vínculos Acadêmicos
 * e Validação de Documentos.
 *
 * O middleware compartilhado `soSecretaria` aceita apenas "secretaria" e barra o
 * administrador, o que contraria a especificação do módulo ("Administrador:
 * possui os mesmos privilégios da Secretaria, com acesso total ao módulo").
 * Como aquele middleware é usado por outros módulos, o módulo de matrícula
 * declara aqui o seu próprio critério em vez de alterar o comportamento alheio.
 */
export const PERFIS_ADMINISTRATIVOS = ["secretaria", "administrador"] as const;

export const somenteSecretariaOuAdmin = (req: Request, res: Response, next: NextFunction) => {
    const perfil = String((req as any).user?.tipo_usuario ?? "").trim().toLowerCase();

    if ((PERFIS_ADMINISTRATIVOS as readonly string[]).includes(perfil)) {
        return next();
    }

    return res.status(403).json({ error: "Acesso negado. Apenas secretaria e administrador." });
};
