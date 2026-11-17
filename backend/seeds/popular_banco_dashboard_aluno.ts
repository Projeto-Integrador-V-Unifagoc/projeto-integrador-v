import type { Knex } from "knex";

// Dados de demonstração do dashboard do aluno (fase 2).
// Roda depois de 20260512000000_popular_banco.ts, que apaga e recria a base.
// Idempotente: apaga e recria as avaliações e aulas das turmas da aluna demo, com datas
// relativas a hoje, para o cenário funcionar em qualquer dia.
//   npm run seed --prefix backend -- --specific=popular_banco_dashboard_aluno.ts

const EMAIL_ALUNA = "ana.beatriz1@aluno.unieduca.net.br";
const TOTAL_AULAS = 25;

interface Cenario {
  /** Notas da aluna em P1 (20), Trabalho 1 (15) e P2 (20); null = não lançada. */
  notas: [number, number, number | null];
  faltas: number;
  /** Dias até a devolução da TPI. */
  devolucaoTpi: number;
}

// Média parcial = pontos obtidos ÷ pontos lançados × 100 (calcularBoletim).
// Risco: frequência < 75% = alto; média < 60% ou frequência ≤ 80% = médio.
const CENARIOS: Record<string, Cenario> = {
  ADS101: { notas: [18, 13, 17.5], faltas: 1, devolucaoTpi: 2 }, // 88,2% · 96% → sem risco
  ADS104: { notas: [18.5, 14, 17.5], faltas: 2, devolucaoTpi: 9 }, // 90,9% · 92% → sem risco
  ADS102: { notas: [12.5, 9.5, 12], faltas: 6, devolucaoTpi: 5 }, // 61,8% · 76% → risco médio (frequência limítrofe)
  ADS105: { notas: [11, 8.5, 11.5], faltas: 4, devolucaoTpi: 18 }, // 56,4% · 84% → risco médio (média < 60%)
  ADS103: { notas: [10.5, 7.5, null], faltas: 8, devolucaoTpi: 22 }, // 51,4% · 68% → risco alto (frequência); P2 vencida sem nota
};
const ORDEM_FALLBACK = ["ADS101", "ADS104", "ADS102", "ADS105", "ADS103"];

function dia(offset: number): string {
  const data = new Date();
  data.setHours(12, 0, 0, 0);
  data.setDate(data.getDate() + offset);
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const d = String(data.getDate()).padStart(2, "0");
  return `${data.getFullYear()}-${mes}-${d}`;
}

const meioPonto = (valor: number) => Math.round(valor * 2) / 2;

/** Índices das aulas em que a aluna faltou, espalhados ao longo do período. */
function aulasComFalta(faltas: number): Set<number> {
  const indices = new Set<number>();
  for (let i = 0; i < faltas; i++) indices.add(Math.floor(((i + 0.5) * TOTAL_AULAS) / faltas));
  return indices;
}

export async function seed(knex: Knex): Promise<void> {
  // Só demonstração: apaga e recria avaliações/aulas das turmas da aluna demo. Nunca roda em produção.
  if (process.env.NODE_ENV === "production" || process.env.DEMO_SEEDS === "false") {
    console.log("Seed do dashboard do aluno ignorado: dados de demonstração desativados neste ambiente.");
    return;
  }

  const aluna = await knex("piv.usuario as u")
    .join("piv.aluno as a", "a.usuario_id", "u.id")
    .where("u.email", EMAIL_ALUNA)
    .first("a.id as aluno_id");

  if (!aluna) {
    console.log(`Seed do dashboard do aluno ignorado: ${EMAIL_ALUNA} não encontrada.`);
    return;
  }

  const turmas = await knex("piv.matricula_turma_disciplina as mtd")
    .join("piv.matricula as m", "mtd.matricula_id", "m.id")
    .join("piv.turma_disciplina as td", "mtd.turma_disciplina_id", "td.id")
    .join("piv.curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
    .join("piv.disciplinas as d", "cd.disciplina_id", "d.id")
    .join("piv.professor as p", "td.professor_id", "p.id")
    .where("m.aluno_id", aluna.aluno_id)
    .select("td.id as turma_disciplina_id", "td.professor_id", "p.usuario_id as professor_usuario_id", "d.codigo", "mtd.id as mtd_aluna")
    .orderBy("d.codigo");

  if (!turmas.length) {
    console.log("Seed do dashboard do aluno ignorado: a aluna não tem turmas.");
    return;
  }

  await knex.transaction(async (trx) => {
    const tdIds = turmas.map((t) => t.turma_disciplina_id);
    // Notas, frequências e auditorias caem em cascata.
    await trx("piv.avaliacao").whereIn("turma_disciplina_id", tdIds).delete();
    await trx("piv.aula").whereIn("turma_disciplina_id", tdIds).delete();

    await trx("piv.local").insert({ codigo: "SALA-DEMO-ALUNO" }).onConflict("codigo").ignore();
    const local = await trx("piv.local").where("codigo", "SALA-DEMO-ALUNO").first("id");

    for (const [posicao, turma] of turmas.entries()) {
      const cenario = CENARIOS[turma.codigo] ?? CENARIOS[ORDEM_FALLBACK[posicao % ORDEM_FALLBACK.length]];
      const matriculas: { id: string }[] = await trx("piv.matricula_turma_disciplina")
        .where("turma_disciplina_id", turma.turma_disciplina_id)
        .select("id")
        .orderBy("id");
      const colegas = matriculas.filter((m) => m.id !== turma.mtd_aluna);
      const responsavel = turma.professor_usuario_id ?? null;

      // ---------- avaliações (100 pontos regulares) ----------
      const plano = [
        { tipo: "PROVA", descricao: "Prova 1", valor: 20, lancamento: -50, devolucao: -43 },
        { tipo: "TRABALHO", descricao: "Trabalho 1 - Estudo de caso", valor: 15, lancamento: -35, devolucao: -28 },
        { tipo: "PROVA", descricao: "Prova 2", valor: 20, lancamento: -14, devolucao: -7 },
        { tipo: "TPI", descricao: "Trabalho Prático Integrador", valor: 5, lancamento: cenario.devolucaoTpi - 7, devolucao: cenario.devolucaoTpi },
        { tipo: "PROVA", descricao: "Prova 3", valor: 20, lancamento: 20 + posicao, devolucao: 27 + posicao },
        { tipo: "TRABALHO", descricao: "Trabalho final", valor: 20, lancamento: 32 + posicao, devolucao: 39 + posicao },
      ];
      const avaliacoes = await trx("piv.avaliacao")
        .insert(plano.map((a) => ({
          turma_disciplina_id: turma.turma_disciplina_id,
          tipo_avaliacao: a.tipo,
          descricao_avaliacao: a.descricao,
          valor: a.valor,
          data_lancamento: `${dia(a.lancamento)} 19:00:00`,
          data_devolucao: dia(a.devolucao),
        })))
        .returning(["id"]);

      // Notas só nas avaliações já devolvidas (P1, Trabalho 1 e P2).
      const notas: Record<string, unknown>[] = [];
      for (let indice = 0; indice < 3; indice++) {
        const avaliacao = avaliacoes[indice];
        const publicadaEm = `${dia(plano[indice].devolucao)} 18:00:00`;
        const notaAluna = cenario.notas[indice];
        if (notaAluna !== null) {
          notas.push({ avaliacao_id: avaliacao.id, matricula_turma_disciplina_id: turma.mtd_aluna, valor: notaAluna, publicada_em: publicadaEm, criada_por_usuario_id: responsavel });
        }
        colegas.forEach((colega, posColega) => {
          const aproveitamento = 0.58 + (((posColega + 1) * 37 + indice * 13 + posicao * 7) % 41) / 100;
          notas.push({
            avaliacao_id: avaliacao.id,
            matricula_turma_disciplina_id: colega.id,
            valor: Math.min(plano[indice].valor, meioPonto(plano[indice].valor * aproveitamento)),
            publicada_em: publicadaEm,
            criada_por_usuario_id: responsavel,
          });
        });
      }
      if (notas.length) await trx("piv.nota").insert(notas);

      // ---------- aulas e frequência ----------
      const aulas = await trx("piv.aula")
        .insert(Array.from({ length: TOTAL_AULAS }, (_, i) => ({
          turma_disciplina_id: turma.turma_disciplina_id,
          professor_id: turma.professor_id,
          local_id: local.id,
          data: `${dia(-2 - 3 * (TOTAL_AULAS - 1 - i))} 19:00:00`,
        })))
        .returning(["id", "data"]);

      const faltasAluna = aulasComFalta(cenario.faltas);
      const frequencias: Record<string, unknown>[] = [];
      aulas.forEach((aula: { id: string }, indiceAula: number) => {
        const data = dia(-2 - 3 * (TOTAL_AULAS - 1 - indiceAula));
        const lancadaEm = `${data} 22:00:00`;
        frequencias.push({
          aula_id: aula.id,
          matricula_turma_disciplina_id: turma.mtd_aluna,
          status: faltasAluna.has(indiceAula) ? "AUSENTE" : "PRESENTE",
          data,
          lancada_em: lancadaEm,
          responsavel_lancamento_usuario_id: responsavel,
        });
        colegas.forEach((colega, posColega) => {
          const ausente = ((posColega + 1) * 7 + indiceAula * 3 + posicao) % 17 === 0;
          frequencias.push({
            aula_id: aula.id,
            matricula_turma_disciplina_id: colega.id,
            status: ausente ? "AUSENTE" : "PRESENTE",
            data,
            lancada_em: lancadaEm,
            responsavel_lancamento_usuario_id: responsavel,
          });
        });
      });
      await trx("piv.frequencia").insert(frequencias);
    }
  });

  console.log(`Dashboard do aluno: cenário de demonstração recriado para ${EMAIL_ALUNA} (${turmas.length} disciplinas).`);
}
