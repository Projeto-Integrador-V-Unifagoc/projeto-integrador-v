import { v4 as uuidv4 } from "uuid";
import { CursoRepository } from "../../modulo-facul-dp-curso/repository/CursoRepository";
import { TurmaCommand } from "../models/Turma";
import { PeriodoLetivoRepository } from "../repository/PeriodoLetivoRepository";
import { TurmaRepository } from "../repository/TurmaRepository";
import { erroEstruturaAcademica } from "../errors/EstruturaAcademicaError";

const STATUS_TURMA = ["planejada", "ativa", "em_andamento", "concluida", "cancelada", "encerrada"];
const TURNOS: Record<string, string> = {
    matutino: "matutino",
    manha: "matutino",
    "manhã": "matutino",
    vespertino: "vespertino",
    tarde: "vespertino",
    noturno: "noturno",
    noite: "noturno",
    integral: "integral"
};
const STATUS_PERIODO_DISPONIVEL = ["planejado", "aberto", "ativo"];
const TRANSICOES_TURMA: Record<string, string[]> = {
    planejada: ["planejada", "ativa", "cancelada"],
    ativa: ["ativa", "em_andamento", "concluida", "cancelada", "encerrada"],
    em_andamento: ["em_andamento", "concluida", "cancelada", "encerrada"],
    concluida: ["concluida"],
    cancelada: ["cancelada"],
    encerrada: ["encerrada"]
};

export class TurmaService {
    turmaRepository = new TurmaRepository();
    cursoRepository = new CursoRepository();
    periodoLetivoRepository = new PeriodoLetivoRepository();

    private textoObrigatorio(valor: unknown, campo: string) {
        if (typeof valor !== "string" || !valor.trim()) {
            throw erroEstruturaAcademica.invalido(`${campo} e obrigatorio`);
        }

        return valor.trim();
    }

    private normalizarTurno(valor: unknown) {
        const turno = String(valor ?? "").trim().toLowerCase();
        const normalizado = TURNOS[turno];

        if (!normalizado) {
            throw erroEstruturaAcademica.invalido("Turno deve ser matutino, vespertino, noturno ou integral");
        }

        return normalizado;
    }

    private async validarRelacionamentos(data: any, exigirPeriodoDisponivel: boolean) {
        this.textoObrigatorio(data.cursoId, "Curso");
        this.textoObrigatorio(data.periodoLetivoId, "Periodo letivo");

        const curso = await this.cursoRepository.buscarCursoRegistroPorId(data.cursoId);

        if (!curso) {
            throw erroEstruturaAcademica.naoEncontrado("Curso nao encontrado");
        }

        const periodoLetivo = await this.periodoLetivoRepository.buscarPeriodoLetivoRegistroPorId(data.periodoLetivoId);

        if (!periodoLetivo) {
            throw erroEstruturaAcademica.naoEncontrado("Periodo letivo nao encontrado");
        }

        const statusPeriodo = String(periodoLetivo.status ?? "").toLowerCase();

        if (exigirPeriodoDisponivel && (!periodoLetivo.ativo || !STATUS_PERIODO_DISPONIVEL.includes(statusPeriodo))) {
            throw erroEstruturaAcademica.periodoIndisponivel(
                "O periodo letivo selecionado nao esta disponivel para criacao ou transferencia de turmas"
            );
        }

        const capacidade = Number(data.capacidadeAlunos);

        if (!Number.isInteger(capacidade) || capacidade <= 0) {
            throw erroEstruturaAcademica.invalido("Capacidade de alunos deve ser um numero inteiro maior que zero");
        }

        const periodoCurricular = Number(data.periodoCurricular);

        if (!Number.isInteger(periodoCurricular) || periodoCurricular < 1 || periodoCurricular > 12) {
            throw erroEstruturaAcademica.invalido("Periodo curricular deve estar entre 1 e 12");
        }

        this.textoObrigatorio(data.descricao, "Descricao");
        this.textoObrigatorio(data.sigla, "Sigla");

        this.normalizarTurno(data.turno);

        const status = String(data.status ?? "ativa").trim().toLowerCase();
        if (!STATUS_TURMA.includes(status)) {
            throw erroEstruturaAcademica.invalido("Status da turma invalido");
        }
    }

    async criarTurma(data: any) {
        await this.validarRelacionamentos(data, true);

        const sigla = this.textoObrigatorio(data.sigla, "Sigla").toUpperCase();

        const turmaExistente = await this.turmaRepository.buscarTurmaPorChave(
            data.periodoLetivoId,
            data.cursoId,
            sigla
        );

        if (turmaExistente) {
            throw erroEstruturaAcademica.conflito("Ja existe turma com esta sigla para o curso e periodo letivo informados");
        }

        const turma: TurmaCommand = {
            id: uuidv4(),
            periodo_letivo_id: data.periodoLetivoId,
            curso_id: data.cursoId,
            periodo_curricular: Number(data.periodoCurricular),
            descricao: this.textoObrigatorio(data.descricao, "Descricao"),
            sigla,
            capacidade_alunos: Number(data.capacidadeAlunos),
            turno: this.normalizarTurno(data.turno),
            status: String(data.status ?? "ativa").toLowerCase()
        };

        return await this.turmaRepository.criarTurma(turma);
    }

    async listarTurmas() {
        return await this.turmaRepository.listarTurmas();
    }

    async buscarTurmaPorId(id: string) {
        const turma = await this.turmaRepository.buscarTurmaPorId(id);

        if (!turma) {
            return null;
        }

        const uso = await this.turmaRepository.obterUsoDaTurma(id);

        const estruturaBloqueada = uso.disciplinas > 0 || uso.matriculas > 0;

        return {
            ...turma,
            ocupacao_alunos: uso.ocupacao,
            estrutura_bloqueada: estruturaBloqueada,
            motivo_bloqueio_estrutura: estruturaBloqueada
                ? `Curso e periodo letivo nao podem ser alterados: a turma possui ${uso.disciplinas} disciplina(s) e ${uso.matriculas} matricula(s).`
                : null
        };
    }

    async atualizarTurma(id: string, data: any) {
        const turmaAtual = await this.turmaRepository.buscarTurmaPorId(id);

        if (!turmaAtual) {
            return null;
        }

        const payload = {
            periodoLetivoId: data.periodoLetivoId ?? turmaAtual.periodo_letivo.id,
            cursoId: data.cursoId ?? turmaAtual.curso.id,
            periodoCurricular: data.periodoCurricular ?? turmaAtual.periodo_curricular,
            descricao: data.descricao ?? turmaAtual.descricao,
            sigla: data.sigla ?? turmaAtual.sigla,
            capacidadeAlunos: data.capacidadeAlunos ?? turmaAtual.capacidade_alunos,
            turno: data.turno ?? turmaAtual.turno,
            status: data.status ?? turmaAtual.status
        };

        const alterouPeriodo = payload.periodoLetivoId !== turmaAtual.periodo_letivo.id;
        const alterouCurso = payload.cursoId !== turmaAtual.curso.id;

        await this.validarRelacionamentos(payload, alterouPeriodo);

        const uso = await this.turmaRepository.obterUsoDaTurma(id);

        const statusAtual = String(turmaAtual.status).toLowerCase();
        const proximoStatus = String(payload.status).toLowerCase();
        if (!(TRANSICOES_TURMA[statusAtual] ?? [statusAtual]).includes(proximoStatus)) {
            throw erroEstruturaAcademica.conflito(
                `Transicao de status da turma de ${turmaAtual.status} para ${payload.status} nao e permitida`
            );
        }

        if ((alterouPeriodo || alterouCurso) && (uso.disciplinas > 0 || uso.matriculas > 0)) {
            throw erroEstruturaAcademica.turmaEmUso(
                `Curso e periodo letivo nao podem ser alterados: a turma possui ${uso.disciplinas} disciplina(s) e ${uso.matriculas} matricula(s).`
            );
        }

        if (Number(payload.capacidadeAlunos) < uso.ocupacao) {
            throw erroEstruturaAcademica.conflito(
                `A capacidade nao pode ser inferior a ocupacao atual de ${uso.ocupacao} aluno(s)`
            );
        }

        const sigla = this.textoObrigatorio(payload.sigla, "Sigla").toUpperCase();

        if (
            alterouPeriodo ||
            alterouCurso ||
            sigla !== turmaAtual.sigla
        ) {
            const turmaExistente = await this.turmaRepository.buscarTurmaPorChave(
                payload.periodoLetivoId,
                payload.cursoId,
                sigla
            );

            if (turmaExistente) {
                throw erroEstruturaAcademica.conflito("Ja existe turma com esta sigla para o curso e periodo letivo informados");
            }
        }

        return await this.turmaRepository.atualizarTurma(id, {
            periodo_letivo_id: payload.periodoLetivoId,
            curso_id: payload.cursoId,
            periodo_curricular: Number(payload.periodoCurricular),
            descricao: this.textoObrigatorio(payload.descricao, "Descricao"),
            sigla,
            capacidade_alunos: Number(payload.capacidadeAlunos),
            turno: this.normalizarTurno(payload.turno),
            status: String(payload.status).toLowerCase()
        });
    }

    async removerTurma(id: string) {
        const turma = await this.turmaRepository.buscarTurmaRegistroPorId(id);

        if (!turma) {
            return 0;
        }

        const uso = await this.turmaRepository.obterUsoDaTurma(id);
        if (uso.disciplinas > 0 || uso.matriculas > 0) {
            throw erroEstruturaAcademica.turmaEmUso(
                `A turma possui ${uso.disciplinas} disciplina(s) e ${uso.matriculas} matricula(s). Cancele a turma para preservar o historico.`
            );
        }

        return await this.turmaRepository.removerTurma(id);
    }
}
