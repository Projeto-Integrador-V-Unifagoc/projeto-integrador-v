import type { Knex } from "knex";
import bcrypt from "bcrypt";

const SCHEMA = "piv";
const SENHA = "Relatorios@123";
const CIDADE_IBGE = "3171303";

const demoId = (numero: number) => `12000000-0000-4000-8000-${String(numero).padStart(12, "0")}`;

const ids = {
  faculdade: "12000000-0000-4000-8000-000000000001",
  departamento: "12000000-0000-4000-8000-000000000002",
  curso: "12000000-0000-4000-8000-000000000003",
  periodoLetivo: "12000000-0000-4000-8000-000000000004",
  turma: "12000000-0000-4000-8000-000000000005",
  local: "12000000-0000-4000-8000-000000000006",
  professorUsuario: "12000000-0000-4000-8000-000000000101",
  professorPessoa: "12000000-0000-4000-8000-000000000102",
  professor: "12000000-0000-4000-8000-000000000103",
  alunoUsuario1: "12000000-0000-4000-8000-000000000201",
  alunoUsuario2: "12000000-0000-4000-8000-000000000202",
  alunoUsuario3: "12000000-0000-4000-8000-000000000203",
  alunoPessoa1: "12000000-0000-4000-8000-000000000211",
  alunoPessoa2: "12000000-0000-4000-8000-000000000212",
  alunoPessoa3: "12000000-0000-4000-8000-000000000213",
  aluno1: "12000000-0000-4000-8000-000000000221",
  aluno2: "12000000-0000-4000-8000-000000000222",
  aluno3: "12000000-0000-4000-8000-000000000223",
  disciplina1: "12000000-0000-4000-8000-000000000301",
  disciplina2: "12000000-0000-4000-8000-000000000302",
  cursoDisciplina1: "12000000-0000-4000-8000-000000000311",
  cursoDisciplina2: "12000000-0000-4000-8000-000000000312",
  turmaDisciplina1: "12000000-0000-4000-8000-000000000321",
  turmaDisciplina2: "12000000-0000-4000-8000-000000000322",
  matricula1: "12000000-0000-4000-8000-000000000401",
  matricula2: "12000000-0000-4000-8000-000000000402",
  matricula3: "12000000-0000-4000-8000-000000000403",
};

const alunos = [
  {
    usuarioId: ids.alunoUsuario1,
    pessoaId: ids.alunoPessoa1,
    alunoId: ids.aluno1,
    matriculaId: ids.matricula1,
    nome: "Ana Clara Souza",
    email: "ana.relatorios@unieduca.local",
    cpf: "710.000.000-01",
    nascimento: "2004-03-12",
  },
  {
    usuarioId: ids.alunoUsuario2,
    pessoaId: ids.alunoPessoa2,
    alunoId: ids.aluno2,
    matriculaId: ids.matricula2,
    nome: "Bruno Henrique Lima",
    email: "bruno.relatorios@unieduca.local",
    cpf: "710.000.000-02",
    nascimento: "2003-07-22",
  },
  {
    usuarioId: ids.alunoUsuario3,
    pessoaId: ids.alunoPessoa3,
    alunoId: ids.aluno3,
    matriculaId: ids.matricula3,
    nome: "Carla Rocha Alves",
    email: "carla.relatorios@unieduca.local",
    cpf: "710.000.000-03",
    nascimento: "2004-10-08",
  },
];

const disciplinas = [
  {
    id: ids.disciplina1,
    cursoDisciplinaId: ids.cursoDisciplina1,
    turmaDisciplinaId: ids.turmaDisciplina1,
    codigo: "PI5-REL",
    nome: "Projeto Integrador V",
    cargaHoraria: 80,
  },
  {
    id: ids.disciplina2,
    cursoDisciplinaId: ids.cursoDisciplina2,
    turmaDisciplinaId: ids.turmaDisciplina2,
    codigo: "ESW3-REL",
    nome: "Engenharia de Software III",
    cargaHoraria: 60,
  },
];

const notas: Record<string, Record<string, number[]>> = {
  [ids.aluno1]: {
    [ids.turmaDisciplina1]: [8.5, 9.0],
    [ids.turmaDisciplina2]: [7.8, 8.2],
  },
  [ids.aluno2]: {
    [ids.turmaDisciplina1]: [6.2, 6.8],
    [ids.turmaDisciplina2]: [5.5, 6.0],
  },
  [ids.aluno3]: {
    [ids.turmaDisciplina1]: [4.5, 5.2],
    [ids.turmaDisciplina2]: [7.0, 7.4],
  },
};

const presencas: Record<string, Record<string, string[]>> = {
  [ids.aluno1]: {
    [ids.turmaDisciplina1]: ["PRESENTE", "PRESENTE", "PRESENTE", "PRESENTE", "PRESENTE"],
    [ids.turmaDisciplina2]: ["PRESENTE", "PRESENTE", "PRESENTE", "PRESENTE", "AUSENTE"],
  },
  [ids.aluno2]: {
    [ids.turmaDisciplina1]: ["PRESENTE", "PRESENTE", "PRESENTE", "AUSENTE", "PRESENTE"],
    [ids.turmaDisciplina2]: ["PRESENTE", "PRESENTE", "AUSENTE", "AUSENTE", "PRESENTE"],
  },
  [ids.aluno3]: {
    [ids.turmaDisciplina1]: ["PRESENTE", "AUSENTE", "AUSENTE", "PRESENTE", "AUSENTE"],
    [ids.turmaDisciplina2]: ["PRESENTE", "PRESENTE", "PRESENTE", "AUSENTE", "PRESENTE"],
  },
};

export async function seed(knex: Knex): Promise<void> {
  const senhaHash = await bcrypt.hash(SENHA, 10);

  await knex(`${SCHEMA}.cidade`)
    .insert({
      nome: "Uba",
      uf: "MG",
      ibge: CIDADE_IBGE,
    })
    .onConflict("ibge")
    .merge(["nome", "uf"]);

  await knex(`${SCHEMA}.faculdade`)
    .insert({
      id: ids.faculdade,
      nome: "Centro Universitario UniEduca",
      cidade_id: CIDADE_IBGE,
      logradouro: "Avenida Academica",
      numero: "1000",
      bairro: "Centro",
      cep: "36500-000",
    })
    .onConflict("id")
    .merge();

  await knex(`${SCHEMA}.departamento`)
    .insert({
      id: ids.departamento,
      codigo: "DCC-REL",
      nome: "Departamento de Ciencia da Computacao",
      faculdade_id: ids.faculdade,
    })
    .onConflict("codigo")
    .merge();

  await knex(`${SCHEMA}.curso`)
    .insert({
      id: ids.curso,
      codigo: "ADS-REL",
      nome: "Analise e Desenvolvimento de Sistemas",
      departamento_id: ids.departamento,
    })
    .onConflict("codigo")
    .merge();

  await knex(`${SCHEMA}.local`)
    .insert({ id: ids.local, codigo: "LAB-REL-01" })
    .onConflict("codigo")
    .merge();

  await knex(`${SCHEMA}.usuario`)
    .insert([
      {
        id: ids.professorUsuario,
        nome: "Marina Rocha",
        email: "professor.relatorios@unieduca.local",
        senha: senhaHash,
        tipo_usuario: "professor",
      },
      ...alunos.map((aluno) => ({
        id: aluno.usuarioId,
        nome: aluno.nome,
        email: aluno.email,
        senha: senhaHash,
        tipo_usuario: "aluno",
      })),
    ])
    .onConflict("email")
    .merge(["nome", "senha", "tipo_usuario"]);

  await knex(`${SCHEMA}.pessoa`)
    .insert([
      {
        id: ids.professorPessoa,
        nome: "Marina Rocha",
        data_nascimento: "1985-04-12",
        logradouro: "Rua dos Professores",
        numero: "10",
        bairro: "Centro",
        cidade_id: CIDADE_IBGE,
        estado: "MG",
        cep: "36500-000",
        cpf: "710.000.000-10",
      },
      ...alunos.map((aluno, index) => ({
        id: aluno.pessoaId,
        nome: aluno.nome,
        data_nascimento: aluno.nascimento,
        logradouro: "Rua dos Estudantes",
        numero: String(100 + index),
        bairro: "Centro",
        cidade_id: CIDADE_IBGE,
        estado: "MG",
        cep: "36500-000",
        cpf: aluno.cpf,
      })),
    ])
    .onConflict("cpf")
    .merge();

  await knex(`${SCHEMA}.professor`)
    .insert({
      id: ids.professor,
      usuario_id: ids.professorUsuario,
      pessoa_id: ids.professorPessoa,
      curso_id: ids.curso,
      faculdade_id: ids.faculdade,
    })
    .onConflict("id")
    .merge();

  await knex(`${SCHEMA}.disciplinas`)
    .insert(
      disciplinas.map((disciplina) => ({
        id: disciplina.id,
        codigo: disciplina.codigo,
        nome: disciplina.nome,
        pre_requisito: null,
        carga_horaria: disciplina.cargaHoraria,
        ativo: true,
      }))
    )
    .onConflict("codigo")
    .merge();

  await knex(`${SCHEMA}.periodo_letivo`)
    .insert({
      id: ids.periodoLetivo,
      codigo: "2026/1-REL",
      ano: 2026,
      semestre: 1,
      data_inicio: "2026-02-02",
      data_fim: "2026-06-30",
      ativo: true,
      status: "ativo",
    })
    .onConflict("codigo")
    .merge();

  await knex(`${SCHEMA}.curso_disciplina`)
    .insert(
      disciplinas.map((disciplina, index) => ({
        id: disciplina.cursoDisciplinaId,
        curso_id: ids.curso,
        disciplina_id: disciplina.id,
        periodo_ideal: 5 + index,
        obrigatoria: true,
        carga_horaria: disciplina.cargaHoraria,
        ativo: true,
      }))
    )
    .onConflict(["curso_id", "disciplina_id"])
    .merge();

  await knex(`${SCHEMA}.turma`)
    .insert({
      id: ids.turma,
      periodo_letivo_id: ids.periodoLetivo,
      curso_id: ids.curso,
      periodo_curricular: 5,
      descricao: "ADS 5 Periodo 2026/1",
      sigla: "ADS5A",
      capacidade_alunos: 40,
      turno: "Noturno",
      status: "ativa",
    })
    .onConflict(["periodo_letivo_id", "curso_id", "sigla"])
    .merge();

  await knex(`${SCHEMA}.turma_disciplina`)
    .insert(
      disciplinas.map((disciplina) => ({
        id: disciplina.turmaDisciplinaId,
        turma_id: ids.turma,
        curso_disciplina_id: disciplina.cursoDisciplinaId,
        professor_id: ids.professor,
        status: "ativa",
      }))
    )
    .onConflict(["turma_id", "curso_disciplina_id"])
    .merge();

  await knex(`${SCHEMA}.aluno`)
    .insert(
      alunos.map((aluno) => ({
        id: aluno.alunoId,
        usuario_id: aluno.usuarioId,
        pessoa_id: aluno.pessoaId,
        curso_id: ids.curso,
        periodo: "5",
      }))
    )
    .onConflict("id")
    .merge();

  await knex(`${SCHEMA}.matricula`)
    .insert(
      alunos.map((aluno) => ({
        id: aluno.matriculaId,
        aluno_id: aluno.alunoId,
        curso_id: ids.curso,
        turma_id: ids.turma,
        status: "ativa",
        data_matricula: "2026-02-03",
      }))
    )
    .onConflict(["aluno_id", "turma_id"])
    .merge();

  const vinculos = alunos.flatMap((aluno, alunoIndex) =>
    disciplinas.map((disciplina, disciplinaIndex) => ({
      id: demoId(500 + alunoIndex * 10 + disciplinaIndex),
      alunoId: aluno.alunoId,
      matriculaId: aluno.matriculaId,
      turmaDisciplinaId: disciplina.turmaDisciplinaId,
    }))
  );

  await knex(`${SCHEMA}.matricula_turma_disciplina`)
    .insert(
      vinculos.map((vinculo) => ({
        id: vinculo.id,
        turma_disciplina_id: vinculo.turmaDisciplinaId,
        matricula_id: vinculo.matriculaId,
        status: "ativa",
        data_vinculo: "2026-02-03",
      }))
    )
    .onConflict(["matricula_id", "turma_disciplina_id"])
    .merge();

  const avaliacoes = disciplinas.flatMap((disciplina, disciplinaIndex) =>
    [0, 1].map((notaIndex) => ({
      id: demoId(600 + disciplinaIndex * 10 + notaIndex),
      tipo_avaliacao: "PROVA",
      descricao_avaliacao: notaIndex === 0 ? "Avaliacao parcial" : "Avaliacao final",
      valor: 20,
      data_lancamento: notaIndex === 0 ? "2026-03-10T12:00:00.000Z" : "2026-05-10T12:00:00.000Z",
      data_devolucao: notaIndex === 0 ? "2026-04-15" : "2026-06-20",
      turma_disciplina_id: disciplina.turmaDisciplinaId,
    }))
  );

  await knex(`${SCHEMA}.avaliacao`)
    .insert(avaliacoes)
    .onConflict("id")
    .merge();

  const notasLancadas = vinculos.flatMap((vinculo, vinculoIndex) => {
    const avaliacoesDaTurma = avaliacoes.filter(
      (avaliacao) => avaliacao.turma_disciplina_id === vinculo.turmaDisciplinaId
    );
    const valores = notas[vinculo.alunoId][vinculo.turmaDisciplinaId] ?? [];

    return avaliacoesDaTurma.map((avaliacao, notaIndex) => ({
      id: demoId(660 + vinculoIndex * 10 + notaIndex),
      avaliacao_id: avaliacao.id,
      matricula_turma_disciplina_id: vinculo.id,
      valor: Number(((valores[notaIndex] ?? 0) * 2).toFixed(2)),
      criada_por_usuario_id: ids.professorUsuario,
      atualizada_por_usuario_id: ids.professorUsuario,
    }));
  });

  await knex(`${SCHEMA}.nota`)
    .insert(notasLancadas)
    .onConflict(["avaliacao_id", "matricula_turma_disciplina_id"])
    .merge(["valor", "atualizada_por_usuario_id"]);

  const aulas = disciplinas.flatMap((disciplina, disciplinaIndex) =>
    [1, 2, 3, 4, 5].map((numeroAula) => ({
      id: demoId(700 + disciplinaIndex * 10 + numeroAula),
      data: `2026-0${2 + numeroAula}-10T19:00:00.000Z`,
      local_id: ids.local,
      professor_id: ids.professor,
      turma_disciplina_id: disciplina.turmaDisciplinaId,
    }))
  );

  await knex(`${SCHEMA}.aula`)
    .insert(aulas)
    .onConflict("id")
    .merge();

  const frequencias = vinculos.flatMap((vinculo) => {
    const aulasDaDisciplina = aulas.filter((aula) => aula.turma_disciplina_id === vinculo.turmaDisciplinaId);
    const status = presencas[vinculo.alunoId][vinculo.turmaDisciplinaId] ?? [];

    return aulasDaDisciplina.map((aula, index) => ({
      id: demoId(800 + Number(vinculo.id.slice(-2)) * 10 + index),
      aula_id: aula.id,
      matricula_turma_disciplina_id: vinculo.id,
      status: status[index] ?? "PRESENTE",
      data: aula.data.slice(0, 10),
      lancada_em: aula.data,
      responsavel_lancamento_usuario_id: ids.professorUsuario,
    }));
  });

  await knex(`${SCHEMA}.frequencia`)
    .insert(frequencias)
    .onConflict(["aula_id", "matricula_turma_disciplina_id"])
    .merge(["status", "data", "lancada_em", "responsavel_lancamento_usuario_id"]);

  console.log("Dados academicos de relatorios criados com sucesso.");
  console.log("Professor: professor.relatorios@unieduca.local / Relatorios@123");
  console.log("Aluno: ana.relatorios@unieduca.local / Relatorios@123");
}
