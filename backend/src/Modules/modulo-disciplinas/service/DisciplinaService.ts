import { v4 as uuidv4 } from "uuid";
import { DisciplinaCommand } from "../models/Disciplina";
import { DisciplinaRepository } from "../repository/DisciplinaRepository";
import { erroEstruturaAcademica } from "../../modulo-estrutura-academica/errors/EstruturaAcademicaError";

export class DisciplinaService {
    disciplinaRepository = new DisciplinaRepository();

    private textoObrigatorio(valor: unknown, campo: string) {
        if (typeof valor !== "string" || !valor.trim()) {
            throw erroEstruturaAcademica.invalido(`${campo} e obrigatorio`);
        }

        return valor.trim();
    }

    private validarCargaHoraria(valor: unknown) {
        const cargaHoraria = Number(valor);

        if (!Number.isInteger(cargaHoraria) || cargaHoraria <= 0) {
            throw erroEstruturaAcademica.invalido("Carga horaria deve ser um numero inteiro maior que zero");
        }

        return cargaHoraria;
    }

    async criarDisciplina(data: any) {
        const codigo = this.textoObrigatorio(data.codigo, "Codigo").toUpperCase();
        const nome = this.textoObrigatorio(data.nome, "Nome");
        const cargaHoraria = this.validarCargaHoraria(data.cargaHoraria);
        const disciplinaExistente = await this.disciplinaRepository.buscarDisciplinaPorCodigo(codigo);

        if (disciplinaExistente) {
            throw erroEstruturaAcademica.conflito("Ja existe disciplina com este codigo");
        }

        const disciplina: DisciplinaCommand = {
            id: uuidv4(),
            codigo,
            nome,
            pre_requisito: data.preRequisito,
            carga_horaria: cargaHoraria,
            ativo: data.ativo ?? true
        };

        return await this.disciplinaRepository.criarDisciplina(disciplina);
    }

    async listarDisciplinas() {
        return await this.disciplinaRepository.listarDisciplinas();
    }

    async buscarDisciplinaPorId(id: string) {
        return await this.disciplinaRepository.buscarDisciplinaPorId(id);
    }

    async atualizarDisciplina(id: string, data: any) {
        const disciplinaAtual = await this.disciplinaRepository.buscarDisciplinaPorId(id);

        if (!disciplinaAtual) {
            return null;
        }

        const codigo = this.textoObrigatorio(data.codigo ?? disciplinaAtual.codigo, "Codigo").toUpperCase();
        const nome = this.textoObrigatorio(data.nome ?? disciplinaAtual.nome, "Nome");
        const cargaHoraria = this.validarCargaHoraria(data.cargaHoraria ?? disciplinaAtual.carga_horaria);

        if (codigo !== disciplinaAtual.codigo) {
            const disciplinaExistente = await this.disciplinaRepository.buscarDisciplinaPorCodigo(codigo);

            if (disciplinaExistente && disciplinaExistente.id !== id) {
                throw erroEstruturaAcademica.conflito("Ja existe disciplina com este codigo");
            }
        }

        const disciplina: Partial<DisciplinaCommand> = {
            codigo,
            nome,
            pre_requisito: data.preRequisito,
            carga_horaria: cargaHoraria,
            ativo: data.ativo
        };

        return await this.disciplinaRepository.atualizarDisciplina(id, disciplina);
    }

    async removerDisciplina(id: string) {
        return await this.disciplinaRepository.removerDisciplina(id);
    }
}
