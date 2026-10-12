import type { Knex } from "knex";

export type ExecutorAcademico = Knex | Knex.Transaction;

const CLASSES = [
  ["cursos", "curso", true],
  ["disciplinas", "disciplinas", true],
  ["periodos", "periodo_letivo", true],
  ["turmas", "turma", true],
  ["cursosDisciplinas", "curso_disciplina", true],
  // Vínculo docente decisivo: antes das filhas, junto dos pais da oferta.
  ["professores", "professor", true],
  ["regras", "regra_pontuacao", false],
  ["ofertas", "turma_disciplina", false],
  ["avaliacoes", "avaliacao", false],
  // O status da matrícula pai também determina elegibilidade da disciplina.
  ["matriculas", "matricula", true],
  ["matriculasDisciplinas", "matricula_turma_disciplina", false],
  ["notas", "nota", false],
  ["autorizacoes", "nota_autorizacao_excepcional", false],
] as const;

export type ClasseAlvoAcademico = (typeof CLASSES)[number][0];
export type AlvosAcademicos = Partial<Record<ClasseAlvoAcademico, readonly string[]>>;
type AlvosOrdenados = Record<ClasseAlvoAcademico, string[]>;

export interface ProtocoloAcademico {
  /** Só identifica alvos; nenhuma decisão de permissão/estado pode depender dessa leitura. */
  descobrir: (trx: Knex.Transaction) => Promise<AlvosAcademicos>;
  escritaPais?: readonly ClasseAlvoAcademico[];
}

class AlvosAlterados extends Error {}

export class ConflitoAcademico extends Error {
  readonly status = 409;
  readonly codigo = "CONFLITO_CONCORRENCIA";

  constructor() {
    super("Os registros foram alterados simultaneamente. Recarregue e tente novamente.");
    this.name = "ConflitoAcademico";
  }
}

function ordenar(alvos: AlvosAcademicos): AlvosOrdenados {
  return Object.fromEntries(CLASSES.map(([classe]) => [
    classe, [...new Set(alvos[classe] ?? [])].sort(),
  ])) as AlvosOrdenados;
}

function conflitoRepetivel(erro: unknown): boolean {
  if (erro instanceof AlvosAlterados) return true;
  const codigo = (erro as { code?: string } | null)?.code;
  return codigo === "40P01" || codigo === "40001";
}

function exigirBancoSemTransacao(banco: Knex): void {
  if (banco.isTransaction) {
    throw new TypeError("Executores acadêmicos não aceitam uma transação já aberta.");
  }
}

/**
 * Cada tentativa contém descoberta, locks, releitura e escrita numa transação inteira.
 * O banco recebido deve ser uma conexão Knex sem transação já aberta.
 * A operação deve reler e validar os dados decisivos pelo executor recebido.
 * Não adquirir uma classe anterior depois desta função nem executar efeitos externos
 * no callback: ele pode ser repetido após rollback de conflito PostgreSQL.
 */
export async function transacaoAcademica<T>(
  banco: Knex,
  protocolo: ProtocoloAcademico,
  operacao: (trx: Knex.Transaction, alvos: AlvosOrdenados) => Promise<T>,
): Promise<T> {
  exigirBancoSemTransacao(banco);
  for (let tentativa = 0; tentativa < 3; tentativa++) {
    try {
      return await banco.transaction(async (trx) => {
        const alvos = ordenar(await protocolo.descobrir(trx));
        for (const [classe, tabela, pai] of CLASSES) {
          if (alvos[classe].length === 0) continue;
          const consulta = trx(`piv.${tabela}`)
            .select("id").whereIn("id", alvos[classe]).orderBy("id");
          if (pai && !protocolo.escritaPais?.includes(classe)) await consulta.forShare();
          else await consulta.forUpdate();
        }
        const atuais = ordenar(await protocolo.descobrir(trx));
        if (JSON.stringify(alvos) !== JSON.stringify(atuais)) throw new AlvosAlterados();
        return operacao(trx, atuais);
      }, { isolationLevel: "read committed" });
    } catch (erro) {
      if (!conflitoRepetivel(erro)) throw erro;
      if (tentativa === 2) throw new ConflitoAcademico();
    }
  }
  throw new ConflitoAcademico();
}

/** Inicia o snapshot na conexão Knex; gateways da resposta compartilham o executor recebido. */
export async function snapshotAcademico<T>(
  banco: Knex,
  ler: (trx: Knex.Transaction) => Promise<T>,
): Promise<T> {
  exigirBancoSemTransacao(banco);
  return banco.transaction(ler, { isolationLevel: "repeatable read", readOnly: true });
}
