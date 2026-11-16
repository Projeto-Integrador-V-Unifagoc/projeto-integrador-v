import type { CursoDisciplinaResponse } from "../../models/curso-disciplina-model";
import type { CursoResponse } from "../../models/curso-model";

export function sugerirFaculdade(
    cursoDisciplinaIds: string[],
    cursoDisciplinas: CursoDisciplinaResponse[],
    cursos: CursoResponse[],
): { id: string; nome: string } | null {
    if (!cursoDisciplinaIds.length) return null;

    const cursoIds = new Set(
        cursoDisciplinas
            .filter((cursoDisciplina) => cursoDisciplinaIds.includes(cursoDisciplina.id))
            .map((cursoDisciplina) => cursoDisciplina.curso.id),
    );

    const faculdades = new Map<string, string>();
    for (const curso of cursos) {
        if (cursoIds.has(curso.id)) {
            faculdades.set(curso.departamento.faculdade.id, curso.departamento.faculdade.nome);
        }
    }

    if (faculdades.size !== 1) return null;
    const [id] = faculdades.keys();
    return { id, nome: faculdades.get(id)! };
}
