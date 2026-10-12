import type { ExecutorAcademico } from "../../modulo-estrutura-academica/gateways/TransacaoAcademica";
import { ErroPontuacao, type ContextoRegraPontuacao } from "../models/RegraPontuacao";

export interface OfertaPontuacao {
  id: string;
  curso_id: string;
  periodo_letivo_id: string;
  turma_id: string;
  curso_disciplina_id: string;
  professor_id: string | null;
  regra_pontuacao_id: string | null;
  pontuacao_vinculada_em: Date | null;
  status: string;
  turma_status: string;
  periodo_status: string;
  periodo_ativo: boolean;
  professor_usuario_id: string | null;
  professor_ativo: boolean | null;
}

export function exigirPerfilRegra(contexto: ContextoRegraPontuacao, escrita = false): void {
  const permitidos = escrita ? ["secretaria", "administrador"] : ["secretaria", "administrador", "professor"];
  if (!permitidos.includes(contexto.tipoUsuario)) {
    throw new ErroPontuacao(403, "PERFIL_PROIBIDO", "Seu perfil não permite esta operação.");
  }
}

export class RegraPontuacaoAuthGateway {
  async autorizarPar(executor: ExecutorAcademico, contexto: ContextoRegraPontuacao,
    cursoId: string, periodoId: string, escrita = false): Promise<void> {
    exigirPerfilRegra(contexto, escrita);
    // A atribuição é verificada antes de consultar a existência da regra alheia.
    if (contexto.tipoUsuario === "professor") {
      const atribuicao = await executor("piv.turma_disciplina as td")
        .join("piv.turma as t", "t.id", "td.turma_id")
        .join("piv.professor as p", "p.id", "td.professor_id")
        .where({ "t.curso_id": cursoId, "t.periodo_letivo_id": periodoId,
          "p.usuario_id": contexto.usuarioId, "p.ativo": true }).first("td.id");
      if (!atribuicao) throw new ErroPontuacao(403, "ESCOPO_PROIBIDO", "Você não tem acesso a esta configuração.");
    }
    const curso = await executor("piv.curso").where({ id: cursoId }).first("id");
    const periodo = await executor("piv.periodo_letivo").where({ id: periodoId }).first("id");
    if (!curso || !periodo) throw new ErroPontuacao(404, "REGISTRO_NAO_ENCONTRADO", "Curso ou período letivo não encontrado.");
  }

  async buscarOferta(executor: ExecutorAcademico, ofertaId: string): Promise<OfertaPontuacao | undefined> {
    return executor("piv.turma_disciplina as td")
      .join("piv.turma as t", "t.id", "td.turma_id")
      .join("piv.periodo_letivo as pl", "pl.id", "t.periodo_letivo_id")
      .leftJoin("piv.professor as p", "p.id", "td.professor_id")
      .select("td.*", "t.curso_id", "t.periodo_letivo_id", "t.status as turma_status",
        "pl.status as periodo_status", "pl.ativo as periodo_ativo",
        "p.usuario_id as professor_usuario_id", "p.ativo as professor_ativo")
      .where("td.id", ofertaId).first();
  }

  async autorizarOferta(executor: ExecutorAcademico, contexto: ContextoRegraPontuacao,
    ofertaId: string): Promise<OfertaPontuacao> {
    exigirPerfilRegra(contexto);
    const oferta = await this.buscarOferta(executor, ofertaId);
    if (contexto.tipoUsuario === "professor" && (!oferta ||
      oferta.professor_usuario_id !== contexto.usuarioId || oferta.professor_ativo !== true)) {
      throw new ErroPontuacao(403, "ESCOPO_PROIBIDO", "Você não tem acesso a esta oferta.");
    }
    if (!oferta) throw new ErroPontuacao(404, "REGISTRO_NAO_ENCONTRADO", "Oferta não encontrada.");
    return oferta;
  }
}
