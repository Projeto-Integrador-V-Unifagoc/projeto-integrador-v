import { randomUUID } from "node:crypto";
import type { Knex } from "knex";

export type ExecutorPontuacao = Knex | Knex.Transaction;

export interface ContextoPontuacao {
  usuarioId: string;
  cidadeId: string;
  faculdadeId: string;
  cursoId: string;
  outroCursoId: string;
  disciplinaId: string;
  outraDisciplinaId: string;
  cursoDisciplinaId: string;
  outroCursoDisciplinaId: string;
  periodoId: string;
  outroPeriodoId: string;
  turmaId: string;
  outraTurmaId: string;
  ofertaId: string;
  outraOfertaId: string;
  alunoId: string;
  matriculaId: string;
  outraMatriculaId: string;
  matriculaDisciplinaId: string;
  outraMatriculaDisciplinaId: string;
}

export interface SubgrupoFixture {
  id: string;
  nome: string;
  orcamento_pontos: string;
  modo_quantidade: "FIXA" | "SEM_LIMITE";
  quantidade_fixa: number | null;
  ordem: number;
}

export interface RegraFixture {
  regraId: string;
  totalPontos: string;
  subgrupos: SubgrupoFixture[];
}

export type PontuacaoFixture = ContextoPontuacao & RegraFixture;

export interface ConfiguracaoRegraFixture {
  totalPontos?: string;
  subgrupos?: Array<Omit<SubgrupoFixture, "id" | "ordem">>;
}

let proximoAno = 2200;

/** Somente dados sintéticos, com IDs próprios por caso; não limpa histórico. */
export async function criarContextoPontuacao(db: Knex): Promise<ContextoPontuacao> {
  return db.transaction(async (trx) => {
    const id = () => randomUUID();
    const contexto: ContextoPontuacao = {
      usuarioId: id(), cidadeId: id(), faculdadeId: id(),
      cursoId: id(), outroCursoId: id(), disciplinaId: id(), outraDisciplinaId: id(),
      cursoDisciplinaId: id(), outroCursoDisciplinaId: id(), periodoId: id(), outroPeriodoId: id(),
      turmaId: id(), outraTurmaId: id(), ofertaId: id(), outraOfertaId: id(),
      alunoId: id(), matriculaId: id(), outraMatriculaId: id(),
      matriculaDisciplinaId: id(), outraMatriculaDisciplinaId: id(),
    };
    const departamentoId = id();
    const professorId = id();
    const pessoaProfessorId = id();
    const pessoaAlunoId = id();
    const ano = proximoAno++;
    const cidadeIbge = `9${ano.toString().padStart(6, "0")}`;

    await trx("piv.usuario").insert({
      id: contexto.usuarioId, nome: "Secretaria sintética",
      email: `${contexto.usuarioId}@example.test`, senha: "fixture-sem-autenticacao",
      tipo_usuario: "secretaria",
    });
    await trx("piv.cidade").insert({ id: contexto.cidadeId, nome: "Cidade sintética", uf: "MG", ibge: cidadeIbge });
    await trx("piv.faculdade").insert({
      id: contexto.faculdadeId, nome: "Faculdade sintética", cidade_id: cidadeIbge,
      logradouro: "Rua de teste", numero: "1", bairro: "Centro", cep: "00000-000",
    });
    await trx("piv.departamento").insert({
      id: departamentoId, codigo: departamentoId, nome: "Departamento sintético",
      faculdade_id: contexto.faculdadeId,
    });
    await trx("piv.curso").insert([
      { id: contexto.cursoId, codigo: contexto.cursoId, nome: "Curso sintético", departamento_id: departamentoId },
      { id: contexto.outroCursoId, codigo: contexto.outroCursoId, nome: "Outro curso sintético", departamento_id: departamentoId },
    ]);
    await trx("piv.disciplinas").insert([
      { id: contexto.disciplinaId, codigo: contexto.disciplinaId, nome: "Disciplina sintética", carga_horaria: 60 },
      { id: contexto.outraDisciplinaId, codigo: contexto.outraDisciplinaId, nome: "Outra disciplina sintética", carga_horaria: 60 },
    ]);
    await trx("piv.curso_disciplina").insert([
      { id: contexto.cursoDisciplinaId, curso_id: contexto.cursoId, disciplina_id: contexto.disciplinaId, carga_horaria: 60 },
      { id: contexto.outroCursoDisciplinaId, curso_id: contexto.outroCursoId, disciplina_id: contexto.outraDisciplinaId, carga_horaria: 60 },
    ]);
    await trx("piv.periodo_letivo").insert([
      { id: contexto.periodoId, codigo: contexto.periodoId, ano, semestre: 1, data_inicio: `${ano}-01-01`, data_fim: `${ano}-06-30`, status: "em_andamento" },
      { id: contexto.outroPeriodoId, codigo: contexto.outroPeriodoId, ano, semestre: 2, data_inicio: `${ano}-07-01`, data_fim: `${ano}-12-31`, status: "em_andamento" },
    ]);
    await trx("piv.pessoa").insert([pessoaProfessorId, pessoaAlunoId].map((pessoaId) => ({
      id: pessoaId, nome: "Pessoa sintética", data_nascimento: "2000-01-01",
      logradouro: "Rua de teste", numero: "1", bairro: "Centro", cidade_id: cidadeIbge,
      estado: "MG", cep: "00000-000", cpf: pessoaId.replaceAll("-", "").slice(0, 14),
    })));
    await trx("piv.professor").insert({
      id: professorId, pessoa_id: pessoaProfessorId, curso_id: contexto.cursoId,
      faculdade_id: contexto.faculdadeId, ativo: true,
    });
    await trx("piv.aluno").insert({
      id: contexto.alunoId, pessoa_id: pessoaAlunoId, curso_id: contexto.cursoId, periodo: "1",
    });
    await trx("piv.turma").insert([contexto.turmaId, contexto.outraTurmaId].map((turmaId) => ({
      id: turmaId, periodo_letivo_id: contexto.periodoId, curso_id: contexto.cursoId,
      periodo_curricular: 1, descricao: "Turma sintética", sigla: turmaId,
      capacidade_alunos: 20, turno: "NOITE", status: "ativa",
    })));
    await trx("piv.turma_disciplina").insert([
      { id: contexto.ofertaId, turma_id: contexto.turmaId, curso_disciplina_id: contexto.cursoDisciplinaId, professor_id: professorId },
      { id: contexto.outraOfertaId, turma_id: contexto.outraTurmaId, curso_disciplina_id: contexto.cursoDisciplinaId, professor_id: professorId },
    ]);
    await trx("piv.matricula").insert([
      { id: contexto.matriculaId, aluno_id: contexto.alunoId, curso_id: contexto.cursoId, turma_id: contexto.turmaId, status: "ativa" },
      { id: contexto.outraMatriculaId, aluno_id: contexto.alunoId, curso_id: contexto.cursoId, turma_id: contexto.outraTurmaId, status: "ativa" },
    ]);
    await trx("piv.matricula_turma_disciplina").insert([
      { id: contexto.matriculaDisciplinaId, turma_disciplina_id: contexto.ofertaId, matricula_id: contexto.matriculaId, status: "ativa" },
      { id: contexto.outraMatriculaDisciplinaId, turma_disciplina_id: contexto.outraOfertaId, matricula_id: contexto.outraMatriculaId, status: "ativa" },
    ]);
    return contexto;
  });
}

/** Regra e composição são gravadas juntas, permitindo validação diferível. */
export async function criarRegraPontuacao(
  db: Knex,
  contexto: Pick<ContextoPontuacao, "cursoId" | "periodoId" | "usuarioId">,
  configuracao: ConfiguracaoRegraFixture = {},
): Promise<RegraFixture> {
  const regraId = randomUUID();
  const totalPontos = configuracao.totalPontos ?? "120.00";
  const composicao = configuracao.subgrupos ?? [
    { nome: "Provas", orcamento_pontos: "72.00", modo_quantidade: "FIXA" as const, quantidade_fixa: 4 },
    { nome: "Institucional", orcamento_pontos: "6.00", modo_quantidade: "FIXA" as const, quantidade_fixa: 1 },
    { nome: "Trabalhos", orcamento_pontos: "42.00", modo_quantidade: "SEM_LIMITE" as const, quantidade_fixa: null },
  ];
  const subgrupos = composicao.map((subgrupo, ordem) => ({ ...subgrupo, id: randomUUID(), ordem }));
  await db.transaction(async (trx) => {
    await trx("piv.regra_pontuacao").insert({
      id: regraId, curso_id: contexto.cursoId, periodo_letivo_id: contexto.periodoId,
      total_pontos: totalPontos, origem: "CONFIGURADA", versao: 1,
      criada_por_usuario_id: contexto.usuarioId, atualizada_por_usuario_id: contexto.usuarioId,
    });
    await trx("piv.subgrupo_avaliacao").insert(subgrupos.map((subgrupo) => ({
      ...subgrupo, regra_pontuacao_id: regraId,
    })));
  });
  return { regraId, totalPontos, subgrupos };
}

export async function criarPontuacaoFixture(db: Knex, configuracao: ConfiguracaoRegraFixture = {}): Promise<PontuacaoFixture> {
  const contexto = await criarContextoPontuacao(db);
  return { ...contexto, ...await criarRegraPontuacao(db, contexto, configuracao) };
}

/** A escrita direta deve fazer os guards fixarem os marcadores de primeiro uso. */
export async function criarAvaliacaoPontuacao(
  executor: ExecutorPontuacao,
  fixture: PontuacaoFixture,
  dados: Record<string, unknown> = {},
): Promise<string> {
  const avaliacaoId = randomUUID();
  await executor("piv.avaliacao").insert({
    id: avaliacaoId, turma_disciplina_id: fixture.ofertaId, tipo_avaliacao: "REGULAR",
    subgrupo_id: fixture.subgrupos[0].id, descricao_avaliacao: "Avaliação sintética",
    data_lancamento: "2026-09-28T12:00:00Z", data_devolucao: "2026-10-01", valor: "18.00",
    ...dados,
  });
  return avaliacaoId;
}

export async function criarNotaPontuacao(
  executor: ExecutorPontuacao,
  fixture: PontuacaoFixture,
  avaliacaoId: string,
  dados: Record<string, unknown> = {},
): Promise<string> {
  const notaId = randomUUID();
  await executor("piv.nota").insert({
    id: notaId, avaliacao_id: avaliacaoId, matricula_turma_disciplina_id: fixture.matriculaDisciplinaId,
    valor: "0.00", criada_por_usuario_id: fixture.usuarioId, atualizada_por_usuario_id: fixture.usuarioId,
    ...dados,
  });
  return notaId;
}
