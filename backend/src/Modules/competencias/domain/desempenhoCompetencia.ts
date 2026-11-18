export const CRITERIOS_COMPETENCIA = {
  coberturaMinima: 50,
  dificuldadeAbaixoDe: 60,
  atencaoAbaixoDe: 75,
} as const;

export type ClassificacaoCompetencia =
  | "DADOS_INSUFICIENTES"
  | "DIFICULDADE"
  | "ATENCAO"
  | "ADEQUADO";

interface DadosDesempenhoCompetencia {
  competenciasPlanejadas: any[];
  avaliacoesCompetencias: any[];
  alunos: any[];
  notas: any[];
}

function numero(valor: number | null) {
  return valor === null ? null : Number(valor.toFixed(1));
}

function media(valores: number[]) {
  return valores.length
    ? numero(valores.reduce((total, valor) => total + valor, 0) / valores.length)
    : null;
}

function dataIso(valor: unknown) {
  if (!valor) return null;
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  const texto = String(valor);
  const iso = texto.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (iso) return iso;
  const data = new Date(texto);
  return Number.isNaN(data.getTime()) ? null : data.toISOString().slice(0, 10);
}

export function classificarCompetencia(
  aproveitamento: number | null,
  cobertura: number,
): ClassificacaoCompetencia {
  if (aproveitamento === null || cobertura < CRITERIOS_COMPETENCIA.coberturaMinima) {
    return "DADOS_INSUFICIENTES";
  }
  if (aproveitamento < CRITERIOS_COMPETENCIA.dificuldadeAbaixoDe) return "DIFICULDADE";
  if (aproveitamento < CRITERIOS_COMPETENCIA.atencaoAbaixoDe) return "ATENCAO";
  return "ADEQUADO";
}

export function calcularDesempenhoCompetencias(
  dados: DadosDesempenhoCompetencia,
  turmaDisciplinaId: string,
  alunoId?: string,
) {
  const planejadas = dados.competenciasPlanejadas.filter(
    (item) => String(item.turma_disciplina_id) === String(turmaDisciplinaId),
  );
  const alunos = dados.alunos.filter(
    (item) => String(item.turma_disciplina_id) === String(turmaDisciplinaId),
  );
  const alunosAnalisados = alunoId
    ? alunos.filter((item) => String(item.aluno_id) === String(alunoId))
    : alunos;
  const notas = new Map<string, number>(
    dados.notas.map((item) => [
      `${String(item.matricula_turma_disciplina_id)}:${String(item.avaliacao_id)}`,
      Number(item.nota_valor),
    ]),
  );

  return planejadas.map((competencia) => {
    const fontesBase = dados.avaliacoesCompetencias.filter((item) =>
      String(item.turma_disciplina_id) === String(turmaDisciplinaId)
      && String(item.competencia_id) === String(competencia.competencia_id),
    );
    const pontosPlanejados = fontesBase.reduce(
      (total, item) => total + Number(item.valor) * Number(item.peso_percentual) / 100,
      0,
    );
    const resultados = alunosAnalisados.map((aluno) => {
      let pontosComNota = 0;
      let somaPonderada = 0;
      const fontes = fontesBase.map((fonte) => {
        const chave = `${String(aluno.matricula_turma_disciplina_id)}:${String(fonte.avaliacao_id)}`;
        const nota = notas.get(chave);
        const pontosCompetencia = Number(fonte.valor) * Number(fonte.peso_percentual) / 100;
        const aproveitamento = nota === undefined || Number(fonte.valor) <= 0
          ? null
          : 100 * nota / Number(fonte.valor);
        if (aproveitamento !== null) {
          pontosComNota += pontosCompetencia;
          somaPonderada += aproveitamento * pontosCompetencia;
        }
        return {
          id: String(fonte.avaliacao_id),
          titulo: fonte.descricao_avaliacao || fonte.tipo_avaliacao,
          tipo: fonte.tipo_avaliacao,
          valor: Number(fonte.valor),
          pesoPercentual: Number(fonte.peso_percentual),
          pontosCompetencia: numero(pontosCompetencia),
          dataDevolucao: dataIso(fonte.data_devolucao),
          nota: nota ?? null,
          aproveitamento: numero(aproveitamento),
        };
      });
      const cobertura = pontosPlanejados > 0 ? 100 * pontosComNota / pontosPlanejados : 0;
      const aproveitamento = pontosComNota > 0 ? somaPonderada / pontosComNota : null;
      return {
        alunoId: String(aluno.aluno_id),
        media: numero(aproveitamento),
        cobertura: numero(cobertura) ?? 0,
        pontosComNota: numero(pontosComNota) ?? 0,
        fontes,
      };
    });
    const alunosComDados = resultados.filter((item) => item.media !== null);
    const aproveitamentoMedio = media(alunosComDados.map((item) => Number(item.media)));
    const pontosComNota = resultados.reduce((total, item) => total + item.pontosComNota, 0);
    const totalPlanejado = pontosPlanejados * alunosAnalisados.length;
    const cobertura = totalPlanejado > 0 ? numero(100 * pontosComNota / totalPlanejado) ?? 0 : 0;
    const distribuicao = { dificuldade: 0, atencao: 0, adequado: 0, semDados: 0 };
    for (const item of resultados) {
      const faixa = classificarCompetencia(item.media, item.cobertura);
      if (faixa === "DIFICULDADE") distribuicao.dificuldade += 1;
      else if (faixa === "ATENCAO") distribuicao.atencao += 1;
      else if (faixa === "ADEQUADO") distribuicao.adequado += 1;
      else distribuicao.semDados += 1;
    }
    const fontes = fontesBase.map((fonte) => {
      const detalhes = resultados.map((item) => item.fontes.find((avaliacao) => avaliacao.id === String(fonte.avaliacao_id)));
      const comNota = detalhes.filter((item) => item?.aproveitamento !== null);
      return {
        id: String(fonte.avaliacao_id),
        titulo: fonte.descricao_avaliacao || fonte.tipo_avaliacao,
        tipo: fonte.tipo_avaliacao,
        valor: Number(fonte.valor),
        pesoPercentual: Number(fonte.peso_percentual),
        pontosCompetencia: numero(Number(fonte.valor) * Number(fonte.peso_percentual) / 100),
        dataDevolucao: dataIso(fonte.data_devolucao),
        notasLancadas: comNota.length,
        notasEsperadas: alunosAnalisados.length,
        media: media(comNota.map((item) => Number(item!.aproveitamento))),
      };
    });
    const individual = alunoId ? resultados[0] : null;
    const mediaFinal = individual?.media ?? aproveitamentoMedio;
    const coberturaFinal = individual?.cobertura ?? cobertura;
    return {
      id: String(competencia.competencia_id),
      codigo: competencia.codigo,
      nome: competencia.nome,
      tipo: competencia.tipo,
      nivelEsperado: competencia.nivel_esperado,
      obrigatoria: Boolean(competencia.obrigatoria),
      media: mediaFinal,
      cobertura: coberturaFinal,
      pontosPlanejados: numero(pontosPlanejados) ?? 0,
      pontosComNota: individual?.pontosComNota
        ?? numero(alunosAnalisados.length ? pontosComNota / alunosAnalisados.length : 0)
        ?? 0,
      alunosComDados: alunosComDados.length,
      totalAlunos: alunosAnalisados.length,
      classificacao: classificarCompetencia(mediaFinal, coberturaFinal),
      distribuicao,
      fontes: individual?.fontes ?? fontes,
    };
  });
}
