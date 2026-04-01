import { Router, Request, Response } from 'express';

const alunoController = Router();

const alunosMockados = [
  {
    id: '1',
    nome: 'Ana Clara Souza',
    matricula: '2026001',
    email: 'ana.clara@escola.test',
    cpf: '123.456.789-00',
    dataNascimento: '2008-04-12',
    turma: '1A',
    status: 'ativo',
  },
  {
    id: '2',
    nome: 'Bruno Henrique Lima',
    matricula: '2026002',
    email: 'bruno.lima@escola.test',
    cpf: '987.654.321-00',
    dataNascimento: '2007-11-03',
    turma: '2B',
    status: 'ativo',
  },
  {
    id: '3',
    nome: 'Carla Mendes Rocha',
    matricula: '2026003',
    email: 'carla.rocha@escola.test',
    cpf: '456.789.123-00',
    dataNascimento: '2008-01-27',
    turma: '1A',
    status: 'inativo',
  },
];

alunoController.get('/', (_request: Request, response: Response) => {
  response.status(200).json(alunosMockados);
});

alunoController.get('/:id', (request: Request, response: Response) => {
  const aluno = alunosMockados.find(({ id }) => id === request.params.id);

  if (!aluno) {
    return response.status(404).json({
      message: 'Aluno nao encontrado.',
    });
  }

  return response.status(200).json(aluno);
});

export { alunoController };
