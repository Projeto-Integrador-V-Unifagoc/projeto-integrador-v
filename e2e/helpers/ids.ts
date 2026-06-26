import { randomUUID } from "node:crypto";

/**
 * Geradores determinísticos de identificadores únicos por execução (spec §5.2).
 * Cada teste deve usar um `runId` em e-mails, CPFs, códigos e siglas para
 * permitir execução paralela e limpeza por escopo sem colisões.
 */

let contador = 0;

/** runId curto e único — base36 do tempo + contador + ruído aleatório. */
export function runId(): string {
  contador += 1;
  const tempo = Date.now().toString(36).slice(-6);
  const ruido = Math.random().toString(36).slice(2, 6);
  return `${tempo}${contador.toString(36)}${ruido}`;
}

export const uuid = (): string => randomUUID();

/**
 * Inteiro positivo único (cabe em `integer` do Postgres). Usado, por exemplo,
 * como `ano` do período letivo para satisfazer a restrição única (ano, semestre)
 * entre cenários paralelos sem afetar a janela de datas, que é baseada em hoje.
 */
export function numeroUnico(): number {
  contador += 1;
  // Aleatório em espaço amplo (< 2^31) para baixa colisão entre processos/workers.
  return Math.floor(Math.random() * 2_000_000_000) + 1;
}

/** E-mail único e válido derivado do runId. */
export function email(prefixo: string, id: string): string {
  return `${prefixo}.${id}@e2e.unieduca.test`.toLowerCase();
}

/** Código alfanumérico em caixa alta (departamento, curso, disciplina, período). */
export function codigo(prefixo: string, id: string): string {
  return `${prefixo}${id}`.toUpperCase().slice(0, 20);
}

/** Sigla curta para turmas. */
export function sigla(id: string): string {
  return `T${id}`.toUpperCase().slice(0, 12);
}

/**
 * Gera um CPF sintético válido (com dígitos verificadores corretos). O módulo de
 * professor valida o checksum do CPF, então não basta uma string de 11 dígitos.
 * O valor é aleatório para respeitar a restrição de unicidade do banco.
 */
export function cpf(): string {
  const base = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const digito = (numeros: number[]): number => {
    const fator = numeros.length + 1;
    const soma = numeros.reduce((acc, n, i) => acc + n * (fator - i), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = digito(base);
  const d2 = digito([...base, d1]);
  return [...base, d1, d2].join("");
}

/** CPF formatado (000.000.000-00) a partir de um CPF de 11 dígitos. */
export function formatarCpf(valor: string): string {
  return valor.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
}
