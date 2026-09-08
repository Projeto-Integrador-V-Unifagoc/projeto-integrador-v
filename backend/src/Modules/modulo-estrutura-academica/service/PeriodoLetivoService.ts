import { v4 as uuidv4 } from "uuid";
import { PeriodoLetivoCommand } from "../models/PeriodoLetivo";
import { PeriodoLetivoRepository } from "../repository/PeriodoLetivoRepository";
import { erroEstruturaAcademica } from "../errors/EstruturaAcademicaError";

const STATUS_PERIODO = ["planejado", "aberto", "ativo", "em_andamento", "encerrado", "cancelado"];
const TRANSICOES_PERIODO: Record<string, string[]> = {
    planejado: ["planejado", "aberto", "ativo", "cancelado"],
    aberto: ["aberto", "ativo", "em_andamento", "encerrado", "cancelado"],
    ativo: ["ativo", "aberto", "em_andamento", "encerrado", "cancelado"],
    em_andamento: ["em_andamento", "encerrado", "cancelado"],
    encerrado: ["encerrado"],
    cancelado: ["cancelado"]
};

export class PeriodoLetivoService {
    periodoLetivoRepository = new PeriodoLetivoRepository();

    private validarPeriodo(data: any) {
        if (typeof data.codigo !== "string" || !data.codigo.trim()) {
            throw erroEstruturaAcademica.invalido("Codigo do periodo letivo e obrigatorio");
        }

        if (!Number.isInteger(Number(data.ano))) {
            throw erroEstruturaAcademica.invalido("Ano deve ser um numero inteiro");
        }

        const semestre = Number(data.semestre);

        if (![1, 2].includes(semestre)) {
            throw erroEstruturaAcademica.invalido("Semestre deve ser 1 ou 2");
        }

        const dataInicio = new Date(`${data.dataInicio}T00:00:00`);
        const dataFim = new Date(`${data.dataFim}T00:00:00`);

        if (!data.dataInicio || !data.dataFim || Number.isNaN(dataInicio.getTime()) || Number.isNaN(dataFim.getTime())) {
            throw erroEstruturaAcademica.invalido("Datas de inicio e fim sao obrigatorias e devem ser validas");
        }

        if (dataFim < dataInicio) {
            throw erroEstruturaAcademica.invalido("Data fim deve ser maior ou igual a data inicio");
        }

        const status = String(data.status ?? "planejado").trim().toLowerCase();
        if (!STATUS_PERIODO.includes(status)) {
            throw erroEstruturaAcademica.invalido("Status do periodo letivo invalido");
        }
    }

    async criarPeriodoLetivo(data: any) {
        this.validarPeriodo(data);

        const periodoPorCodigo = await this.periodoLetivoRepository.buscarPeriodoLetivoPorCodigo(data.codigo);

        if (periodoPorCodigo) {
            throw erroEstruturaAcademica.conflito("Ja existe periodo letivo com este codigo");
        }

        const periodoPorAnoSemestre = await this.periodoLetivoRepository.buscarPeriodoLetivoPorAnoSemestre(
            Number(data.ano),
            Number(data.semestre)
        );

        if (periodoPorAnoSemestre) {
            throw erroEstruturaAcademica.conflito("Ja existe periodo letivo para este ano e semestre");
        }

        const periodoLetivo: PeriodoLetivoCommand = {
            id: uuidv4(),
            codigo: data.codigo.trim().toUpperCase(),
            ano: Number(data.ano),
            semestre: Number(data.semestre),
            data_inicio: data.dataInicio,
            data_fim: data.dataFim,
            ativo: data.ativo ?? true,
            status: String(data.status ?? "planejado").toLowerCase()
        };

        return await this.periodoLetivoRepository.criarPeriodoLetivo(periodoLetivo);
    }

    async listarPeriodosLetivos() {
        return await this.periodoLetivoRepository.listarPeriodosLetivos();
    }

    async buscarPeriodoLetivoPorId(id: string) {
        return await this.periodoLetivoRepository.buscarPeriodoLetivoPorId(id);
    }

    async atualizarPeriodoLetivo(id: string, data: any) {
        const periodoAtual = await this.periodoLetivoRepository.buscarPeriodoLetivoPorId(id);

        if (!periodoAtual) {
            return null;
        }

        const payload = {
            codigo: data.codigo ?? periodoAtual.codigo,
            ano: data.ano ?? periodoAtual.ano,
            semestre: data.semestre ?? periodoAtual.semestre,
            dataInicio: data.dataInicio ?? periodoAtual.data_inicio,
            dataFim: data.dataFim ?? periodoAtual.data_fim,
            ativo: data.ativo ?? periodoAtual.ativo,
            status: data.status ?? periodoAtual.status
        };

        this.validarPeriodo(payload);

        const statusAtual = String(periodoAtual.status).toLowerCase();
        const proximoStatus = String(payload.status).toLowerCase();
        if (!(TRANSICOES_PERIODO[statusAtual] ?? [statusAtual]).includes(proximoStatus)) {
            throw erroEstruturaAcademica.conflito(
                `Transicao de status do periodo de ${periodoAtual.status} para ${payload.status} nao e permitida`
            );
        }

        const inicioAtual = new Date(`${periodoAtual.data_inicio}T00:00:00`);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        if (
            inicioAtual <= hoje &&
            (String(payload.dataInicio).slice(0, 10) !== String(periodoAtual.data_inicio).slice(0, 10) ||
                String(payload.dataFim).slice(0, 10) !== String(periodoAtual.data_fim).slice(0, 10))
        ) {
            throw erroEstruturaAcademica.conflito("As datas nao podem ser alteradas depois do inicio do periodo letivo");
        }

        if (payload.codigo !== periodoAtual.codigo) {
            const periodoPorCodigo = await this.periodoLetivoRepository.buscarPeriodoLetivoPorCodigo(payload.codigo);

            if (periodoPorCodigo) {
                throw erroEstruturaAcademica.conflito("Ja existe periodo letivo com este codigo");
            }
        }

        if (payload.ano !== periodoAtual.ano || payload.semestre !== periodoAtual.semestre) {
            const periodoPorAnoSemestre = await this.periodoLetivoRepository.buscarPeriodoLetivoPorAnoSemestre(
                Number(payload.ano),
                Number(payload.semestre)
            );

            if (periodoPorAnoSemestre) {
                throw erroEstruturaAcademica.conflito("Ja existe periodo letivo para este ano e semestre");
            }
        }

        return await this.periodoLetivoRepository.atualizarPeriodoLetivo(id, {
            codigo: String(payload.codigo).trim().toUpperCase(),
            ano: Number(payload.ano),
            semestre: Number(payload.semestre),
            data_inicio: payload.dataInicio,
            data_fim: payload.dataFim,
            ativo: payload.ativo,
            status: String(payload.status).toLowerCase()
        });
    }

    async removerPeriodoLetivo(id: string) {
        if (await this.periodoLetivoRepository.possuiTurmas(id)) {
            throw erroEstruturaAcademica.conflito("Nao e possivel remover o periodo letivo porque ele possui turmas cadastradas");
        }

        return await this.periodoLetivoRepository.removerPeriodoLetivo(id);
    }
}
