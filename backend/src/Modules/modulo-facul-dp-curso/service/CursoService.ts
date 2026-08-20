import { v4 as uuidv4 } from 'uuid';
import { CursoCommand } from "../models/Curso";
import { CursoRepository } from "../repository/CursoRepository";

export class CursoService {
    cursoRepository = new CursoRepository();

    private traduzirErroRemocao(error: any) {
        const codigo = error?.code;
        const constraint = String(error?.constraint ?? "");
        const mensagemOriginal = String(error?.message ?? "");
        const detalhe = String(error?.detail ?? "");

        if (
            constraint.includes("turma_curso_id_foreign") ||
            mensagemOriginal.includes("turma_curso_id_foreign") ||
            detalhe.includes("turma_curso_id_foreign")
        ) {
            return "Nao e possivel remover o curso porque ele possui turmas cadastradas.";
        }

        if (
            codigo === "23503" ||
            mensagemOriginal.includes("violates RESTRICT setting of foreign key constraint") ||
            detalhe.includes("violates RESTRICT setting of foreign key constraint")
        ) {
            return "Nao e possivel remover o curso, pois ele possui registros vinculados.";
        }

        return null;
    }

    async criarCurso(data: any) {
        const curso: CursoCommand = {
            id: uuidv4(),
            codigo: data.codigo,
            nome: data.nome,
            departamento_id: data.departamentoId
        };

        return await this.cursoRepository.criarCurso(curso);
    }

    async listarCursos() {
        return await this.cursoRepository.listarCursos();
    }

    async buscarCursoPorId(id: string) {
        return await this.cursoRepository.buscarCursoPorId(id);
    }

    async atualizarCurso(id: string, data: any) {
        const curso: Partial<CursoCommand> = {
            codigo: data.codigo,
            nome: data.nome,
            departamento_id: data.departamentoId
        };

        return await this.cursoRepository.atualizarCurso(id, curso);
    }

    async removerCurso(id: string) {
        try {
            return await this.cursoRepository.removerCurso(id);
        } catch (error: any) {
            const mensagemTraduzida = this.traduzirErroRemocao(error);

            if (mensagemTraduzida) {
                throw new Error(mensagemTraduzida);
            }

            throw error;
        }
    }
}
