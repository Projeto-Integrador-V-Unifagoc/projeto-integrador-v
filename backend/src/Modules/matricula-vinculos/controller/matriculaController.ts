import { Request, Response } from 'express';
import { MatriculaService } from '../services/matriculaService';

const service = new MatriculaService();

export class MatriculaController {

  async listarTodas(_req: Request, res: Response) {
    const matriculas = await service.listarTodas();
    return res.status(200).json(matriculas);
  }

  async listarPorAluno(req: Request, res: Response) {
    const { alunoId } = req.params;
    const matriculas = await service.listarPorAluno(alunoId);
    return res.status(200).json(matriculas);
  }

  async criarMatricula(req: Request, res: Response) {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ message: 'Body JSON ausente. Envie Content-Type: application/json.' });
    }
    const matricula = await service.matricularNovoAluno(req.body);
    return res.status(201).json(matricula);
  }
}
