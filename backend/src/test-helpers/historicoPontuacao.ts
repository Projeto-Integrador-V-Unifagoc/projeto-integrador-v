import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { validarDestinoPostgresTeste } from "./disputaAcademica";
import { criarContextoPontuacao, type ContextoPontuacao } from "./pontuacaoFixture";

export type ModeloHistoricoPontuacao =
  | "completo" | "incompleto" | "zero" | "ausente" | "recuperacao"
  | "cinco_provas20" | "regular50_rec80_retificado70" | "matriz_curso_divergente"
  | "nota_oferta_divergente" | "duas_tpi5" | "trabalhos36" | "nota_acima_maximo";

type TipoHistorico = "PROVA" | "TPI" | "TRABALHO" | "RECUPERACAO";
interface AvaliacaoHistorica {
  id: string;
  tipo: TipoHistorico;
  valor: string;
}
export interface HistoricoPontuacao extends ContextoPontuacao {
  ofertaSemHistoricoId: string;
  avaliacoes: AvaliacaoHistorica[];
  notaIds: string[];
  auditoriaIds: string[];
  autorizacaoIds: string[];
}

interface Definicao {
  tipo: TipoHistorico;
  maximo: string;
  nota: string | null;
}
const MODELOS: readonly ModeloHistoricoPontuacao[] = [
  "completo", "incompleto", "zero", "ausente", "recuperacao", "cinco_provas20",
  "regular50_rec80_retificado70", "matriz_curso_divergente", "nota_oferta_divergente",
  "duas_tpi5", "trabalhos36", "nota_acima_maximo",
];
const AVALIACAO_EM = "2026-01-10T09:00:00.000Z";
const NOTA_CRIADA_EM = "2026-01-20T09:55:00.000Z";
const PUBLICADA_EM = "2026-01-20T10:00:00.000Z";
const LANCAMENTO_AUDITADO_EM = "2026-01-20T10:00:01.000Z";
const RETIFICADA_EM = "2026-02-03T10:00:00.000Z";

function definicoes(modelo: ModeloHistoricoPontuacao): Definicao[] {
  const regular: Definicao[] = [
    { tipo: "PROVA", maximo: "20.00", nota: "16.00" },
    { tipo: "PROVA", maximo: "20.00", nota: "16.00" },
    { tipo: "PROVA", maximo: "20.00", nota: "16.00" },
    { tipo: "TPI", maximo: "5.00", nota: "4.00" },
    { tipo: "TRABALHO", maximo: "35.00", nota: "28.00" },
  ];
  if (modelo === "incompleto") return [{ tipo: "PROVA", maximo: "20.00", nota: "10.00" }];
  if (modelo === "zero" || modelo === "ausente") {
    return regular.map((a) => ({ ...a, nota: modelo === "zero" ? "0.00" : null }));
  }
  if (modelo === "cinco_provas20") return Array.from({ length: 5 }, () => ({ tipo: "PROVA", maximo: "20.00", nota: "16.00" }));
  if (modelo === "duas_tpi5") {
    return [...regular.slice(0, 3), { tipo: "TPI", maximo: "5.00", nota: "4.00" },
      { tipo: "TPI", maximo: "5.00", nota: "4.00" }, { tipo: "TRABALHO", maximo: "30.00", nota: "24.00" }];
  }
  if (modelo === "trabalhos36") regular[4] = { tipo: "TRABALHO", maximo: "36.00", nota: "28.00" };
  if (modelo === "nota_acima_maximo") regular[0].nota = "21.00";
  if (modelo === "recuperacao" || modelo === "regular50_rec80_retificado70") {
    // Regular50: 0+15+15+5+15. Uma PROVA0→20 representa a retificação do total para70.
    const valores = ["0.00", "15.00", "15.00", "5.00", "15.00"];
    regular.forEach((a, i) => { a.nota = valores[i]; });
    regular.push({ tipo: "RECUPERACAO", maximo: "100.00", nota: "80.00" });
  }
  return regular;
}

/**
 * Dataset exclusivamente sintético anterior à adoção. Não normaliza, limpa ou
 * desativa proteções; incompatibilidades são as ainda permitidas pelo schema antigo.
 * A fronteira expandida permite apenas que os testes introduzam valores sem typmod.
 */
export async function criarHistoricoPontuacao(db: Knex, modelo: ModeloHistoricoPontuacao): Promise<HistoricoPontuacao> {
  // O modo lembrado pelo bootstrap evita dotenv; não autoriza novas fixtures
  // quando a flag explícita já foi retirada do processo.
  if (process.env.ACADEMICO_MODO_TESTE !== "true") throw new Error("O histórico sintético exige ACADEMICO_MODO_TESTE=true.");
  validarDestinoPostgresTeste(db);
  if (!MODELOS.includes(modelo)) throw new TypeError("Modelo de histórico sintético inválido.");
  const ledger = await db("public.knex_migrations").select("name");
  const posteriores = ledger.filter((m) => String(m.name) >= "20260928000100_expande_pontuacao_dinamica.ts");
  if (ledger.length !== 13 + posteriores.length || posteriores.length > 1
    || posteriores.some((m) => m.name !== "20260928000100_expande_pontuacao_dinamica.ts")) {
    throw new Error("O histórico sintético exige a fronteira13 ou14 anterior à adoção/proteções.");
  }
  const { rows } = await db.raw("SELECT 1 FROM pg_trigger WHERE NOT tgisinternal AND tgname LIKE 'pontuacao_%' LIMIT 1");
  if (rows.length) throw new Error("O histórico sintético não pode ser inserido depois das proteções dinâmicas.");

  return db.transaction(async (trx) => {
    const contexto = await criarContextoPontuacao(trx);
    const ofertaSemHistoricoId = randomUUID();
    const turmaSemHistoricoId = randomUUID();
    const oferta = await trx("piv.turma_disciplina").where({ id: contexto.ofertaId }).first("professor_id");
    await trx("piv.turma").insert({
      id: turmaSemHistoricoId, curso_id: contexto.outroCursoId, periodo_letivo_id: contexto.outroPeriodoId,
      periodo_curricular: 1, descricao: "Turma sintética sem histórico", sigla: turmaSemHistoricoId,
      capacidade_alunos: 20, turno: "NOITE", status: "ativa",
    });
    await trx("piv.turma_disciplina").insert({
      id: ofertaSemHistoricoId, turma_id: turmaSemHistoricoId, curso_disciplina_id: contexto.outroCursoDisciplinaId,
      professor_id: oferta.professor_id, status: "ativa",
    });
    if (modelo === "matriz_curso_divergente") {
      // Ambas as FKs existem; o curso da matriz diverge do curso da turma.
      await trx("piv.turma_disciplina").where({ id: contexto.ofertaId }).update({ curso_disciplina_id: contexto.outroCursoDisciplinaId });
    }

    const historico: HistoricoPontuacao = { ...contexto, ofertaSemHistoricoId,
      avaliacoes: [], notaIds: [], auditoriaIds: [], autorizacaoIds: [] };
    for (const [indice, definicao] of definicoes(modelo).entries()) {
      const avaliacaoId = randomUUID();
      await trx("piv.avaliacao").insert({
        id: avaliacaoId, turma_disciplina_id: contexto.ofertaId, tipo_avaliacao: definicao.tipo,
        valor: definicao.maximo, descricao_avaliacao: `Histórico sintético ${definicao.tipo} ${indice + 1}`,
        data_lancamento: AVALIACAO_EM, data_devolucao: "2026-01-15",
      });
      historico.avaliacoes.push({ id: avaliacaoId, tipo: definicao.tipo, valor: definicao.maximo });
      if (definicao.nota === null) continue;

      const notaId = randomUUID();
      const auditoriaId = randomUUID();
      await trx("piv.nota").insert({
        id: notaId, avaliacao_id: avaliacaoId,
        matricula_turma_disciplina_id: modelo === "nota_oferta_divergente" && indice === 0
          ? contexto.outraMatriculaDisciplinaId : contexto.matriculaDisciplinaId,
        valor: definicao.nota, criada_por_usuario_id: contexto.usuarioId, atualizada_por_usuario_id: contexto.usuarioId,
        publicada_em: PUBLICADA_EM, created_at: NOTA_CRIADA_EM, updated_at: PUBLICADA_EM,
      });
      await trx("piv.nota_auditoria").insert({
        id: auditoriaId, nota_id: notaId, usuario_id: contexto.usuarioId, perfil: "secretaria",
        acao: "LANCAMENTO", valor_anterior: null, valor_novo: definicao.nota,
        motivo: "Lançamento histórico sintético", criado_em: LANCAMENTO_AUDITADO_EM,
      });
      historico.notaIds.push(notaId); historico.auditoriaIds.push(auditoriaId);
    }

    const autorizacaoId = randomUUID();
    await trx("piv.nota_autorizacao_excepcional").insert({
      id: autorizacaoId, avaliacao_id: historico.avaliacoes[0].id,
      matricula_turma_disciplina_id: contexto.matriculaDisciplinaId, autorizada_por_usuario_id: contexto.usuarioId,
      motivo: "Autorização histórica sintética para conferir preservação integral",
      expira_em: "2026-02-28T23:59:59.000Z",
      utilizada_em: modelo === "regular50_rec80_retificado70" ? RETIFICADA_EM : null,
      created_at: "2026-02-01T10:00:00.000Z", updated_at: modelo === "regular50_rec80_retificado70" ? RETIFICADA_EM : "2026-02-01T10:00:00.000Z",
    });
    historico.autorizacaoIds.push(autorizacaoId);

    if (modelo === "regular50_rec80_retificado70") {
      const auditoriaId = randomUUID();
      await trx("piv.nota").where({ id: historico.notaIds[0] }).update({ valor: "20.00", updated_at: RETIFICADA_EM });
      await trx("piv.nota_auditoria").insert({
        id: auditoriaId, nota_id: historico.notaIds[0], usuario_id: contexto.usuarioId, perfil: "secretaria",
        acao: "RETIFICACAO", valor_anterior: "0.00", valor_novo: "20.00",
        motivo: "Regular total50→70 após recuperação80 - cenário histórico sintético",
        criado_em: RETIFICADA_EM,
      });
      historico.auditoriaIds.push(auditoriaId);
    }
    return historico;
  });
}
