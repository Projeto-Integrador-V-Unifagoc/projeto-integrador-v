import { formatarPontos, parsePontos, somarPontos } from "../models/Pontos";
import {
  ErroPontuacao, validarUuidPontuacao,
  type RegraPontuacao, type SalvarRegraPontuacaoRequest,
} from "../models/RegraPontuacao";
import { exigirPerfilRegra } from "../gateways/RegraPontuacaoAuthGateway";
import type { ContextoRegraPontuacao } from "../models/RegraPontuacao";
import type { RegraPontuacaoRepository } from "../repository/RegraPontuacaoRepository";

export class RegraPontuacaoService {
  constructor(private readonly repository: RegraPontuacaoRepository) {}

  async buscar(cursoId: string, periodoId: string, contexto: ContextoRegraPontuacao): Promise<RegraPontuacao> {
    exigirPerfilRegra(contexto);
    validarUuidPontuacao(cursoId, "cursoId");
    validarUuidPontuacao(periodoId, "periodoLetivoId");
    const regra = await this.repository.buscar(cursoId, periodoId, contexto);
    if (!regra) throw new ErroPontuacao(404, "REGRA_AUSENTE", "Este curso ainda não possui pontuação configurada neste período.");
    return regra;
  }

  async salvar(cursoId: string, periodoId: string, dados: unknown, contexto: ContextoRegraPontuacao) {
    exigirPerfilRegra(contexto, true);
    validarUuidPontuacao(cursoId, "cursoId");
    validarUuidPontuacao(periodoId, "periodoLetivoId");
    return this.repository.salvar(cursoId, periodoId, validarComposicaoRegra(dados), contexto);
  }
}

function inteiro(valor: unknown, minimo: number, campo: string): asserts valor is number {
  if (typeof valor !== "number" || !Number.isSafeInteger(valor) || valor < minimo || valor > 2_147_483_647) {
    throw new ErroPontuacao(400, "QUANTIDADE_INVALIDA", "Informe uma quantidade inteira válida.", campo);
  }
}

/** Corpo completo. Pontos permanecem textuais; campos de autoria são ignorados. */
export function validarComposicaoRegra(dados: unknown): SalvarRegraPontuacaoRequest {
  if (!dados || typeof dados !== "object" || Array.isArray(dados)) {
    throw new ErroPontuacao(400, "VALOR_INVALIDO", "Informe a configuração completa.");
  }
  const entrada = dados as Record<string, unknown>;
  if (entrada.versaoEsperada !== null) inteiro(entrada.versaoEsperada, 1, "versaoEsperada");
  const total = parsePontos(entrada.totalPontos, { positivo: true, campo: "totalPontos" });
  if (!Array.isArray(entrada.subgrupos) || entrada.subgrupos.length === 0) {
    throw new ErroPontuacao(400, "SOMA_DIVERGENTE", "Adicione pelo menos um subgrupo.", "subgrupos");
  }
  const ids = new Set<string>();
  const subgrupos = entrada.subgrupos.map((item: unknown, indice: number) => {
    const campo = `subgrupos[${indice}]`;
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      throw new ErroPontuacao(400, "VALOR_INVALIDO", "Subgrupo inválido.", campo);
    }
    const subgrupo = item as Record<string, unknown>;
    let id: string | undefined;
    if (subgrupo.id !== undefined) {
      validarUuidPontuacao(subgrupo.id, `${campo}.id`);
      id = subgrupo.id.toLowerCase();
      if (ids.has(id)) throw new ErroPontuacao(400, "UUID_INVALIDO", "O mesmo subgrupo foi informado duas vezes.", `${campo}.id`);
      ids.add(id);
    }
    if (typeof subgrupo.nome !== "string" || !subgrupo.nome.trim()) {
      throw new ErroPontuacao(400, "VALOR_INVALIDO", "Informe o nome do subgrupo.", `${campo}.nome`);
    }
    const orcamento = parsePontos(subgrupo.orcamentoPontos, { positivo: true, campo: `${campo}.orcamentoPontos` });
    if (subgrupo.modoQuantidade === "FIXA") inteiro(subgrupo.quantidadeFixa, 1, `${campo}.quantidadeFixa`);
    else if (subgrupo.modoQuantidade !== "SEM_LIMITE" || subgrupo.quantidadeFixa !== null) {
      throw new ErroPontuacao(400, "QUANTIDADE_INVALIDA", "Selecione quantidade fixa ou sem limite; sem limite exige quantidade nula.", `${campo}.quantidadeFixa`);
    }
    inteiro(subgrupo.ordem, 0, `${campo}.ordem`);
    return {
      ...(id !== undefined ? { id } : {}),
      nome: subgrupo.nome.trim(), orcamentoPontos: formatarPontos(orcamento),
      modoQuantidade: subgrupo.modoQuantidade as "FIXA" | "SEM_LIMITE",
      quantidadeFixa: subgrupo.quantidadeFixa as number | null, ordem: subgrupo.ordem,
    };
  });
  if (somarPontos(subgrupos.map((s) => parsePontos(s.orcamentoPontos))) !== total) {
    throw new ErroPontuacao(400, "SOMA_DIVERGENTE", "A soma dos orçamentos deve ser igual ao total de pontos.", "subgrupos");
  }
  return { versaoEsperada: entrada.versaoEsperada as number | null, totalPontos: formatarPontos(total), subgrupos };
}

/** O repository chama esta decisão somente depois de bloquear/reler a regra. */
export function validarVersaoRegra(atual: RegraPontuacao | null, versaoEsperada: number | null): void {
  if (atual?.usadaEm !== null && atual?.usadaEm !== undefined) {
    throw new ErroPontuacao(409, "REGRA_PRESERVADA", "Esta regra já foi usada. Configure uma nova distribuição em outro período.");
  }
  if ((!atual && versaoEsperada !== null) || (atual && versaoEsperada !== atual.versao)) {
    throw new ErroPontuacao(409, "VERSAO_OBSOLETA", "A configuração mudou. Recarregue a regra antes de salvar.", "versaoEsperada");
  }
}
