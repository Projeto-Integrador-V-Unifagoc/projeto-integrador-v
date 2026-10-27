import type { Knex } from "knex";

const SCHEMA = "piv";

const competencias = [
  {
    id: "14000000-0000-4000-8000-000000000001",
    codigo: "COMP-ANALISE",
    nome: "Pensamento analítico",
    descricao: "Analisar informações, identificar relações e fundamentar conclusões com evidências.",
    tipo: "GERAL",
  },
  {
    id: "14000000-0000-4000-8000-000000000002",
    codigo: "COMP-PROBLEMAS",
    nome: "Resolução de problemas",
    descricao: "Estruturar problemas e propor soluções viáveis para diferentes contextos profissionais.",
    tipo: "GERAL",
  },
  {
    id: "14000000-0000-4000-8000-000000000003",
    codigo: "COMP-TECNICA",
    nome: "Aplicação de fundamentos técnicos",
    descricao: "Aplicar conceitos, métodos e ferramentas próprios da área de formação.",
    tipo: "TECNICA",
  },
  {
    id: "14000000-0000-4000-8000-000000000004",
    codigo: "COMP-COMUNICACAO",
    nome: "Comunicação profissional",
    descricao: "Comunicar decisões e resultados com clareza, precisão e adequação ao público.",
    tipo: "SOCIOEMOCIONAL",
  },
  {
    id: "14000000-0000-4000-8000-000000000005",
    codigo: "COMP-ETICA",
    nome: "Ética e responsabilidade",
    descricao: "Atuar com responsabilidade, integridade e atenção aos impactos das decisões profissionais.",
    tipo: "SOCIOEMOCIONAL",
  },
] as const;

const disciplinas = [
  {
    codigo: "ADS-ALG-AUD",
    area_conhecimento: "COMPUTACAO",
    ementa: "Fundamentos de algoritmos, representação de soluções, estruturas de decisão e repetição, modularização e resolução computacional de problemas.",
    carga_horaria_teorica: 32,
    carga_horaria_pratica: 24,
    carga_horaria_laboratorio: 24,
    carga_horaria_extensao: 0,
    pre_requisito: "Não possui.",
    observacoes: "Dados completos para demonstração do dashboard do professor.",
    competencias: ["COMP-ANALISE", "COMP-PROBLEMAS", "COMP-TECNICA"],
  },
  {
    codigo: "ADM-CONT-AUD",
    area_conhecimento: "ADMINISTRACAO_GESTAO",
    ementa: "Informações contábeis aplicadas à gestão, análise de custos, indicadores econômico-financeiros e apoio à tomada de decisão.",
    carga_horaria_teorica: 36,
    carga_horaria_pratica: 24,
    carga_horaria_laboratorio: 0,
    carga_horaria_extensao: 0,
    pre_requisito: "Fundamentos de Administração ou conhecimento equivalente.",
    observacoes: "Dados completos para demonstração do dashboard do professor.",
    competencias: ["COMP-ANALISE", "COMP-COMUNICACAO", "COMP-ETICA"],
  },
  {
    codigo: "CON-DIR-AUD",
    area_conhecimento: "CIENCIAS_HUMANAS",
    ementa: "Noções de direito empresarial, organização societária, contratos, obrigações e responsabilidade aplicadas à atuação contábil.",
    carga_horaria_teorica: 44,
    carga_horaria_pratica: 16,
    carga_horaria_laboratorio: 0,
    carga_horaria_extensao: 0,
    pre_requisito: "Não possui.",
    observacoes: "Dados completos para demonstração do dashboard do professor.",
    competencias: ["COMP-ANALISE", "COMP-COMUNICACAO", "COMP-ETICA"],
  },
] as const;

export async function seed(db: Knex): Promise<void> {
  await db.transaction(async (trx) => {
    await trx(`${SCHEMA}.competencia`)
      .insert(competencias.map((item) => ({ ...item, ativo: true })))
      .onConflict("codigo")
      .merge(["nome", "descricao", "tipo", "ativo"]);

    for (const disciplina of disciplinas) {
      const { codigo, competencias: _competencias, ...dadosAcademicos } = disciplina;
      await trx(`${SCHEMA}.disciplinas`).where({ codigo }).update(dadosAcademicos);
    }

    const disciplinasPersistidas = await trx(`${SCHEMA}.disciplinas`)
      .whereIn("codigo", disciplinas.map((item) => item.codigo))
      .select("id", "codigo");
    const competenciasPersistidas = await trx(`${SCHEMA}.competencia`)
      .whereIn("codigo", competencias.map((item) => item.codigo))
      .select("id", "codigo");

    const disciplinaPorCodigo = new Map(disciplinasPersistidas.map((item) => [item.codigo, item.id]));
    const competenciaPorCodigo = new Map(competenciasPersistidas.map((item) => [item.codigo, item.id]));
    const vinculos = disciplinas.flatMap((disciplina) =>
      disciplina.competencias.map((competenciaCodigo, ordem) => ({
        disciplina_id: disciplinaPorCodigo.get(disciplina.codigo),
        competencia_id: competenciaPorCodigo.get(competenciaCodigo),
        nivel_esperado: ordem === 0 ? "CONSOLIDAR" : "DESENVOLVER",
        obrigatoria: true,
        ordem,
      })),
    );

    if (vinculos.some((item) => !item.disciplina_id || !item.competencia_id)) {
      throw new Error("Não foi possível localizar as disciplinas ou competências da demonstração do professor.");
    }

    await trx(`${SCHEMA}.disciplina_competencia`)
      .insert(vinculos)
      .onConflict(["disciplina_id", "competencia_id"])
      .merge(["nivel_esperado", "obrigatoria", "ordem"]);

    const ofertas = await trx(`${SCHEMA}.turma_disciplina as td`)
      .join(`${SCHEMA}.curso_disciplina as cd`, "td.curso_disciplina_id", "cd.id")
      .join(`${SCHEMA}.disciplinas as d`, "cd.disciplina_id", "d.id")
      .join(`${SCHEMA}.professor as prof`, "td.professor_id", "prof.id")
      .join(`${SCHEMA}.usuario as u`, "prof.usuario_id", "u.id")
      .where("u.email", "prof.helena.duarte@auditoria.unieduca.local")
      .whereIn("d.codigo", ["ADS-ALG-AUD", "ADM-CONT-AUD"])
      .select("td.id", "d.codigo");
    const ofertaPorDisciplina = new Map(ofertas.map((item) => [item.codigo, item.id]));

    const avaliacoesDemonstracao = [
      {
        id: "14000000-0000-4000-8000-000000000201",
        turma_disciplina_id: ofertaPorDisciplina.get("ADS-ALG-AUD"),
        tipo_avaliacao: "TRABALHO",
        descricao_avaliacao: "Atividade prática aguardando lançamento",
        valor: 10,
        data_lancamento: "2026-10-01T12:00:00.000Z",
        data_devolucao: "2026-10-20",
      },
      {
        id: "14000000-0000-4000-8000-000000000202",
        turma_disciplina_id: ofertaPorDisciplina.get("ADM-CONT-AUD"),
        tipo_avaliacao: "TRABALHO",
        descricao_avaliacao: "Estudo de caso — análise gerencial",
        valor: 10,
        data_lancamento: "2026-10-26T12:00:00.000Z",
        data_devolucao: "2026-11-10",
      },
    ];

    if (avaliacoesDemonstracao.some((item) => !item.turma_disciplina_id)) {
      throw new Error("Não foi possível localizar as ofertas da professora de demonstração.");
    }

    await trx(`${SCHEMA}.avaliacao`)
      .insert(avaliacoesDemonstracao)
      .onConflict("id")
      .merge(["turma_disciplina_id", "tipo_avaliacao", "descricao_avaliacao", "valor", "data_lancamento", "data_devolucao"]);

    await trx(`${SCHEMA}.periodo_letivo`)
      .where({ codigo: "2026/2-AUD" })
      .update({ data_inicio: "2026-08-03", data_fim: "2026-12-18", ativo: true, status: "ativo" });
  });

  console.log("Dados acadêmicos e competências do dashboard do professor atualizados.");
}
