import type { Knex } from "knex";
import { v5 as uuidv5 } from "uuid";

const SCHEMA = "piv";
const NAMESPACE_DEMO = "60c49c6e-9ca2-4fe6-a6a6-f51f18a7ed33";

const idDemo = (chave: string) => uuidv5(chave, NAMESPACE_DEMO);

function dataIso(valor: unknown): string {
  return valor instanceof Date ? valor.toISOString().slice(0, 10) : String(valor).slice(0, 10);
}

function somarDias(dataIso: string, dias: number): string {
  const data = new Date(`${dataIso.slice(0, 10)}T12:00:00.000Z`);
  data.setUTCDate(data.getUTCDate() + dias);
  return data.toISOString().slice(0, 10);
}

const CURSOS = [
  {
    codigo: "ADS",
    descricao: "Formação prática em desenvolvimento de software, dados, infraestrutura e gestão de projetos de tecnologia.",
    grau_academico: "TECNOLOGO",
    modalidade: "PRESENCIAL",
    duracao_periodos: 6,
    carga_horaria_minima: 1200,
    ato_regulatorio: "Autorização institucional demonstrativa — 2026",
  },
  {
    codigo: "ADM",
    descricao: "Formação generalista para gestão de organizações, pessoas, finanças, operações e estratégia.",
    grau_academico: "BACHARELADO",
    modalidade: "PRESENCIAL",
    duracao_periodos: 8,
    carga_horaria_minima: 3000,
    ato_regulatorio: "Reconhecimento institucional demonstrativo — 2026",
  },
  {
    codigo: "CCO",
    descricao: "Formação para atuação contábil, financeira, fiscal, gerencial, pericial e de auditoria.",
    grau_academico: "BACHARELADO",
    modalidade: "PRESENCIAL",
    duracao_periodos: 8,
    carga_horaria_minima: 3000,
    ato_regulatorio: "Reconhecimento institucional demonstrativo — 2026",
  },
] as const;

const COMPETENCIAS = [
  ["COMP-ANALISE", "Pensamento analítico", "Analisar informações e fundamentar conclusões com evidências.", "GERAL"],
  ["COMP-PROBLEMAS", "Resolução de problemas", "Estruturar problemas e propor soluções viáveis.", "GERAL"],
  ["COMP-TECNICA", "Aplicação de fundamentos técnicos", "Aplicar métodos e ferramentas próprios da área de formação.", "TECNICA"],
  ["COMP-COMUNICACAO", "Comunicação profissional", "Comunicar decisões e resultados com clareza.", "SOCIOEMOCIONAL"],
  ["COMP-ETICA", "Ética e responsabilidade", "Atuar com integridade e atenção aos impactos das decisões.", "SOCIOEMOCIONAL"],
  ["COMP-COLABORACAO", "Colaboração", "Trabalhar de forma cooperativa, responsável e orientada a resultados.", "SOCIOEMOCIONAL"],
] as const;

const REQUISITOS: Array<[string, string]> = [
  ["ADS201", "ADS101"], ["ADS203", "ADS101"], ["ADS202", "ADS102"],
  ["ADS301", "ADS201"], ["ADS302", "ADS202"], ["ADS304", "ADS204"],
  ["ADM201", "ADM101"], ["ADM203", "ADM102"], ["ADM301", "ADM202"],
  ["ADM303", "ADM201"], ["CCO201", "CCO101"], ["CCO203", "CCO101"],
  ["CCO301", "CCO203"], ["CCO302", "CCO202"], ["CCO303", "CCO201"],
];

function competenciasDaDisciplina(codigo: string): string[] {
  if (codigo.endsWith("104") || codigo.endsWith("105")) {
    return ["COMP-COMUNICACAO", "COMP-COLABORACAO", "COMP-ETICA"];
  }
  if (codigo.startsWith("ADM")) {
    return ["COMP-ANALISE", "COMP-COMUNICACAO", "COMP-COLABORACAO"];
  }
  if (codigo.startsWith("CCO")) {
    return ["COMP-ANALISE", "COMP-TECNICA", "COMP-ETICA"];
  }
  return ["COMP-ANALISE", "COMP-PROBLEMAS", "COMP-TECNICA"];
}

function areaDoCurso(codigo: string): string {
  if (codigo === "ADS") return "COMPUTACAO";
  if (codigo === "ADM") return "ADMINISTRACAO_GESTAO";
  return "CIENCIAS_CONTABEIS";
}

export async function seed(db: Knex): Promise<void> {
  if (process.env.NODE_ENV === "production" || process.env.DEMO_SEEDS === "false") {
    console.log("Seed de demonstração do núcleo acadêmico ignorado neste ambiente.");
    return;
  }

  await db.transaction(async (trx) => {
    for (const curso of CURSOS) {
      const { codigo, ...dados } = curso;
      await trx(`${SCHEMA}.curso`).where({ codigo }).update({
        ...dados,
        situacao_academica: "ATIVO",
        observacoes_regulatorias: "Dados preparados para demonstração dos cadastros e dashboards acadêmicos.",
      });
    }

    const cursosBase = await trx(`${SCHEMA}.curso`).whereIn("codigo", CURSOS.map((curso) => curso.codigo)).select("id", "codigo");
    const cursoPorCodigo = new Map(cursosBase.map((curso) => [String(curso.codigo), String(curso.id)]));

    for (const curso of cursosBase) {
      await trx(`${SCHEMA}.matriz_curricular`)
        .where({ curso_id: curso.id, status: "VIGENTE" })
        .update({ codigo: "2026.1", versao: "1.0", publicada_em: trx.fn.now(), updated_at: trx.fn.now() });
    }

    const disciplinas = await trx(`${SCHEMA}.disciplinas as d`)
      .join(`${SCHEMA}.curso_disciplina as cd`, "cd.disciplina_id", "d.id")
      .join(`${SCHEMA}.curso as c`, "c.id", "cd.curso_id")
      .whereIn("c.codigo", CURSOS.map((curso) => curso.codigo))
      .whereExists(function () {
        this.select(trx.raw("1"))
          .from(`${SCHEMA}.matriz_curricular as mc`)
          .whereRaw("mc.id = cd.matriz_curricular_id")
          .where("mc.status", "VIGENTE");
      })
      .distinct("d.id", "d.codigo", "d.nome", "d.carga_horaria", "c.codigo as curso_codigo");

    for (const disciplina of disciplinas) {
      const carga = Number(disciplina.carga_horaria);
      const pratica = Math.floor(carga / 4);
      const laboratorio = Math.floor(carga / 4);
      await trx(`${SCHEMA}.disciplinas`).where({ id: disciplina.id }).update({
        area_conhecimento: areaDoCurso(String(disciplina.curso_codigo)),
        ementa: `Fundamentos e aplicações de ${disciplina.nome}, com atividades orientadas a problemas e situações profissionais.`,
        carga_horaria_teorica: carga - pratica - laboratorio,
        carga_horaria_pratica: pratica,
        carga_horaria_laboratorio: laboratorio,
        carga_horaria_extensao: 0,
        observacoes: "Disciplina enriquecida para demonstração do plano acadêmico e dos indicadores por competência.",
        updated_at: trx.fn.now(),
      });
    }

    await trx(`${SCHEMA}.competencia`)
      .insert(COMPETENCIAS.map(([codigo, nome, descricao, tipo]) => ({ codigo, nome, descricao, tipo, ativo: true })))
      .onConflict("codigo")
      .merge(["nome", "descricao", "tipo", "ativo", "updated_at"]);

    const competencias = await trx(`${SCHEMA}.competencia`).whereIn("codigo", COMPETENCIAS.map(([codigo]) => codigo)).select("id", "codigo");
    const competenciaPorCodigo = new Map(competencias.map((competencia) => [String(competencia.codigo), String(competencia.id)]));
    const vinculosCompetencia = disciplinas.flatMap((disciplina) =>
      competenciasDaDisciplina(String(disciplina.codigo)).map((codigo, ordem) => ({
        disciplina_id: disciplina.id,
        competencia_id: competenciaPorCodigo.get(codigo),
        nivel_esperado: ordem === 0 ? "CONSOLIDAR" : "DESENVOLVER",
        obrigatoria: true,
        ordem,
      })),
    );
    await trx(`${SCHEMA}.disciplina_competencia`)
      .insert(vinculosCompetencia)
      .onConflict(["disciplina_id", "competencia_id"])
      .merge(["nivel_esperado", "obrigatoria", "ordem", "updated_at"]);

    const matrizAds = await trx(`${SCHEMA}.matriz_curricular`)
      .where({ curso_id: cursoPorCodigo.get("ADS"), status: "VIGENTE" })
      .first("id");
    if (matrizAds) {
      const [matrizRascunho] = await trx(`${SCHEMA}.matriz_curricular`)
        .insert({
          id: idDemo("matriz:ADS:2027.1"), curso_id: cursoPorCodigo.get("ADS"), codigo: "2027.1", versao: "2.0",
          status: "RASCUNHO", vigencia_inicio: "2027-02-01",
        })
        .onConflict(["curso_id", "codigo"])
        .merge(["versao", "status", "vigencia_inicio", "updated_at"])
        .returning("id");
      const itensVigentes = await trx(`${SCHEMA}.curso_disciplina`).where({ matriz_curricular_id: matrizAds.id });
      if (itensVigentes.length) {
        await trx(`${SCHEMA}.curso_disciplina`)
          .insert(itensVigentes.map((item) => ({
            id: idDemo(`matriz-item:ADS:2027.1:${item.disciplina_id}`), curso_id: item.curso_id,
            matriz_curricular_id: matrizRascunho.id, disciplina_id: item.disciplina_id,
            periodo_ideal: item.periodo_ideal, obrigatoria: item.obrigatoria,
            carga_horaria: item.carga_horaria, ativo: item.ativo,
          })))
          .onConflict(["matriz_curricular_id", "disciplina_id"])
          .merge(["periodo_ideal", "obrigatoria", "carga_horaria", "ativo", "updated_at"]);
      }
    }

    const itensMatriz = await trx(`${SCHEMA}.curso_disciplina as cd`)
      .join(`${SCHEMA}.disciplinas as d`, "d.id", "cd.disciplina_id")
      .join(`${SCHEMA}.matriz_curricular as mc`, "mc.id", "cd.matriz_curricular_id")
      .where("mc.status", "VIGENTE")
      .whereIn("d.codigo", [...new Set(REQUISITOS.flat())])
      .select("cd.id", "d.codigo");
    const itemPorDisciplina = new Map(itensMatriz.map((item) => [String(item.codigo), String(item.id)]));
    const requisitos = REQUISITOS
      .map(([destino, requisito]) => ({
        curso_disciplina_id: itemPorDisciplina.get(destino),
        requisito_curso_disciplina_id: itemPorDisciplina.get(requisito),
        tipo: "OBRIGATORIO",
      }))
      .filter((item) => item.curso_disciplina_id && item.requisito_curso_disciplina_id);
    if (requisitos.length) {
      await trx(`${SCHEMA}.curso_disciplina_requisito`)
        .insert(requisitos)
        .onConflict(["curso_disciplina_id", "requisito_curso_disciplina_id"])
        .merge(["tipo", "updated_at"]);
    }

    const ofertas = await trx(`${SCHEMA}.turma_disciplina as td`)
      .join(`${SCHEMA}.turma as t`, "t.id", "td.turma_id")
      .join(`${SCHEMA}.periodo_letivo as pl`, "pl.id", "t.periodo_letivo_id")
      .join(`${SCHEMA}.curso_disciplina as cd`, "cd.id", "td.curso_disciplina_id")
      .join(`${SCHEMA}.disciplinas as d`, "d.id", "cd.disciplina_id")
      .join(`${SCHEMA}.curso as c`, "c.id", "t.curso_id")
      .whereIn("c.codigo", ["ADS", "ADM", "CCO"])
      .where("td.status", "ativa")
      .select(
        "td.id", "td.professor_id", "t.sigla", "pl.data_inicio", "pl.data_fim",
        "d.id as disciplina_id", "d.codigo as disciplina_codigo", "d.nome as disciplina_nome", "d.ementa",
      )
      .orderBy(["t.sigla", "d.codigo"]);

    const usuarioAprovador = await trx(`${SCHEMA}.usuario`).whereIn("tipo_usuario", ["administrador", "secretaria"]).first("id");
    for (const oferta of ofertas) {
      const competenciasOferta = await trx(`${SCHEMA}.disciplina_competencia as dc`)
        .join(`${SCHEMA}.competencia as c`, "c.id", "dc.competencia_id")
        .where("dc.disciplina_id", oferta.disciplina_id)
        .orderBy("dc.ordem")
        .select("c.codigo", "c.nome");
      await trx(`${SCHEMA}.plano_ensino`)
        .insert({
          id: idDemo(`plano:${oferta.id}:1`), turma_disciplina_id: oferta.id, versao: 1, status: "APROVADO",
          responsavel_professor_id: oferta.professor_id,
          conteudo: JSON.stringify({
            objetivoGeral: `Aplicar os conceitos de ${oferta.disciplina_nome} em situações acadêmicas e profissionais.`,
            objetivosEspecificos: ["Compreender os fundamentos", "Resolver problemas práticos", "Comunicar resultados"],
            metodologia: ["Aulas dialogadas", "Estudos de caso", "Atividades práticas e projeto integrador"],
            avaliacao: "Avaliações formativas, provas, trabalhos e atividades práticas.",
            bibliografia: ["Bibliografia básica definida pelo núcleo docente estruturante."],
          }),
          snapshot_ementa: oferta.ementa,
          snapshot_competencias: JSON.stringify(competenciasOferta),
          submetido_em: trx.fn.now(), aprovado_em: trx.fn.now(), aprovado_por_usuario_id: usuarioAprovador?.id ?? null,
        })
        .onConflict(["turma_disciplina_id", "versao"])
        .ignore();
    }

    const ofertasHorario = ofertas.filter((oferta) => ["ADS1A", "ADS2A", "ADS3A"].includes(String(oferta.sigla)));
    const turmas = [...new Set(ofertasHorario.map((oferta) => String(oferta.sigla)))].sort();
    const horarios: Record<string, [string, string]> = {
      ADS1A: ["18:30", "19:50"], ADS2A: ["20:00", "21:20"], ADS3A: ["21:30", "22:50"],
    };
    if (ofertasHorario.length) {
      await trx(`${SCHEMA}.horario_turma_disciplina`)
        .whereIn("turma_disciplina_id", ofertasHorario.map((oferta) => oferta.id))
        .whereLike("local", "SALA-DEMO-%")
        .delete();
      const horariosInserir = turmas.flatMap((sigla) => {
        const ofertasTurma = ofertasHorario.filter((oferta) => oferta.sigla === sigla);
        return ofertasTurma.map((oferta, indice) => ({
          id: idDemo(`horario:${oferta.id}`), turma_disciplina_id: oferta.id,
          dia_semana: (indice % 5) + 1, hora_inicio: horarios[sigla][0], hora_fim: horarios[sigla][1],
          local: `SALA-DEMO-${sigla}-${String(indice + 1).padStart(2, "0")}`,
          vigencia_inicio: oferta.data_inicio, vigencia_fim: oferta.data_fim, ativo: true,
        }));
      });
      await trx(`${SCHEMA}.horario_turma_disciplina`).insert(horariosInserir);
    }

    const periodos = await trx(`${SCHEMA}.periodo_letivo`).whereIn("status", ["ativo", "em_andamento"]).select("id", "codigo", "data_inicio", "data_fim");
    for (const periodo of periodos) {
      const inicioPeriodo = dataIso(periodo.data_inicio);
      const fimPeriodo = dataIso(periodo.data_fim);
      const eventos = [
        ["EVENTO", "Semana acadêmica", somarDias(inicioPeriodo, 28), somarDias(inicioPeriodo, 30), false],
        ["FERIADO", "Feriado institucional", somarDias(inicioPeriodo, 55), somarDias(inicioPeriodo, 55), true],
        ["RECESSO", "Recesso acadêmico", somarDias(inicioPeriodo, 90), somarDias(inicioPeriodo, 91), true],
      ].filter((evento) => String(evento[2]) <= fimPeriodo);
      if (eventos.length) {
        await trx(`${SCHEMA}.calendario_academico_evento`)
          .insert(eventos.map(([tipo, titulo, inicio, fim, bloqueia]) => ({
            id: idDemo(`calendario:${periodo.id}:${tipo}:${inicio}`), periodo_letivo_id: periodo.id,
            tipo, titulo, descricao: "Evento de demonstração do calendário acadêmico.",
            data_inicio: inicio, data_fim: fim, bloqueia_aulas: bloqueia,
          })))
          .onConflict("id")
          .merge(["tipo", "titulo", "descricao", "data_inicio", "data_fim", "bloqueia_aulas", "updated_at"]);
      }
    }

    const avaliacoes = await trx(`${SCHEMA}.avaliacao as av`)
      .join(`${SCHEMA}.turma_disciplina as td`, "td.id", "av.turma_disciplina_id")
      .join(`${SCHEMA}.curso_disciplina as cd`, "cd.id", "td.curso_disciplina_id")
      .whereIn("cd.disciplina_id", disciplinas.map((disciplina) => disciplina.id))
      .select("av.id", "cd.disciplina_id");
    for (const avaliacao of avaliacoes) {
      const competenciasAvaliacao = await trx(`${SCHEMA}.disciplina_competencia`)
        .where("disciplina_id", avaliacao.disciplina_id)
        .orderBy("ordem")
        .select("competencia_id");
      if (!competenciasAvaliacao.length) continue;
      await trx(`${SCHEMA}.avaliacao_competencia`).where("avaliacao_id", avaliacao.id).delete();
      const pesoBase = Math.floor(10000 / competenciasAvaliacao.length) / 100;
      await trx(`${SCHEMA}.avaliacao_competencia`).insert(competenciasAvaliacao.map((competencia, indice) => ({
        avaliacao_id: avaliacao.id,
        competencia_id: competencia.competencia_id,
        peso_percentual: indice === competenciasAvaliacao.length - 1
          ? Number((100 - pesoBase * (competenciasAvaliacao.length - 1)).toFixed(2))
          : pesoBase,
      })));
    }

    console.log(
      `Núcleo acadêmico demonstrativo: ${disciplinas.length} disciplinas completas, ${ofertas.length} planos, ` +
      `${ofertasHorario.length} horários e ${avaliacoes.length} avaliações mapeadas por competência.`,
    );
  });
}
