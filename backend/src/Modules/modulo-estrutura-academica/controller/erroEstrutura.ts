import type { Response } from "express";
import { EstruturaPreservada, ValidacaoEstrutura } from "../gateways/EscritaEstruturaAcademica";
import { ConflitoAcademico } from "../gateways/TransacaoAcademica";
import { registrarFalhaAcademica } from "../../../observabilidade/falhaAcademica";

export function responderErroEstrutura(res: Response, erro: unknown) {
  if (erro instanceof EstruturaPreservada || erro instanceof ConflitoAcademico) {
    return res.status(erro.status).json({ codigo: erro.codigo, mensagem: erro.message, error: erro.message });
  }
  if (erro instanceof ValidacaoEstrutura) return res.status(400).json({ codigo: erro.codigo, mensagem: erro.message, error: erro.message });
  const codigo = (erro as { code?: string } | null)?.code;
  if (codigo === "23505") return res.status(409).json({ codigo: "VINCULO_DUPLICADO", mensagem: "Já existe um vínculo com estes dados.", error: "Já existe um vínculo com estes dados." });
  registrarFalhaAcademica(res, "estrutura.operacao", erro);
  return res.status(500).json({ codigo: "ERRO_INTERNO", mensagem: "Erro interno do servidor.", error: "Erro interno do servidor." });
}
