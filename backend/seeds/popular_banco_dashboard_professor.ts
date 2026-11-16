import bcrypt from "bcrypt";
import type { Knex } from "knex";

// Dados de demonstração do dashboard do professor (fase 2).
// Roda depois de popular_banco_dashboard_aluno.ts (ordem alfabética).
// Idempotente: cria/atualiza alunos de demonstração nas turmas ADS2A e ADS3A e recria as
// avaliações e aulas das ofertas da professora demo nessas turmas, com datas relativas a hoje.
// As turmas da aluna demo (ADS1A) não são tocadas.
//   npm run seed --prefix backend -- --specific=popular_banco_dashboard_professor.ts

const EMAIL_PROFESSORA = "professor1@unieduca.net.br";
const TURMAS = ["ADS2A", "ADS3A"];
const SENHA_PADRAO = "unieduca2026";
const CIDADE_IBGE = "3169703";
const ALUNOS_POR_TURMA = 10;
const TOTAL_AULAS = 20;

const NOMES = [
  "Bruna Tavares", "Caio Mendonça", "Débora Lins", "Enzo Prado", "Fernanda Rocha",
  "Gustavo Leal", "Helena Vidal", "Igor Santana", "Jade Moura", "Kauã Ribeiro",
  "Larissa Pires", "Mateus Duarte", "Nina Carvalho", "Otávio Brandão", "Paula Freire",
  "Rafael Teixeira", "Sofia Martins", "Tiago Nunes", "Valentina Costa", "William Araújo",
];

// Cenário por posição do aluno na turma. Risco (mesma regra do sistema):
// frequência < 75% = crítico; média < 60% ou frequência ≤ 80% = atenção.
const CENARIOS: Array<{ aproveitamento: number; faltas: number }> = [
  { aproveitamento: 0.72, faltas: 6 }, // 70% de frequência → risco alto
  { aproveitamento: 0.66, faltas: 7 }, // 65% → risco alto
  { aproveitamento: 0.52, faltas: 1 }, // média ~52% → risco médio
  { aproveitamento: 0.55, faltas: 2 }, // média ~55% → risco médio
  { aproveitamento: 0.74, faltas: 4 }, // 80% (≤ 80%) → risco médio
  { aproveitamento: 0.76, faltas: 1 },
  { aproveitamento: 0.82, faltas: 0 },
  { aproveitamento: 0.88, faltas: 2 },
  { aproveitamento: 0.92, faltas: 1 },
  { aproveitamento: 0.95, faltas: 0 },
];

function dia(offset: number): string {
  const data = new Date();
  data.setHours(12, 0, 0, 0);
  data.setDate(data.getDate() + offset);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
}

const meioPonto = (valor: number) => Math.round(valor * 2) / 2;

function indicesDeFalta(faltas: number, aulasDisponiveis: number): Set<number> {
  const indices = new Set<number>();
  for (let i = 0; i < faltas; i++) indices.add(Math.floor(((i + 0.5) * aulasDisponiveis) / faltas));
  return indices;
}

export async function seed(knex: Knex): Promise<void> {
  const professora = await knex("piv.usuario as u")
    .join("piv.professor as p", "p.usuario_id", "u.id")
    .where("u.email", EMAIL_PROFESSORA)
    .first("p.id as professor_id", "u.id as usuario_id");
  if (!professora) {
    console.log(`Seed do dashboard do professor ignorado: ${EMAIL_PROFESSORA} não encontrado.`);
    return;
  }

  const turmas = await knex("piv.turma").whereIn("sigla", TURMAS).select("id", "sigla", "curso_id").orderBy("sigla");
  if (!turmas.length) {
    console.log("Seed do dashboard do professor ignorado: turmas ADS2A/ADS3A não encontradas.");
    return;
  }

  const senha = await bcrypt.hash(SENHA_PADRAO, 10);

  await knex.transaction(async (trx) => {
    await trx("piv.local").insert({ codigo: "SALA-DEMO-PROF" }).onConflict("codigo").ignore();
    const local = await trx("piv.local").where("codigo", "SALA-DEMO-PROF").first("id");
    let totalAlunos = 0;
    let totalOfertas = 0;

    for (const [indiceTurma, turma] of turmas.entries()) {
      const sufixoTurma = String(turma.sigla).toLowerCase();
      const ofertasTurma = await trx("piv.turma_disciplina").where("turma_id", turma.id).select("id");

      // ---------- alunos de demonstração (criados/atualizados pelo e-mail) ----------
      const alunosTurma: Array<{ posicao: number; matriculaId: string }> = [];
      for (let posicao = 0; posicao < ALUNOS_POR_TURMA; posicao++) {
        const numero = String(posicao + 1).padStart(2, "0");
        const nome = NOMES[(indiceTurma * ALUNOS_POR_TURMA + posicao) % NOMES.length];
        const email = `aluno.demo.${sufixoTurma}.${numero}@aluno.unieduca.net.br`;
        const cpf = `9${indiceTurma + 1}${String(posicao + 1).padStart(9, "0")}`;

        const [usuario] = await trx("piv.usuario")
          .insert({ nome, email, senha, tipo_usuario: "aluno", acesso_liberado: true })
          .onConflict("email")
          .merge(["nome", "senha", "tipo_usuario", "acesso_liberado"])
          .returning("id");
        const [pessoa] = await trx("piv.pessoa")
          .insert({
            nome, cpf, data_nascimento: `200${posicao % 5}-0${(posicao % 9) + 1}-1${posicao % 9}`,
            logradouro: "Rua da Demonstração", numero: String(200 + posicao), bairro: "Centro",
            cidade_id: CIDADE_IBGE, estado: "MG", cep: "36500000",
          })
          .onConflict("cpf")
          .merge(["nome"])
          .returning("id");

        let aluno = await trx("piv.aluno").where("usuario_id", usuario.id).first("id");
        if (!aluno) {
          [aluno] = await trx("piv.aluno")
            .insert({ usuario_id: usuario.id, pessoa_id: pessoa.id, curso_id: turma.curso_id, periodo: String(indiceTurma + 2) })
            .returning("id");
        }
        const [matricula] = await trx("piv.matricula")
          .insert({ aluno_id: aluno.id, curso_id: turma.curso_id, turma_id: turma.id, status: "ativa", data_matricula: dia(-90) })
          .onConflict(["aluno_id", "turma_id"])
          .merge(["status"])
          .returning("id");

        for (const oferta of ofertasTurma) {
          const existe = await trx("piv.matricula_turma_disciplina").where({ matricula_id: matricula.id, turma_disciplina_id: oferta.id }).first("id");
          if (!existe) await trx("piv.matricula_turma_disciplina").insert({ matricula_id: matricula.id, turma_disciplina_id: oferta.id, status: "ativa" });
        }
        alunosTurma.push({ posicao, matriculaId: matricula.id });
      }
      totalAlunos += alunosTurma.length;

      // ---------- ofertas da professora nesta turma ----------
      const ofertas = await trx("piv.turma_disciplina as td")
        .join("piv.curso_disciplina as cd", "td.curso_disciplina_id", "cd.id")
        .join("piv.disciplinas as d", "cd.disciplina_id", "d.id")
        .where({ "td.turma_id": turma.id, "td.professor_id": professora.professor_id })
        .select("td.id", "d.codigo")
        .orderBy("d.codigo");

      for (const [indiceOferta, oferta] of ofertas.entries()) {
        totalOfertas++;
        await trx("piv.avaliacao").where("turma_disciplina_id", oferta.id).delete();
        await trx("piv.aula").where("turma_disciplina_id", oferta.id).delete();

        const vinculos: Array<{ posicao: number; mtdId: string }> = [];
        for (const aluno of alunosTurma) {
          const mtd = await trx("piv.matricula_turma_disciplina").where({ matricula_id: aluno.matriculaId, turma_disciplina_id: oferta.id }).first("id");
          if (mtd) vinculos.push({ posicao: aluno.posicao, mtdId: mtd.id });
        }

        // ---------- avaliações (100 pontos) ----------
        const plano = [
          { tipo: "PROVA", descricao: "Prova 1", valor: 20, devolucao: -40 },
          { tipo: "TRABALHO", descricao: "Trabalho 1 - Projeto", valor: 15, devolucao: -25 },
          { tipo: "PROVA", descricao: "Prova 2", valor: 20, devolucao: -3 },
          { tipo: "TPI", descricao: "Trabalho Prático Integrador", valor: 5, devolucao: 4 },
          { tipo: "PROVA", descricao: "Prova 3", valor: 20, devolucao: 20 + indiceOferta },
          { tipo: "TRABALHO", descricao: "Trabalho final", valor: 20, devolucao: 30 + indiceOferta },
        ];
        const avaliacoes = await trx("piv.avaliacao")
          .insert(plano.map((a) => ({
            turma_disciplina_id: oferta.id,
            tipo_avaliacao: a.tipo,
            descricao_avaliacao: a.descricao,
            valor: a.valor,
            data_lancamento: `${dia(a.devolucao - 7)} 19:00:00`,
            data_devolucao: dia(a.devolucao),
          })))
          .returning("id");

        // Quem recebe nota em cada avaliação lançada.
        const comNota = (indiceAvaliacao: number, posicao: number) => {
          if (indiceAvaliacao <= 1) return true; // P1 e Trabalho 1 completos
          if (indiceAvaliacao === 2) return !(oferta.codigo === "ADS201" && posicao >= 6); // P2: 4 sem nota em ADS201 (vencida)
          if (indiceAvaliacao === 3) return oferta.codigo === "ADS301" && posicao <= 5; // TPI: parcial (6 de 10) em ADS301
          return false;
        };
        const notas: Record<string, unknown>[] = [];
        plano.forEach((avaliacao, indiceAvaliacao) => {
          for (const vinculo of vinculos) {
            if (!comNota(indiceAvaliacao, vinculo.posicao)) continue;
            const variacao = (((vinculo.posicao + 1) * 5 + indiceAvaliacao * 3 + indiceOferta * 2) % 7 - 3) / 100;
            const percentual = Math.min(1, Math.max(0, CENARIOS[vinculo.posicao].aproveitamento + variacao));
            notas.push({
              avaliacao_id: avaliacoes[indiceAvaliacao].id,
              matricula_turma_disciplina_id: vinculo.mtdId,
              valor: meioPonto(avaliacao.valor * percentual),
              publicada_em: `${dia(Math.min(avaliacao.devolucao, -1))} 18:00:00`,
              criada_por_usuario_id: professora.usuario_id,
            });
          }
        });
        if (notas.length) await trx("piv.nota").insert(notas);

        // ---------- aulas e frequência ----------
        const datas = Array.from({ length: TOTAL_AULAS }, (_, i) => dia(-1 - 3 * (TOTAL_AULAS - 1 - i)));
        const aulas = await trx("piv.aula")
          .insert(datas.map((data) => ({ turma_disciplina_id: oferta.id, professor_id: professora.professor_id, local_id: local.id, data: `${data} 19:00:00` })))
          .returning("id");

        // Chamada incompleta nas 2 aulas mais recentes de ADS204 e ADS304 (3 e 5 registros faltando).
        const chamadaIncompleta = oferta.codigo === "ADS204" || oferta.codigo === "ADS304";
        const faltandoRegistro = (indiceAula: number, posicao: number) => {
          if (!chamadaIncompleta) return false;
          if (indiceAula === TOTAL_AULAS - 1) return posicao >= 7;
          if (indiceAula === TOTAL_AULAS - 2) return posicao >= 5;
          return false;
        };
        const aulasComFaltaPossivel = TOTAL_AULAS - 2;

        const frequencias: Record<string, unknown>[] = [];
        for (const vinculo of vinculos) {
          const faltas = indicesDeFalta(CENARIOS[vinculo.posicao].faltas, aulasComFaltaPossivel);
          aulas.forEach((aula: { id: string }, indiceAula: number) => {
            if (faltandoRegistro(indiceAula, vinculo.posicao)) return;
            frequencias.push({
              aula_id: aula.id,
              matricula_turma_disciplina_id: vinculo.mtdId,
              status: faltas.has(indiceAula) ? "AUSENTE" : "PRESENTE",
              data: datas[indiceAula],
              lancada_em: `${datas[indiceAula]} 22:00:00`,
              responsavel_lancamento_usuario_id: professora.usuario_id,
            });
          });
        }
        if (frequencias.length) await trx("piv.frequencia").insert(frequencias);
      }
    }

    console.log(`Dashboard do professor: ${totalAlunos} alunos demo e ${totalOfertas} ofertas recriadas para ${EMAIL_PROFESSORA}.`);
  });
}

