import { Request, Response } from 'express';
import { MatriculaService } from '../services/matriculaService';

const service = new MatriculaService();

export class MatriculaController {

  async listarTodas(_req: Request, res: Response) {
    try {
      const matriculas = await service.listarTodas();
      return res.status(200).json(matriculas);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  async listarTodasComDetalhes(_req: Request, res: Response) {
    try {
      const matriculas = await service.listarTodasComDetalhes();
      return res.status(200).json(matriculas);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  async listarPorAluno(req: Request, res: Response) {
    try {
      const { alunoId } = req.params;
      const matriculas = await service.listarPorAluno(alunoId);
      return res.status(200).json(matriculas);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  async listarPorAlunoComDetalhes(req: Request, res: Response) {
    try {
      const { alunoId } = req.params;
      const matriculas = await service.listarPorAlunoComDetalhes(alunoId);
      return res.status(200).json(matriculas);
    } catch (err: any) {
      return res.status(500).json({ message: err.message });
    }
  }

  async buscarPorId(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const matricula = await service.buscarPorId(id);
      return res.status(200).json(matricula);
    } catch (err: any) {
      const status = err.message.includes('não encontrada') ? 404 : 500;
      return res.status(status).json({ message: err.message });
    }
  }

  async buscarAluno(req: Request, res: Response) {
    try {
      const query = req.query.q as string;
      if (!query) {
        return res.status(400).json({ message: 'Parâmetro "q" é obrigatório (CPF ou matrícula).' });
      }
      const alunos = await service.buscarAluno(query);
      return res.status(200).json(alunos);
    } catch (err: any) {
      const status = err.message.includes('ao menos') ? 400 : 500;
      return res.status(status).json({ message: err.message });
    }
  }

  async buscarAlunoPorId(req: Request, res: Response) {
    try {
      const { alunoId } = req.params;
      const aluno = await service.buscarAlunoPorId(alunoId);
      return res.status(200).json(aluno);
    } catch (err: any) {
      const status = err.message.includes('não encontrado') ? 404 : 500;
      return res.status(status).json({ message: err.message });
    }
  }

  async listarTurmasDisponiveis(req: Request, res: Response) {
    try {
      const { cursoId } = req.params;
      const turmas = await service.listarTurmasDisponiveis(cursoId);
      return res.status(200).json(turmas);
    } catch (err: any) {
      return res.status(400).json({ message: err.message });
    }
  }

  async criarMatricula(req: Request, res: Response) {
    try {
      if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ message: 'Body JSON ausente. Envie Content-Type: application/json.' });
      }
      const matricula = await service.matricularNovoAluno(req.body);
      return res.status(201).json(matricula);
    } catch (err: any) {
      const status = err.message.includes('não encontrado') || err.message.includes('não há')
        ? 404
        : err.message.includes('já está matriculado') || err.message.includes('obrigatório')
          ? 400
          : 500;
      return res.status(status).json({ message: err.message });
    }
  }

  async cancelarMatricula(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const matricula = await service.cancelarMatricula(id);
      return res.status(200).json(matricula);
    } catch (err: any) {
      const status = err.message.includes('não encontrada') ? 404
        : err.message.includes('já está cancelada') ? 409
          : 500;
      return res.status(status).json({ message: err.message });
    }
  }

  async atualizarStatus(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { status } = req.body;
      if (!status) {
        return res.status(400).json({ message: 'Campo "status" é obrigatório no body.' });
      }
      const matricula = await service.atualizarStatus(id, status);
      return res.status(200).json(matricula);
    } catch (err: any) {
      const status = err.message.includes('não encontrada') ? 404
        : err.message.includes('inválido') ? 400
          : 500;
      return res.status(status).json({ message: err.message });
    }
  }
}
