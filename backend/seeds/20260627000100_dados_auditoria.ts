import type { Knex } from "knex";
import bcrypt from "bcrypt";

const SCHEMA = "piv";
const CIDADE_IBGE = "3171303";
const SENHA_PADRAO = process.env.AUDIT_SEED_PASSWORD || "Unieduca@2026";

const auditId = (numero: number) => `13000000-0000-4000-8000-${String(numero).padStart(12, "0")}`;

const ids = {
  faculdade: auditId(1),
  departamento: auditId(2),
  periodoLetivo: auditId(3),
  local: auditId(4),
  secretariaSaulo: auditId(101),
  secretariaRicardo: auditId(102),
};

type CursoAuditoria = {
  codigo: string;
  nome: string;
  turma: string;
  periodo: number;
  disciplinas: Array<{ codigo: string; nome: string; cargaHoraria: number }>;
};

type ProfessorAuditoria = {
  nome: string;
  email: string;
  nascimento: string;
};

type AlunoAuditoria = {
  globalIndex: number;
  turmaIndex: number;
  alunoTurmaIndex: number;
  nome: string;
  email: string;
  nascimento: string;
  cenario: CenarioAluno;
  usuarioId: string;
  pessoaId: string;
  alunoId: string;
  matriculaId: string;
};

type CenarioAluno =
  | "aprovado"
  | "recuperacao"
  | "reprovado_nota"
  | "reprovado_frequencia"
  | "em_andamento"
  | "pendencia";

const cursos: CursoAuditoria[] = [
  {
    codigo: "ADS-AUD",
    nome: "Analise e Desenvolvimento de Sistemas",
    turma: "ADS1A-AUD",
    periodo: 1,
    disciplinas: [
      { codigo: "ADS-ALG-AUD", nome: "Algoritmos e Logica de Programacao", cargaHoraria: 80 },
      { codigo: "ADS-BD-AUD", nome: "Banco de Dados", cargaHoraria: 80 },
      { codigo: "ADS-ES-AUD", nome: "Engenharia de Software", cargaHoraria: 60 },
      { codigo: "ADS-WEB-AUD", nome: "Programacao Web", cargaHoraria: 80 },
      { codigo: "ADS-PI-AUD", nome: "Projeto Integrador", cargaHoraria: 40 },
    ],
  },
  {
    codigo: "ADM-AUD",
    nome: "Administracao",
    turma: "ADM1A-AUD",
    periodo: 1,
    disciplinas: [
      { codigo: "ADM-TGA-AUD", nome: "Teoria Geral da Administracao", cargaHoraria: 60 },
      { codigo: "ADM-MKT-AUD", nome: "Marketing", cargaHoraria: 60 },
      { codigo: "ADM-FIN-AUD", nome: "Matematica Financeira", cargaHoraria: 80 },
      { codigo: "ADM-CONT-AUD", nome: "Contabilidade Gerencial", cargaHoraria: 60 },
      { codigo: "ADM-PI-AUD", nome: "Projeto Integrador em Gestao", cargaHoraria: 40 },
    ],
  },
  {
    codigo: "CON-AUD",
    nome: "Ciencias Contabeis",
    turma: "CON1A-AUD",
    periodo: 1,
    disciplinas: [
      { codigo: "CON-CONT-AUD", nome: "Contabilidade Introdutoria", cargaHoraria: 80 },
      { codigo: "CON-DIR-AUD", nome: "Direito Empresarial", cargaHoraria: 60 },
      { codigo: "CON-CUST-AUD", nome: "Contabilidade de Custos", cargaHoraria: 80 },
      { codigo: "CON-AUDT-AUD", nome: "Auditoria Contabil", cargaHoraria: 60 },
      { codigo: "CON-PI-AUD", nome: "Projeto Integrador Contabil", cargaHoraria: 40 },
    ],
  },
];

const professores: ProfessorAuditoria[] = [
  { nome: "Helena Duarte", email: "prof.helena.duarte@auditoria.unieduca.local", nascimento: "1982-05-14" },
  { nome: "Marcos Nogueira", email: "prof.marcos.nogueira@auditoria.unieduca.local", nascimento: "1979-09-02" },
  { nome: "Patricia Almeida", email: "prof.patricia.almeida@auditoria.unieduca.local", nascimento: "1986-01-28" },
  { nome: "Leandro Farias", email: "prof.leandro.farias@auditoria.unieduca.local", nascimento: "1981-11-19" },
  { nome: "Camila Torres", email: "prof.camila.torres@auditoria.unieduca.local", nascimento: "1988-07-07" },
];

const primeirosNomes = [
  "Ana",
  "Bruno",
  "Carla",
  "Diego",
  "Elisa",
  "Fabio",
  "Gabriela",
  "Henrique",
  "Isabela",
  "Joao",
  "Larissa",
  "Mateus",
  "Natalia",
  "Otavio",
  "Paula",
  "Rafael",
  "Sofia",
  "Tiago",
  "Vanessa",
  "William",
  "Yasmin",
  "Arthur",
  "Bianca",
  "Caio",
  "Daniela",
];

const sobrenomes = [
  "Mendes",
  "Oliveira",
  "Santos",
  "Pereira",
  "Ribeiro",
  "Costa",
  "Ferreira",
  "Gomes",
  "Barbosa",
  "Lima",
  "Moreira",
  "Cardoso",
  "Teixeira",
  "Rocha",
  "Azevedo",
];

const cenarioPorIndice = (indice: number): CenarioAluno => {
  if (indice < 11) return "aprovado";
  if (indice < 15) return "recuperacao";
  if (indice < 18) return "reprovado_nota";
  if (indice < 21) return "reprovado_frequencia";
  if (indice < 23) return "em_andamento";
  return "pendencia";
};

const gerarCpf = (semente: number): string => {
  const base = String(900000000 + semente).padStart(9, "0").slice(0, 9).split("").map(Number);
  const digito = (numeros: number[]) => {
    const fator = numeros.length + 1;
    const soma = numeros.reduce((acc, numero, index) => acc + numero * (fator - index), 0);
    const resto = (soma * 10) % 11;
    return resto === 10 ? 0 : resto;
  };
  const d1 = digito(base);
  const d2 = digito([...base, d1]);
  return [...base, d1, d2].join("").replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
};

const criarAlunos = (): AlunoAuditoria[] =>
  cursos.flatMap((curso, turmaIndex) =>
    Array.from({ length: 25 }, (_, alunoTurmaIndex) => {
      const globalIndex = turmaIndex * 25 + alunoTurmaIndex;
      const nome = `${primeirosNomes[alunoTurmaIndex]} ${sobrenomes[(globalIndex + turmaIndex) % sobrenomes.length]} Auditoria`;
      const sufixo = `${curso.codigo.replace("-AUD", "").toLowerCase()}${String(alunoTurmaIndex + 1).padStart(2, "0")}`;

      return {
        globalIndex,
        turmaIndex,
        alunoTurmaIndex,
        nome,
        email: `aluno.${sufixo}@auditoria.unieduca.local`,
        nascimento: `${2002 + (alunoTurmaIndex % 4)}-${String((alunoTurmaIndex % 12) + 1).padStart(2, "0")}-${String((alunoTurmaIndex % 27) + 1).padStart(2, "0")}`,
        cenario: cenarioPorIndice(alunoTurmaIndex),
        usuarioId: auditId(1000 + globalIndex),
        pessoaId: auditId(1100 + globalIndex),
        alunoId: auditId(1200 + globalIndex),
        matriculaId: auditId(1300 + globalIndex),
      };
    })
  );

const notaRegular = (cenario: CenarioAluno, alunoIndex: number, avaliacaoIndex: number): number | null => {
  const aprovado = [
    [18, 17, 18, 5, 30],
    [14, 15, 16, 4, 25],
    [20, 19, 18, 5, 34],
  ];
  const recuperacao = [
    [12, 11, 10, 4, 18],
    [10, 12, 11, 3, 17],
    [13, 12, 10, 4, 16],
  ];
  const reprovadoNota = [
    [8, 9, 10, 3, 16],
    [0, 12, 10, 4, 18],
    [11, 10, 9, 3, 15],
  ];
  const reprovadoFrequencia = [
    [16, 16, 17, 5, 28],
    [14, 15, 15, 4, 27],
  ];
  const emAndamento = [16, 15, null, 4, null];
  const pendencia = [15, null, 13, null, 24];

  if (cenario === "aprovado") return aprovado[alunoIndex % aprovado.length][avaliacaoIndex];
  if (cenario === "recuperacao") return recuperacao[alunoIndex % recuperacao.length][avaliacaoIndex];
  if (cenario === "reprovado_nota") return reprovadoNota[alunoIndex % reprovadoNota.length][avaliacaoIndex];
  if (cenario === "reprovado_frequencia") return reprovadoFrequencia[alunoIndex % reprovadoFrequencia.length][avaliacaoIndex];
  if (cenario === "em_andamento") return emAndamento[avaliacaoIndex];
  return pendencia[avaliacaoIndex];
};

const notaRecuperacao = (aluno: AlunoAuditoria): number | null => {
  if (aluno.cenario !== "recuperacao") return null;
  if (aluno.alunoTurmaIndex % 4 === 1) return null;
  return aluno.alunoTurmaIndex % 4 === 0 ? 72 : 48;
};

const deveLancarFrequencia = (cenario: CenarioAluno, aulaIndex: number): boolean => {
  if (cenario === "em_andamento") return aulaIndex < 8;
  if (cenario === "pendencia") return ![7, 9].includes(aulaIndex);
  return true;
};

const datasAulas = [
  "2026-08-10",
  "2026-08-17",
  "2026-08-24",
  "2026-08-31",
  "2026-09-07",
  "2026-09-14",
  "2026-09-21",
  "2026-09-28",
  "2026-10-05",
  "2026-10-12",
];

const statusFrequencia = (cenario: CenarioAluno, alunoIndex: number, aulaIndex: number): "PRESENTE" | "AUSENTE" => {
  if (cenario === "aprovado") return aulaIndex === 9 && alunoIndex % 3 === 0 ? "AUSENTE" : "PRESENTE";
  if (cenario === "recuperacao") return [4, 8].includes(aulaIndex) ? "AUSENTE" : "PRESENTE";
  if (cenario === "reprovado_frequencia") return aulaIndex % 2 === 0 ? "AUSENTE" : "PRESENTE";
  if (cenario === "pendencia") return [2, 5].includes(aulaIndex) ? "AUSENTE" : "PRESENTE";
  return aulaIndex === 6 ? "AUSENTE" : "PRESENTE";
};

const inserir = async (
  knex: Knex,
  tabela: string,
  linhas: any[],
  conflito: string | string[],
  merge?: string[]
) => {
  if (linhas.length === 0) return;

  for (let i = 0; i < linhas.length; i += 500) {
    const lote = linhas.slice(i, i + 500);
    const query = knex(`${SCHEMA}.${tabela}`)
      .insert(lote)
      .onConflict(Array.isArray(conflito) ? conflito : [conflito]);
    if (merge) {
      await query.merge(merge);
    } else {
      await query.merge();
    }
  }
};

export async function seed(knex: Knex): Promise<void> {
  const senhaHash = await bcrypt.hash(SENHA_PADRAO, 10);
  const alunos = criarAlunos();

  await knex.transaction(async (trx) => {
    await inserir(trx, "cidade", [{ nome: "Uba", uf: "MG", ibge: CIDADE_IBGE }], "ibge", ["nome", "uf"]);

    await inserir(
      trx,
      "faculdade",
      [
        {
          id: ids.faculdade,
          nome: "Faculdade UniEduca Auditoria",
          cidade_id: CIDADE_IBGE,
          logradouro: "Avenida Academica",
          numero: "2026",
          bairro: "Centro",
          cep: "36500-000",
        },
      ],
      "id"
    );

    await inserir(
      trx,
      "departamento",
      [{ id: ids.departamento, codigo: "DEP-AUD", nome: "Departamento Academico de Auditoria", faculdade_id: ids.faculdade }],
      "codigo"
    );

    await inserir(
      trx,
      "curso",
      cursos.map((curso, index) => ({
        id: auditId(200 + index),
        codigo: curso.codigo,
        nome: curso.nome,
        departamento_id: ids.departamento,
      })),
      "codigo"
    );

    await inserir(trx, "local", [{ id: ids.local, codigo: "SALA-AUD-01" }], "codigo");

    const usuariosSecretaria = [
      {
        id: ids.secretariaSaulo,
        nome: "Saulo Campos",
        email: "saulocampos@unieduca.com.br",
        senha: senhaHash,
        tipo_usuario: "secretaria",
      },
      {
        id: ids.secretariaRicardo,
        nome: "Ricardo Varella",
        email: "ricardovarella@unieduca.com.br",
        senha: senhaHash,
        tipo_usuario: "secretaria",
      },
    ];

    const usuariosProfessores = professores.map((professor, index) => ({
      id: auditId(300 + index),
      nome: professor.nome,
      email: professor.email,
      senha: senhaHash,
      tipo_usuario: "professor",
    }));

    const usuariosAlunos = alunos.map((aluno) => ({
      id: aluno.usuarioId,
      nome: aluno.nome,
      email: aluno.email,
      senha: senhaHash,
      tipo_usuario: "aluno",
    }));

    await inserir(
      trx,
      "usuario",
      [...usuariosSecretaria, ...usuariosProfessores, ...usuariosAlunos],
      "email",
      ["nome", "senha", "tipo_usuario"]
    );

    const pessoasProfessores = professores.map((professor, index) => ({
      id: auditId(400 + index),
      nome: professor.nome,
      data_nascimento: professor.nascimento,
      logradouro: "Rua dos Docentes",
      numero: String(100 + index),
      bairro: "Centro",
      cidade_id: CIDADE_IBGE,
      estado: "MG",
      cep: "36500-000",
      cpf: gerarCpf(10 + index),
    }));

    const pessoasAlunos = alunos.map((aluno) => ({
      id: aluno.pessoaId,
      nome: aluno.nome,
      data_nascimento: aluno.nascimento,
      logradouro: "Rua dos Estudantes",
      numero: String(1000 + aluno.globalIndex),
      bairro: "Universitario",
      cidade_id: CIDADE_IBGE,
      estado: "MG",
      cep: "36500-000",
      cpf: gerarCpf(100 + aluno.globalIndex),
    }));

    await inserir(trx, "pessoa", [...pessoasProfessores, ...pessoasAlunos], "cpf");

    await inserir(
      trx,
      "professor",
      professores.map((_, index) => ({
        id: auditId(500 + index),
        usuario_id: auditId(300 + index),
        pessoa_id: auditId(400 + index),
        curso_id: auditId(200 + (index % cursos.length)),
        faculdade_id: ids.faculdade,
        ativo: true,
      })),
      "id"
    );

    const disciplinas = cursos.flatMap((curso, cursoIndex) =>
      curso.disciplinas.map((disciplina, disciplinaIndex) => ({
        id: auditId(600 + cursoIndex * 10 + disciplinaIndex),
        codigo: disciplina.codigo,
        nome: disciplina.nome,
        pre_requisito: null,
        carga_horaria: disciplina.cargaHoraria,
        ativo: true,
      }))
    );

    await inserir(trx, "disciplinas", disciplinas, "codigo");

    await inserir(
      trx,
      "periodo_letivo",
      [
        {
          id: ids.periodoLetivo,
          codigo: "2026/2-AUD",
          ano: 2026,
          semestre: 2,
          data_inicio: "2026-08-03",
          data_fim: "2026-12-18",
          ativo: true,
          status: "ativo",
        },
      ],
      "codigo"
    );

    const cursoDisciplinas = cursos.flatMap((curso, cursoIndex) =>
      curso.disciplinas.map((disciplina, disciplinaIndex) => ({
        id: auditId(700 + cursoIndex * 10 + disciplinaIndex),
        curso_id: auditId(200 + cursoIndex),
        disciplina_id: auditId(600 + cursoIndex * 10 + disciplinaIndex),
        periodo_ideal: curso.periodo,
        obrigatoria: true,
        carga_horaria: disciplina.cargaHoraria,
        ativo: true,
      }))
    );

    await inserir(trx, "curso_disciplina", cursoDisciplinas, ["curso_id", "disciplina_id"]);

    await inserir(
      trx,
      "turma",
      cursos.map((curso, index) => ({
        id: auditId(800 + index),
        periodo_letivo_id: ids.periodoLetivo,
        curso_id: auditId(200 + index),
        periodo_curricular: curso.periodo,
        descricao: `${curso.nome} - 1 periodo - Auditoria`,
        sigla: curso.turma,
        capacidade_alunos: 40,
        turno: "Noturno",
        status: "ativa",
      })),
      ["periodo_letivo_id", "curso_id", "sigla"]
    );

    const turmaDisciplinas = cursos.flatMap((curso, cursoIndex) =>
      curso.disciplinas.map((_, disciplinaIndex) => ({
        id: auditId(900 + cursoIndex * 10 + disciplinaIndex),
        turma_id: auditId(800 + cursoIndex),
        curso_disciplina_id: auditId(700 + cursoIndex * 10 + disciplinaIndex),
        professor_id: auditId(500 + ((cursoIndex * 2 + disciplinaIndex) % professores.length)),
        status: "ativa",
      }))
    );

    await inserir(trx, "turma_disciplina", turmaDisciplinas, ["turma_id", "curso_disciplina_id"]);

    await inserir(
      trx,
      "aluno",
      alunos.map((aluno) => ({
        id: aluno.alunoId,
        usuario_id: aluno.usuarioId,
        pessoa_id: aluno.pessoaId,
        curso_id: auditId(200 + aluno.turmaIndex),
        periodo: "1",
      })),
      "id"
    );

    await inserir(
      trx,
      "matricula",
      alunos.map((aluno) => ({
        id: aluno.matriculaId,
        aluno_id: aluno.alunoId,
        curso_id: auditId(200 + aluno.turmaIndex),
        turma_id: auditId(800 + aluno.turmaIndex),
        status: "ativa",
        data_matricula: "2026-08-03",
      })),
      ["aluno_id", "turma_id"]
    );

    const vinculos = alunos.flatMap((aluno) =>
      cursos[aluno.turmaIndex].disciplinas.map((_, disciplinaIndex) => ({
        id: auditId(1400 + aluno.globalIndex * 10 + disciplinaIndex),
        alunoId: aluno.alunoId,
        aluno,
        turmaDisciplinaId: auditId(900 + aluno.turmaIndex * 10 + disciplinaIndex),
        disciplinaIndex,
        matriculaId: aluno.matriculaId,
      }))
    );

    await inserir(
      trx,
      "matricula_turma_disciplina",
      vinculos.map((vinculo) => ({
        id: vinculo.id,
        turma_disciplina_id: vinculo.turmaDisciplinaId,
        matricula_id: vinculo.matriculaId,
        status: "ativa",
        data_vinculo: "2026-08-03",
      })),
      ["matricula_id", "turma_disciplina_id"]
    );

    const avaliacoesRegulares = turmaDisciplinas.flatMap((turmaDisciplina, tdIndex) =>
      [
        { tipo: "PROVA", descricao: "Prova 1", valor: 20, data: "2026-09-01T12:00:00.000Z", devolucao: "2026-09-08" },
        { tipo: "PROVA", descricao: "Prova 2", valor: 20, data: "2026-10-01T12:00:00.000Z", devolucao: "2026-10-08" },
        { tipo: "PROVA", descricao: "Prova 3", valor: 20, data: "2026-11-03T12:00:00.000Z", devolucao: "2026-11-10" },
        { tipo: "TPI", descricao: "Trabalho Pratico Integrador", valor: 5, data: "2026-09-15T12:00:00.000Z", devolucao: "2026-09-22" },
        { tipo: "TRABALHO", descricao: "Trabalho Semestral", valor: 35, data: "2026-11-17T12:00:00.000Z", devolucao: "2026-11-25" },
      ].map((avaliacao, avaliacaoIndex) => ({
        id: auditId(5000 + tdIndex * 10 + avaliacaoIndex),
        tipo_avaliacao: avaliacao.tipo,
        descricao_avaliacao: `${avaliacao.descricao} - Auditoria`,
        valor: avaliacao.valor,
        data_lancamento: avaliacao.data,
        data_devolucao: avaliacao.devolucao,
        turma_disciplina_id: turmaDisciplina.id,
      }))
    );

    const avaliacoesRecuperacao = turmaDisciplinas.map((turmaDisciplina, tdIndex) => ({
      id: auditId(5000 + tdIndex * 10 + 5),
      tipo_avaliacao: "RECUPERACAO",
      descricao_avaliacao: "Recuperacao semestral - Auditoria",
      valor: 100,
      data_lancamento: "2026-12-01T12:00:00.000Z",
      data_devolucao: "2026-12-10",
      turma_disciplina_id: turmaDisciplina.id,
    }));

    await inserir(trx, "avaliacao", [...avaliacoesRegulares, ...avaliacoesRecuperacao], "id");

    const notas = vinculos.flatMap((vinculo, vinculoIndex) => {
      const tdIndex = turmaDisciplinas.findIndex((td) => td.id === vinculo.turmaDisciplinaId);
      const notasRegulares = avaliacoesRegulares
        .filter((avaliacao) => avaliacao.turma_disciplina_id === vinculo.turmaDisciplinaId)
        .map((avaliacao, avaliacaoIndex) => {
          const valor = notaRegular(vinculo.aluno.cenario, vinculo.aluno.alunoTurmaIndex, avaliacaoIndex);
          if (valor === null) return null;

          return {
            id: auditId(10000 + vinculoIndex * 10 + avaliacaoIndex),
            avaliacao_id: avaliacao.id,
            matricula_turma_disciplina_id: vinculo.id,
            valor,
            criada_por_usuario_id: auditId(300 + ((vinculo.aluno.turmaIndex * 2 + vinculo.disciplinaIndex) % professores.length)),
            atualizada_por_usuario_id: avaliacaoIndex === 1 && vinculo.aluno.globalIndex % 13 === 0 ? ids.secretariaSaulo : auditId(300 + ((vinculo.aluno.turmaIndex * 2 + vinculo.disciplinaIndex) % professores.length)),
          };
        })
        .filter(Boolean);

      const recuperacao = notaRecuperacao(vinculo.aluno);
      if (recuperacao !== null) {
        notasRegulares.push({
          id: auditId(10000 + vinculoIndex * 10 + 5),
          avaliacao_id: auditId(5000 + tdIndex * 10 + 5),
          matricula_turma_disciplina_id: vinculo.id,
          valor: recuperacao,
          criada_por_usuario_id: auditId(300 + ((vinculo.aluno.turmaIndex * 2 + vinculo.disciplinaIndex) % professores.length)),
          atualizada_por_usuario_id: ids.secretariaRicardo,
        });
      }

      return notasRegulares;
    });

    await inserir(
      trx,
      "nota",
      notas,
      ["avaliacao_id", "matricula_turma_disciplina_id"],
      ["valor", "atualizada_por_usuario_id", "updated_at"]
    );

    const aulas = turmaDisciplinas.flatMap((turmaDisciplina, tdIndex) =>
      Array.from({ length: 10 }, (_, aulaIndex) => ({
        id: auditId(20000 + tdIndex * 20 + aulaIndex),
        data: `${datasAulas[aulaIndex]}T22:00:00.000Z`,
        local_id: ids.local,
        professor_id: turmaDisciplina.professor_id,
        turma_disciplina_id: turmaDisciplina.id,
      }))
    );

    await inserir(trx, "aula", aulas, "id");

    const frequencias = vinculos.flatMap((vinculo, vinculoIndex) => {
      const aulasDaDisciplina = aulas.filter((aula) => aula.turma_disciplina_id === vinculo.turmaDisciplinaId);

      return aulasDaDisciplina
        .map((aula, aulaIndex) => {
          if (!deveLancarFrequencia(vinculo.aluno.cenario, aulaIndex)) return null;

          const status = statusFrequencia(vinculo.aluno.cenario, vinculo.aluno.alunoTurmaIndex, aulaIndex);
          const justificar = status === "AUSENTE" && (vinculo.aluno.cenario === "recuperacao" || (vinculo.aluno.globalIndex + aulaIndex) % 17 === 0);

          return {
            id: auditId(30000 + vinculoIndex * 20 + aulaIndex),
            aula_id: aula.id,
            matricula_turma_disciplina_id: vinculo.id,
            status,
            data: aula.data.slice(0, 10),
            lancada_em: aula.data,
            responsavel_lancamento_usuario_id: auditId(300 + ((vinculo.aluno.turmaIndex * 2 + vinculo.disciplinaIndex) % professores.length)),
            alterada_por_usuario_id: justificar ? ids.secretariaSaulo : null,
            justificativa_motivo: justificar ? "Atestado apresentado" : null,
            justificativa_observacao: justificar ? "Ausencia justificada para cenario de auditoria." : null,
            justificada_por_usuario_id: justificar ? ids.secretariaSaulo : null,
            justificada_por_perfil: justificar ? "secretaria" : null,
            justificada_em: justificar ? "2026-10-20T12:00:00.000Z" : null,
          };
        })
        .filter(Boolean);
    });

    await inserir(
      trx,
      "frequencia",
      frequencias,
      ["aula_id", "matricula_turma_disciplina_id"],
      [
        "status",
        "data",
        "lancada_em",
        "responsavel_lancamento_usuario_id",
        "alterada_por_usuario_id",
        "justificativa_motivo",
        "justificativa_observacao",
        "justificada_por_usuario_id",
        "justificada_por_perfil",
        "justificada_em",
      ]
    );

    const auditoriasNota = notas.flatMap((nota: any, index) => {
      const lancamento = {
        id: auditId(40000 + index * 2),
        nota_id: nota.id,
        usuario_id: nota.criada_por_usuario_id,
        perfil: "professor",
        acao: "LANCAMENTO",
        valor_anterior: null,
        valor_novo: nota.valor,
        motivo: "Lancamento inicial criado pelo seed de auditoria.",
        criado_em: "2026-11-20T12:00:00.000Z",
      };

      if (index % 37 !== 0) return [lancamento];

      return [
        lancamento,
        {
          id: auditId(40000 + index * 2 + 1),
          nota_id: nota.id,
          usuario_id: nota.atualizada_por_usuario_id || ids.secretariaSaulo,
          perfil: nota.atualizada_por_usuario_id === ids.secretariaSaulo ? "secretaria" : "professor",
          acao: "RETIFICACAO",
          valor_anterior: Math.max(0, Number(nota.valor) - 1),
          valor_novo: nota.valor,
          motivo: "Retificacao amostral para validar trilha de auditoria.",
          criado_em: "2026-11-22T12:00:00.000Z",
        },
      ];
    });

    await inserir(trx, "nota_auditoria", auditoriasNota, "id");

    const auditoriasFrequencia = frequencias
      .filter((frequencia: any, index) => frequencia.alterada_por_usuario_id || index % 53 === 0)
      .map((frequencia: any, index) => ({
        id: auditId(45000 + index),
        frequencia_id: frequencia.id,
        usuario_id: frequencia.alterada_por_usuario_id || frequencia.responsavel_lancamento_usuario_id,
        perfil: frequencia.alterada_por_usuario_id ? "secretaria" : "professor",
        acao: frequencia.alterada_por_usuario_id ? "JUSTIFICATIVA" : "LANCAMENTO",
        dados_anteriores: frequencia.alterada_por_usuario_id ? { status: "AUSENTE", justificada: false } : null,
        dados_novos: {
          status: frequencia.status,
          justificada: Boolean(frequencia.justificada_por_usuario_id),
        },
        criado_em: "2026-10-21T12:00:00.000Z",
      }));

    await inserir(trx, "frequencia_auditoria", auditoriasFrequencia, "id");

    const documentos = alunos.slice(0, 15).flatMap((aluno, index) => {
      const status = index % 3;
      return [
        {
          id: auditId(48000 + index),
          matricula_id: aluno.matriculaId,
          tipo_documento: status === 0 ? "RG" : status === 1 ? "HISTORICO_ESCOLAR" : "COMPROVANTE_RESIDENCIA",
          nome_arquivo: status === 0 ? "documento-valido-auditoria.pdf" : status === 1 ? "documento-pendente-auditoria.pdf" : "documento-invalido-auditoria.pdf",
          caminho_arquivo: `/uploads/auditoria/${aluno.matriculaId}.pdf`,
          documento: null,
          valido: status === 0,
        },
      ];
    });

    await inserir(trx, "matricula_documento", documentos, "id");
  });

  console.log("Dados academicos de auditoria criados com sucesso.");
  console.log(`Senha padrao de auditoria: ${SENHA_PADRAO}`);
  console.log("Secretaria: saulocampos@unieduca.com.br");
  console.log("Secretaria: ricardovarella@unieduca.com.br");
  console.log("Professor: prof.helena.duarte@auditoria.unieduca.local");
  console.log("Aluno: aluno.ads01@auditoria.unieduca.local");
}
