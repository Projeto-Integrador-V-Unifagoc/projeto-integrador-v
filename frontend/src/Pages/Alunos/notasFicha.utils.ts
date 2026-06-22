import type { NotaAluno } from "../../components/FichaAluno";
import type { MatriculaDetalhada } from "../../models/matricula-model";
import type {
  FrequenciaAluno as FrequenciaAlunoResponse,
  NotaFicha,
} from "../../services/ficha-api";

export type NotaComSemestre = NotaAluno & {
  semestre?: string;
};

export function normalizarSemestre(semestre?: string | number | null) {
  if (semestre === undefined || semestre === null) return "";
  return String(semestre).trim().replace("/", "-");
}

export function getNotaPorNome(nota: NotaFicha, nome: string) {
  return (
    nota.avaliacoes.find((avaliacao) =>
      avaliacao.nome.toLowerCase().includes(nome.toLowerCase()),
    )?.nota ?? 0
  );
}

export function montarNotasFicha(
  notasApiResponse: NotaFicha[],
  frequencia?: FrequenciaAlunoResponse,
  matriculas: MatriculaDetalhada[] = [],
  semestre?: string,
): NotaAluno[] {
  const semestreNormalizado = normalizarSemestre(semestre);
  const frequenciaPorDisciplina = new Map(
    (frequencia?.consolidado ?? []).map((item) => [item.disciplinaNome, item]),
  );

  const notasDaApi: NotaComSemestre[] = notasApiResponse.map((nota) => {
    const disciplinaNome = nota.disciplinaNome ?? nota.disciplinaId ?? "Desconhecida";
    const frequenciaDisciplina = frequenciaPorDisciplina.get(
      disciplinaNome as string,
    );
    // try to associate the matricula_turma_disciplina_id for this discipline
    const matriculaMatch = matriculas.find((m) => {
      if (!m) return false;
      const nomeMat = String(m.disciplina_nome ?? "").toLowerCase();
      const nomeNota = String(disciplinaNome ?? "").toLowerCase();
      if (nomeMat && nomeNota && nomeMat === nomeNota) return true;
      return false;
    });
    return {
      disciplina: disciplinaNome,
      mediaFinal: Number(nota.media ?? 0),
      avaliacao: nota.avaliacoes.reduce(
        (total, avaliacao) => total + Number(avaliacao.nota ?? 0),
        0,
      ),
      avaliacoes:
        nota.avaliacoes?.map((a) => ({
          id: a.id,
          nome: a.nome,
          nota: a.nota,
          peso: a.peso,
          matricula_turma_disciplina_id:
            a.matricula_turma_disciplina_id ?? null,
        })) ?? [],
      matriculaTurmaDisciplinaId: matriculaMatch?.matricula_turma_disciplina_id,
      provaFinal: getNotaPorNome(nota, "final"),
      provaInova: getNotaPorNome(nota, "inova"),
      provaSegundaChamada: getNotaPorNome(nota, "segunda"),
      conhecimentosGerais: getNotaPorNome(nota, "conhecimento"),
      faltas: Number(frequenciaDisciplina?.faltas ?? 0),
      percentualFaltas:
        frequenciaDisciplina && frequenciaDisciplina.totalAulas > 0
          ? Number(
              (
                (frequenciaDisciplina.faltas /
                  frequenciaDisciplina.totalAulas) *
                100
              ).toFixed(2),
            )
          : 0,
      semestre: normalizarSemestre(nota.periodoLetivo),
    };
  });

  const disciplinasComNota = new Set(notasDaApi.map((nota) => nota.disciplina));
  const notasPorFrequencia: NotaComSemestre[] = (frequencia?.consolidado ?? [])
    .filter((item) => !disciplinasComNota.has(item.disciplinaNome))
    .map((item) => ({
      disciplina: item.disciplinaNome,
      mediaFinal: 0,
      avaliacao: 0,
      avaliacoes: [],
      provaFinal: 0,
      provaInova: 0,
      provaSegundaChamada: 0,
      conhecimentosGerais: 0,
      faltas: Number(item.faltas ?? 0),
      percentualFaltas:
        item.totalAulas > 0
          ? Number(((item.faltas / item.totalAulas) * 100).toFixed(2))
          : 0,
    }));

  const disciplinasConhecidas = new Set([
    ...notasDaApi.map((nota) => nota.disciplina),
    ...notasPorFrequencia.map((nota) => nota.disciplina),
  ]);
  const notasPorMatricula: NotaComSemestre[] = matriculas
    .filter((matricula) => !disciplinasConhecidas.has(matricula.disciplina_nome))
    .map((matricula) => ({
      disciplina: matricula.disciplina_nome,
      mediaFinal: 0,
      avaliacao: 0,
      avaliacoes: [],
      provaFinal: 0,
      provaInova: 0,
      provaSegundaChamada: 0,
      conhecimentosGerais: 0,
      faltas: 0,
      percentualFaltas: 0,
      semestre: normalizarSemestre((matricula as any).semestre),
      matriculaTurmaDisciplinaId: matricula.matricula_turma_disciplina_id ?? null,
    }));

  return [...notasDaApi, ...notasPorFrequencia, ...notasPorMatricula]
    .filter(
      (nota) =>
        !semestreNormalizado ||
        !nota.semestre ||
        nota.semestre === semestreNormalizado,
    )
    .map(({ semestre: _semestre, ...nota }) => nota);
}
