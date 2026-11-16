// Todos os limites do conteúdo acadêmico ficam aqui. O frontend recebe os
// valores calculados para a disciplina em `GET /conteudos/curso-disciplinas/:id`
// e usa a mesma fórmula de tempo (ver `conteudo-metricas.ts` no frontend).
export const LIMITES_CONTEUDO = {
  // Tempo estimado de consumo da página.
  palavrasPorMinuto: 200,
  segundosPorImagem: 12,
  segundosPorVideo: 60,
  segundosPorArquivo: 5,
  segundosPorLink: 5,

  // Tamanho da página: acima do recomendado só avisa; acima do máximo bloqueia.
  paginaMinutosRecomendado: 10,
  paginaMinutosMaximo: 20,
  paginaMaxVideos: 3,
  paginaMaxImagens: 15,

  // Quantidade.
  paginasPorTopicoRecomendado: 10,
  paginasPorTopicoMaximo: 20,
  horasDeCargaPorTopico: 4,
  multiplicadorMaximoDeTopicos: 2,

  // Proteções técnicas.
  tamanhoMaximoDosBlocosBytes: 1_000_000,
  profundidadeMaximaDeBlocos: 6,
  tamanhoMaximoTitulo: 150,
  tamanhoMaximoDescricao: 1000,
  tamanhoMaximoImagemBytes: 8 * 1024 * 1024,
  tamanhoMaximoArquivoBytes: 10 * 1024 * 1024,
} as const;

// Recomendado: 1 tópico a cada 4h de carga horária (mínimo 1). Máximo: o dobro.
export function limitesDeTopicos(cargaHoraria: number) {
  const horas = Number.isFinite(cargaHoraria) && cargaHoraria > 0 ? cargaHoraria : 0;
  const recomendado = Math.max(1, Math.ceil(horas / LIMITES_CONTEUDO.horasDeCargaPorTopico));
  return { recomendado, maximo: recomendado * LIMITES_CONTEUDO.multiplicadorMaximoDeTopicos };
}

export function limitesDaDisciplina(cargaHoraria: number) {
  return {
    topicos: limitesDeTopicos(cargaHoraria),
    paginasPorTopico: {
      recomendado: LIMITES_CONTEUDO.paginasPorTopicoRecomendado,
      maximo: LIMITES_CONTEUDO.paginasPorTopicoMaximo,
    },
    pagina: {
      minutosRecomendado: LIMITES_CONTEUDO.paginaMinutosRecomendado,
      minutosMaximo: LIMITES_CONTEUDO.paginaMinutosMaximo,
      maxVideos: LIMITES_CONTEUDO.paginaMaxVideos,
      maxImagens: LIMITES_CONTEUDO.paginaMaxImagens,
    },
    tempo: {
      palavrasPorMinuto: LIMITES_CONTEUDO.palavrasPorMinuto,
      segundosPorImagem: LIMITES_CONTEUDO.segundosPorImagem,
      segundosPorVideo: LIMITES_CONTEUDO.segundosPorVideo,
      segundosPorArquivo: LIMITES_CONTEUDO.segundosPorArquivo,
      segundosPorLink: LIMITES_CONTEUDO.segundosPorLink,
    },
  };
}
