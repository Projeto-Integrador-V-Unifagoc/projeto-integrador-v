import type { NotaAluno } from "../../components/FichaAluno";
import type { FrequenciaAluno, MatriculaDisciplinaFicha, NotaFicha } from "../../services/ficha-api";

export type NotaComSemestre = NotaAluno & { semestre?: string };
export function normalizarSemestre(value?: string | null) {
  return value == null ? "" : String(value).trim().replace("/", "-");
}

/** Organiza a apresentação por identidade; o resultado acadêmico permanece o recebido. */
export function montarNotasFicha(
  notas: NotaFicha[], frequencia?: FrequenciaAluno,
  matriculas: MatriculaDisciplinaFicha[] = [], semestre?: string,
): NotaAluno[] {
  const linhas = new Map<string, NotaComSemestre>();
  const chave = (oferta: string, vinculo: string | null) => `${oferta}:${vinculo ?? ""}`;
  const semestreMatricula = (m?: MatriculaDisciplinaFicha) => normalizarSemestre(m?.semestre || m?.periodo_letivo_codigo || m?.periodo_codigo);

  for (const nota of notas) {
    const matricula = matriculas.find((m) => m.turma_disciplina_id === nota.turmaDisciplinaId
      && m.matricula_turma_disciplina_id === nota.matriculaTurmaDisciplinaId);
    linhas.set(chave(nota.turmaDisciplinaId, nota.matriculaTurmaDisciplinaId), {
      disciplina: nota.disciplinaNome || nota.disciplinaId || "Disciplina não informada",
      turmaNome: nota.turmaNome, professorNome: nota.professorNome,
      turmaDisciplinaId: nota.turmaDisciplinaId,
      matriculaTurmaDisciplinaId: nota.matriculaTurmaDisciplinaId,
      avaliacoes: nota.avaliacoes.map((a) => ({ ...a })),
      resultadoAcademico: nota.resultadoAcademico ?? null,
      semestre: normalizarSemestre(nota.periodoLetivo) || semestreMatricula(matricula),
    });
  }

  for (const matricula of matriculas) {
    const oferta = matricula.turma_disciplina_id;
    if (!oferta) continue;
    const vinculo = matricula.matricula_turma_disciplina_id;
    const id = chave(oferta, vinculo);
    if (linhas.has(id)) continue;
    linhas.set(id, {
      disciplina: matricula.disciplina_nome || matricula.disciplina_id || "Disciplina não informada",
      turmaNome: matricula.turma_sigla, professorNome: matricula.professor_nome,
      turmaDisciplinaId: oferta, matriculaTurmaDisciplinaId: vinculo,
      avaliacoes: [], resultadoAcademico: null, semestre: semestreMatricula(matricula),
    });
  }

  for (const item of frequencia?.consolidado ?? []) {
    if ([...linhas.values()].some((linha) => linha.turmaDisciplinaId === item.turmaDisciplinaId)) continue;
    linhas.set(chave(item.turmaDisciplinaId, null), {
      disciplina: item.disciplinaNome, turmaDisciplinaId: item.turmaDisciplinaId,
      matriculaTurmaDisciplinaId: null, avaliacoes: [], resultadoAcademico: null,
    });
  }
  const filtro = normalizarSemestre(semestre);
  return [...linhas.values()].filter((linha) => !filtro || !linha.semestre || linha.semestre === filtro)
    .map((linha) => ({ disciplina: linha.disciplina, turmaNome: linha.turmaNome, professorNome: linha.professorNome,
      periodoLetivo: linha.semestre || null, turmaDisciplinaId: linha.turmaDisciplinaId,
      matriculaTurmaDisciplinaId: linha.matriculaTurmaDisciplinaId,
      avaliacoes: linha.avaliacoes, resultadoAcademico: linha.resultadoAcademico }));
}
