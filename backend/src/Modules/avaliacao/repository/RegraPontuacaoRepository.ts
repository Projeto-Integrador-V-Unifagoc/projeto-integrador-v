import { randomUUID } from "node:crypto";
import type { Knex } from "knex";
import { snapshotAcademico, transacaoAcademica, type ExecutorAcademico } from "../../modulo-estrutura-academica/gateways/TransacaoAcademica";
import { RegraPontuacaoAuthGateway } from "../gateways/RegraPontuacaoAuthGateway";
import { formatarPontos, parsePontos } from "../models/Pontos";
import { ErroPontuacao, type ContextoRegraPontuacao, type RegraPontuacao, type SalvarRegraPontuacaoRequest, type SubgrupoAvaliacao } from "../models/RegraPontuacao";
import { validarVersaoRegra } from "../services/RegraPontuacaoService";

const iso = (valor: Date | string) => new Date(valor).toISOString();
const pontos = (valor: string) => formatarPontos(parsePontos(valor));

export class RegraPontuacaoRepository {
  constructor(readonly banco: Knex, readonly auth = new RegraPontuacaoAuthGateway()) {}

  async lerPorPar(cursoId: string, periodoId: string, executor: ExecutorAcademico): Promise<RegraPontuacao | null> {
    const linha = await executor("piv.regra_pontuacao").where({ curso_id: cursoId, periodo_letivo_id: periodoId }).first();
    return linha ? this.documento(linha, executor) : null;
  }

  private async documento(linha: Record<string, any>, executor: ExecutorAcademico): Promise<RegraPontuacao> {
    const grupos = await executor("piv.subgrupo_avaliacao").where({ regra_pontuacao_id: linha.id }).orderBy(["ordem", "id"]);
    const subgrupos: SubgrupoAvaliacao[] = grupos.map((g) => ({ id: g.id, nome: g.nome,
      orcamentoPontos: pontos(g.orcamento_pontos), modoQuantidade: g.modo_quantidade,
      quantidadeFixa: g.quantidade_fixa, ordem: g.ordem }));
    return { id: linha.id, cursoId: linha.curso_id, periodoLetivoId: linha.periodo_letivo_id,
      totalPontos: pontos(linha.total_pontos), origem: linha.origem, versao: linha.versao,
      estado: linha.usada_em ? "PRESERVADA" : "DISPONIVEL", usadaEm: linha.usada_em ? iso(linha.usada_em) : null,
      criadaEm: iso(linha.created_at), atualizadaEm: iso(linha.updated_at),
      criadaPorUsuarioId: linha.criada_por_usuario_id, atualizadaPorUsuarioId: linha.atualizada_por_usuario_id, subgrupos };
  }

  async buscar(cursoId: string, periodoId: string, contexto: ContextoRegraPontuacao): Promise<RegraPontuacao | null> {
    return snapshotAcademico(this.banco, async (trx) => {
      await this.auth.autorizarPar(trx, contexto, cursoId, periodoId);
      return this.lerPorPar(cursoId, periodoId, trx);
    });
  }

  async salvar(cursoId: string, periodoId: string, dados: SalvarRegraPontuacaoRequest,
    contexto: ContextoRegraPontuacao): Promise<{ criada: boolean; regra: RegraPontuacao }> {
    try {
      return await transacaoAcademica(this.banco, {
        descobrir: async (trx) => {
          const regra = await trx("piv.regra_pontuacao").where({ curso_id: cursoId, periodo_letivo_id: periodoId }).first("id");
          return { periodos: [periodoId], regras: regra ? [regra.id] : [] };
        },
      }, async (trx, alvos) => {
        await this.auth.autorizarPar(trx, contexto, cursoId, periodoId, true);
        const anterior = await this.lerPorPar(cursoId, periodoId, trx);
        // Uma criação pode comitar durante a autorização, depois da releitura
        // do protocolo. Nunca validar/escrever uma regra fora dos locks obtidos.
        if (anterior && !alvos.regras.includes(anterior.id)) {
          throw Object.assign(new Error("Alvo de pontuação alterado."), { code: "40001" });
        }
        validarVersaoRegra(anterior, dados.versaoEsperada);
        const idsAtuais = new Set(anterior?.subgrupos.map((g) => g.id));
        dados.subgrupos.forEach((g, i) => {
          if (g.id && !idsAtuais.has(g.id)) throw new ErroPontuacao(400, "UUID_INVALIDO", "O subgrupo não pertence a esta regra.", `subgrupos[${i}].id`);
        });
        const id = anterior?.id ?? randomUUID();
        if (anterior) {
          await trx("piv.regra_pontuacao").where({ id }).update({ total_pontos: dados.totalPontos,
            versao: anterior.versao + 1, atualizada_por_usuario_id: contexto.usuarioId, updated_at: trx.fn.now() });
        } else {
          await trx("piv.regra_pontuacao").insert({ id, curso_id: cursoId, periodo_letivo_id: periodoId,
            total_pontos: dados.totalPontos, origem: "CONFIGURADA", versao: 1,
            criada_por_usuario_id: contexto.usuarioId, atualizada_por_usuario_id: contexto.usuarioId });
        }
        const conservados = dados.subgrupos.flatMap((g) => g.id ? [g.id] : []);
        await trx("piv.subgrupo_avaliacao").where({ regra_pontuacao_id: id }).whereNotIn("id", conservados).delete();
        for (const g of dados.subgrupos) {
          const linha = { nome: g.nome, orcamento_pontos: g.orcamentoPontos, modo_quantidade: g.modoQuantidade,
            quantidade_fixa: g.quantidadeFixa, ordem: g.ordem };
          if (g.id) await trx("piv.subgrupo_avaliacao").where({ id: g.id, regra_pontuacao_id: id }).update(linha);
          else await trx("piv.subgrupo_avaliacao").insert({ id: randomUUID(), regra_pontuacao_id: id, ...linha });
        }
        const regra = (await this.lerPorPar(cursoId, periodoId, trx))!;
        await trx("piv.regra_pontuacao_auditoria").insert({ regra_pontuacao_id: id, usuario_id: contexto.usuarioId,
          perfil: contexto.tipoUsuario, acao: anterior ? "ALTERACAO" : "CRIACAO", anterior, novo: regra });
        return { criada: !anterior, regra };
      });
    } catch (erro) {
      const codigo = (erro as { code?: string }).code;
      if (codigo === "23505") throw new ErroPontuacao(409, "VERSAO_OBSOLETA", "A configuração mudou. Recarregue a regra antes de salvar.");
      if (codigo === "23503") throw new ErroPontuacao(404, "REGISTRO_NAO_ENCONTRADO", "Um registro necessário não está disponível.");
      throw erro;
    }
  }

  /** Usar somente no callback de T010, após locks de regra/oferta e autorização. */
  async vincularPrimeiroUso(trx: Knex.Transaction, ofertaId: string, contexto: ContextoRegraPontuacao): Promise<RegraPontuacao> {
    const oferta = await this.auth.autorizarOferta(trx, contexto, ofertaId);
    const anterior = await this.lerPorPar(oferta.curso_id, oferta.periodo_letivo_id, trx);
    if (!anterior) throw new ErroPontuacao(409, "REGRA_AUSENTE", "Configure a pontuação do curso neste período antes de criar avaliações.");
    if (oferta.regra_pontuacao_id && oferta.regra_pontuacao_id !== anterior.id) {
      throw new ErroPontuacao(409, "VINCULO_PRESERVADO", "O vínculo de pontuação desta oferta está preservado.");
    }
    if (!oferta.pontuacao_vinculada_em) {
      await trx("piv.regra_pontuacao").where({ id: anterior.id }).whereNull("usada_em").update({ usada_em: trx.fn.now() });
      await trx("piv.turma_disciplina").where({ id: ofertaId }).update({ regra_pontuacao_id: anterior.id, pontuacao_vinculada_em: trx.fn.now() });
      const novo = (await this.lerPorPar(oferta.curso_id, oferta.periodo_letivo_id, trx))!;
      await trx("piv.regra_pontuacao_auditoria").insert({ regra_pontuacao_id: anterior.id,
        usuario_id: contexto.usuarioId, perfil: contexto.tipoUsuario, acao: "PRIMEIRO_USO",
        anterior, novo: { ...novo, turmaDisciplinaId: ofertaId } });
      return novo;
    }
    return anterior;
  }
}
