import type { Request, Response } from 'express';
import { professorService } from '../services/professorServices.js';
import { ProfessorError } from '../errors/professorErrors.js';

function responderErro(res: Response, erro: unknown, contexto: string) {
  if (erro instanceof ProfessorError) return res.status(erro.status).json({ mensagem: erro.message });
  console.error(contexto, erro);
  return res.status(500).json({ mensagem: 'Erro interno do servidor.' });
}

async function listarTodos(req: Request, res: Response) {
  try {
    const ativo = req.query.ativo === undefined ? undefined : req.query.ativo === 'true' ? true : req.query.ativo === 'false' ? false : undefined;
    if (req.query.ativo !== undefined && ativo === undefined) return res.status(400).json({ mensagem: 'Filtro ativo inválido.' });
    return res.json(await professorService.listarTodos({ ativo }));
  } catch (erro) { return responderErro(res, erro, 'Erro ao listar professores'); }
}

async function listarOpcoes(_req: Request, res: Response) {
  try { return res.json(await professorService.listarOpcoes()); }
  catch (erro) { return responderErro(res, erro, 'Erro ao listar opções de professores'); }
}

async function buscarPorId(req: Request, res: Response) {
  try { return res.json(await professorService.buscarPorId(String(req.params.id))); }
  catch (erro) { return responderErro(res, erro, 'Erro ao buscar professor'); }
}

async function criar(req: Request, res: Response) {
  try { return res.status(201).json(await professorService.criar(req.body)); }
  catch (erro) { return responderErro(res, erro, 'Erro ao criar professor'); }
}

async function atualizar(req: Request, res: Response) {
  try { return res.json(await professorService.atualizar(String(req.params.id), req.body)); }
  catch (erro) { return responderErro(res, erro, 'Erro ao atualizar professor'); }
}

async function inativar(req: Request, res: Response) {
  try { await professorService.definirAtivo(String(req.params.id), false); return res.status(204).send(); }
  catch (erro) { return responderErro(res, erro, 'Erro ao inativar professor'); }
}

async function reativar(req: Request, res: Response) {
  try { return res.json(await professorService.definirAtivo(String(req.params.id), true)); }
  catch (erro) { return responderErro(res, erro, 'Erro ao reativar professor'); }
}

export const professorController = { listarTodos, listarOpcoes, buscarPorId, criar, atualizar, inativar, reativar };
