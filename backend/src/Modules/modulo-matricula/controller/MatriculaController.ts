import { Request, Response } from "express";
import { MatriculaService } from "../service/MatriculaService";
import { MatriculaError } from "../errors/MatriculaError";

const service = new MatriculaService();

function responderErro(res: Response, err: unknown, contexto: string) {
    if (err instanceof MatriculaError) {
        return res.status(err.status).json({ error: err.message });
    }
    console.error(`[matricula] ${contexto}:`, err);
    return res.status(500).json({ error: "Erro interno ao processar a solicitação de matrícula." });
}

export class MatriculaController {

    async listarTurmasDisponiveis(req: Request, res: Response) {
        try {
            res.status(200).json(await service.listarTurmasDisponiveis(String(req.params.cursoId)));
        } catch (err) {
            responderErro(res, err, "listarTurmasDisponiveis");
        }
    }

    async listarDisciplinasDaTurma(req: Request, res: Response) {
        try {
            res.status(200).json(await service.listarDisciplinasDaTurma(String(req.params.turmaId)));
        } catch (err) {
            responderErro(res, err, "listarDisciplinasDaTurma");
        }
    }

    async criarMatricula(req: Request, res: Response) {
        try {
            const { alunoId, turmaId, turmaDisciplinaIds } = req.body ?? {};
            res.status(201).json(await service.criarMatricula(alunoId, turmaId, turmaDisciplinaIds));
        } catch (err) {
            responderErro(res, err, "criarMatricula");
        }
    }

    async listarTodas(_req: Request, res: Response) {
        try {
            res.status(200).json(await service.listarTodas());
        } catch (err) {
            responderErro(res, err, "listarTodas");
        }
    }

    async listarPorAluno(req: Request, res: Response) {
        try {
            res.status(200).json(await service.listarPorAluno(String(req.params.alunoId)));
        } catch (err) {
            responderErro(res, err, "listarPorAluno");
        }
    }

    async listarVinculos(req: Request, res: Response) {
        try {
            res.status(200).json(await service.listarVinculos(String(req.params.id)));
        } catch (err) {
            responderErro(res, err, "listarVinculos");
        }
    }

    async consultarStatus(req: Request, res: Response) {
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

    async cancelar(req: Request, res: Response) {
        try {
            res.status(200).json(await service.cancelar(String(req.params.id)));
        } catch (err) {
            responderErro(res, err, "cancelar");
        }
    }

    async aprovar(req: Request, res: Response) {
        try {
            res.status(200).json(await service.aprovar(String(req.params.id)));
        } catch (err) {
            responderErro(res, err, "aprovar");
        }
    }

    async atualizarStatus(req: Request, res: Response) {
        try {
            const { status } = req.body ?? {};
            if (!status) return res.status(400).json({ error: 'Campo "status" é obrigatório.' });
            res.status(200).json(await service.atualizarStatus(String(req.params.id), status));
        } catch (err) {
            responderErro(res, err, "atualizarStatus");
        }
    }

    async adicionarDisciplinas(req: Request, res: Response) {
        try {
            const { turmaDisciplinaIds } = req.body ?? {};
            res.status(201).json(await service.adicionarDisciplinas(String(req.params.id), turmaDisciplinaIds));
        } catch (err) {
            responderErro(res, err, "adicionarDisciplinas");
        }
    }

    async cancelarVinculo(req: Request, res: Response) {
        try {
            res.status(200).json(await service.cancelarVinculo(String(req.params.id), String(req.params.vinculoId)));
        } catch (err) {
            responderErro(res, err, "cancelarVinculo");
        }
    }
}
