import { MatriculaService } from "../service/MatriculaService";
import { MatriculaError } from "../errors/MatriculaError";

const service = new MatriculaService();

function responderErro(res: any, err: any, contexto: string) {
    if (err instanceof MatriculaError) {
        return res.status(err.status).json({ error: err.message });
    }
    console.error(`[matricula] ${contexto}:`, err);
    return res.status(500).json({ error: "Erro interno ao processar a solicitação de matrícula." });
}

export class MatriculaController {

    async listarTurmasDisponiveis(req: any, res: any) {
        try {
            res.status(200).json(await service.listarTurmasDisponiveis(req.params.cursoId));
        } catch (err) {
            responderErro(res, err, "listarTurmasDisponiveis");
        }
    }

    async listarDisciplinasDaTurma(req: any, res: any) {
        try {
            res.status(200).json(await service.listarDisciplinasDaTurma(req.params.turmaId));
        } catch (err) {
            responderErro(res, err, "listarDisciplinasDaTurma");
        }
    }

    async criarMatricula(req: any, res: any) {
        try {
            const { alunoId, turmaId, turmaDisciplinaIds } = req.body ?? {};
            res.status(201).json(await service.criarMatricula(alunoId, turmaId, turmaDisciplinaIds));
        } catch (err) {
            responderErro(res, err, "criarMatricula");
        }
    }

    async listarTodas(_req: any, res: any) {
        try {
            res.status(200).json(await service.listarTodas());
        } catch (err) {
            responderErro(res, err, "listarTodas");
        }
    }

    async listarPorAluno(req: any, res: any) {
        try {
            res.status(200).json(await service.listarPorAluno(req.params.alunoId));
        } catch (err) {
            responderErro(res, err, "listarPorAluno");
        }
    }

    async listarVinculos(req: any, res: any) {
        try {
            res.status(200).json(await service.listarVinculos(req.params.id));
        } catch (err) {
            responderErro(res, err, "listarVinculos");
        }
    }

    async consultarStatus(req: any, res: any) {
        try {
            const numeroMatricula = Number(req.params.matricula);
            if (!Number.isInteger(numeroMatricula)) {
                return res.status(400).json({ error: "Número de matrícula deve ser um inteiro." });
            }
            res.status(200).json(await service.consultarPorNumeroMatricula(numeroMatricula));
        } catch (err) {
            responderErro(res, err, "consultarStatus");
        }
    }

    async cancelar(req: any, res: any) {
        try {
            res.status(200).json(await service.cancelar(req.params.id));
        } catch (err) {
            responderErro(res, err, "cancelar");
        }
    }

    async aprovar(req: any, res: any) {
        try {
            res.status(200).json(await service.aprovar(req.params.id));
        } catch (err) {
            responderErro(res, err, "aprovar");
        }
    }

    async atualizarStatus(req: any, res: any) {
        try {
            const { status } = req.body ?? {};
            if (!status) return res.status(400).json({ error: 'Campo "status" é obrigatório.' });
            res.status(200).json(await service.atualizarStatus(req.params.id, status));
        } catch (err) {
            responderErro(res, err, "atualizarStatus");
        }
    }

    async adicionarDisciplinas(req: any, res: any) {
        try {
            const { turmaDisciplinaIds } = req.body ?? {};
            res.status(201).json(await service.adicionarDisciplinas(req.params.id, turmaDisciplinaIds));
        } catch (err) {
            responderErro(res, err, "adicionarDisciplinas");
        }
    }

    async cancelarVinculo(req: any, res: any) {
        try {
            res.status(200).json(await service.cancelarVinculo(req.params.id, req.params.vinculoId));
        } catch (err) {
            responderErro(res, err, "cancelarVinculo");
        }
    }
}
