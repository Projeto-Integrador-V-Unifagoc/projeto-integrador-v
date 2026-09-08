import { v4 as uuidv4 } from 'uuid';
import { CursoCommand } from "../models/Curso";
import { CursoRepository } from "../repository/CursoRepository";
import { DepartamentoRepository } from "../repository/DepartamentoRepository";
import { erroEstruturaAcademica } from "../../modulo-estrutura-academica/errors/EstruturaAcademicaError";

export class CursoService {
    cursoRepository = new CursoRepository();
    departamentoRepository = new DepartamentoRepository();

    private textoObrigatorio(valor: unknown, campo: string) {
        if (typeof valor !== "string" || !valor.trim()) {
            throw erroEstruturaAcademica.invalido(`${campo} e obrigatorio`);
        }

        return valor.trim();
    }

    private async validarDepartamento(id: unknown) {
        const departamentoId = this.textoObrigatorio(id, "Departamento");

        if (!await this.departamentoRepository.buscarDepartamentoPorId(departamentoId)) {
            throw erroEstruturaAcademica.naoEncontrado("Departamento nao encontrado");
        }

        return departamentoId;
    }

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
        const codigo = this.textoObrigatorio(data.codigo, "Codigo").toUpperCase();
        const nome = this.textoObrigatorio(data.nome, "Nome");
        const departamentoId = await this.validarDepartamento(data.departamentoId);

        if (await this.cursoRepository.buscarCursoPorCodigo(codigo)) {
            throw erroEstruturaAcademica.conflito("Ja existe curso com este codigo");
        }

        const curso: CursoCommand = {
            id: uuidv4(),
            codigo,
            nome,
            departamento_id: departamentoId
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
        const cursoAtual = await this.cursoRepository.buscarCursoRegistroPorId(id);

        if (!cursoAtual) {
            return null;
        }

        const codigo = this.textoObrigatorio(data.codigo ?? cursoAtual.codigo, "Codigo").toUpperCase();
        const nome = this.textoObrigatorio(data.nome ?? cursoAtual.nome, "Nome");
        const departamentoId = await this.validarDepartamento(data.departamentoId ?? cursoAtual.departamento_id);
        const cursoMesmoCodigo = await this.cursoRepository.buscarCursoPorCodigo(codigo);

        if (cursoMesmoCodigo && cursoMesmoCodigo.id !== id) {
            throw erroEstruturaAcademica.conflito("Ja existe curso com este codigo");
        }

        const curso: Partial<CursoCommand> = {
            codigo,
            nome,
            departamento_id: departamentoId
        };

        return await this.cursoRepository.atualizarCurso(id, curso);
    }

    async removerCurso(id: string) {
        try {
            return await this.cursoRepository.removerCurso(id);
        } catch (error: any) {
            const mensagemTraduzida = this.traduzirErroRemocao(error);

            if (mensagemTraduzida) {
                throw erroEstruturaAcademica.conflito(mensagemTraduzida);
            }

            throw error;
        }
    }
}
