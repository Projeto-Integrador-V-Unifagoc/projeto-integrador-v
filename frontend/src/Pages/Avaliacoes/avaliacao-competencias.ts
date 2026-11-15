type CompetenciaComPeso = { peso_percentual: number | "" };

export function somarPesosCompetencias(competencias: CompetenciaComPeso[]) {
  return competencias.reduce((soma, item) => soma + Number(item.peso_percentual || 0), 0);
}

export function validarPesosCompetencias(competencias: CompetenciaComPeso[]) {
  if (!competencias.length) return null;
  const soma = somarPesosCompetencias(competencias);
  if (competencias.some((item) => !Number.isFinite(Number(item.peso_percentual)) || Number(item.peso_percentual) <= 0)) {
    return "Todos os pesos devem ser maiores que zero.";
  }
  if (Math.abs(soma - 100) > 0.005) {
    return "Os pesos das competências devem totalizar exatamente 100%.";
  }
  return null;
}
