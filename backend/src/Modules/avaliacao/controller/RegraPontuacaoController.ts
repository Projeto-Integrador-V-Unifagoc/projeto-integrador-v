import type { Request, Response } from "express";
import db from "../../../database/index";
import { ConflitoAcademico } from "../../modulo-estrutura-academica/gateways/TransacaoAcademica";
import { ErroPontos } from "../models/Pontos";
import { ErroPontuacao } from "../models/RegraPontuacao";
import { RegraPontuacaoRepository } from "../repository/RegraPontuacaoRepository";
import { RegraPontuacaoService } from "../services/RegraPontuacaoService";
import { registrarFalhaAcademica, type OperacaoAcademica } from "../../../observabilidade/falhaAcademica";

const service = new RegraPontuacaoService(new RegraPontuacaoRepository(db));
export const contextoPontuacao = (req: Request) => {
  const usuario = (req as Request & { user: { id: string; tipo_usuario: string } }).user;
  return { usuarioId: usuario.id, tipoUsuario: usuario.tipo_usuario };
};

export function responderErroPontuacao(res: Response, erro: unknown, operacao: OperacaoAcademica = "pontuacao.operacao") {
  if (erro instanceof ErroPontuacao || erro instanceof ConflitoAcademico) {
    return res.status(erro.status).json({ codigo: erro.codigo, mensagem: erro.message,
      campos: erro instanceof ErroPontuacao ? erro.campos : [] });
  }
  if (erro instanceof ErroPontos) {
    return res.status(400).json({ codigo: erro.codigo, mensagem: erro.message,
      campos: erro.campo ? [{ campo: erro.campo, codigo: erro.codigo, mensagem: erro.message }] : [] });
  }
  registrarFalhaAcademica(res, operacao, erro);
  return res.status(500).json({ codigo: "FALHA_INTERNA", mensagem: "Não foi possível concluir a operação." });
}

export const regraPontuacaoController = {
  async buscar(req: Request, res: Response) {
    try { return res.json(await service.buscar(String(req.params.cursoId), String(req.params.periodoLetivoId), contextoPontuacao(req))); }
    catch (erro) { return responderErroPontuacao(res, erro); }
  },
  async salvar(req: Request, res: Response) {
    try {
      const resultado = await service.salvar(String(req.params.cursoId), String(req.params.periodoLetivoId), req.body, contextoPontuacao(req));
      return res.status(resultado.criada ? 201 : 200).json(resultado.regra);
    } catch (erro) { return responderErroPontuacao(res, erro); }
  },
};
