export const TIPOS_DOCUMENTO = [
    { tipo: "RG", label: "RG (Registro Geral)" },
    { tipo: "CPF", label: "CPF (Cadastro de Pessoa Física)" },
    { tipo: "HISTORICO", label: "Histórico Escolar" },
    { tipo: "COMPROVANTE_RESIDENCIA", label: "Comprovante de Residência" },
    { tipo: "NOTAS_ENEM", label: "Notas do ENEM" },
    { tipo: "COMPROVANTE_INSCRICAO_ENEM", label: "Comprovante de Inscrição ENEM" },
    { tipo: "OUTROS", label: "Outros Documentos" },
] as const;

export type CorChip = "default" | "warning" | "success" | "error" | "info";

export const STATUS_DOCUMENTO: Record<string, { label: string; color: CorChip }> = {
    PENDENTE: { label: "Pendente", color: "warning" },
    APROVADO: { label: "Aprovado", color: "success" },
    REPROVADO: { label: "Reprovado", color: "error" },
};

export const STATUS_MATRICULA: Record<string, { label: string; color: CorChip }> = {
    pendente: { label: "Pendente", color: "warning" },
    ativa: { label: "Ativa", color: "success" },
    trancada: { label: "Trancada", color: "info" },
    cancelada: { label: "Cancelada", color: "error" },
    concluida: { label: "Concluída", color: "default" },
};

export function rotuloTipoDocumento(tipo: string): string {
    return TIPOS_DOCUMENTO.find((t) => t.tipo === tipo)?.label ?? tipo;
}

export interface ContagemDocumentos {
    documentos_total: number;
    documentos_pendentes: number;
    documentos_aprovados: number;
    documentos_reprovados: number;
}

export function situacaoDocumentos(c: ContagemDocumentos): { label: string; color: CorChip } {
    if (c.documentos_total === 0) return { label: "Sem documentos", color: "default" };
    if (c.documentos_reprovados > 0) {
        return { label: `${c.documentos_reprovados} reprovado(s)`, color: "error" };
    }
    if (c.documentos_pendentes > 0) {
        return { label: `${c.documentos_pendentes} pendente(s)`, color: "warning" };
    }
    return { label: "Documentação aprovada", color: "success" };
}

export function documentacaoRegular(c: ContagemDocumentos): boolean {
    return c.documentos_pendentes === 0 && c.documentos_reprovados === 0;
}

export function formatarCpf(cpf: string | null | undefined): string {
    const digitos = String(cpf ?? "").replace(/\D/g, "");
    if (digitos.length !== 11) return cpf ?? "—";
    return `${digitos.slice(0, 3)}.${digitos.slice(3, 6)}.${digitos.slice(6, 9)}-${digitos.slice(9)}`;
}
