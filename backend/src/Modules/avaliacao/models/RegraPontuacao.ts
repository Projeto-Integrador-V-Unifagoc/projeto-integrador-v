export interface SubgrupoAvaliacao {
  id: string;
  nome: string;
  orcamentoPontos: string;
  modoQuantidade: "FIXA" | "SEM_LIMITE";
  quantidadeFixa: number | null;
  ordem: number;
}

export interface RegraPontuacao {
  id: string;
  cursoId: string;
  periodoLetivoId: string;
  totalPontos: string;
  origem: "CONFIGURADA" | "HISTORICA";
  versao: number;
  estado: "DISPONIVEL" | "PRESERVADA";
  usadaEm: string | null;
  criadaEm: string;
  atualizadaEm: string;
  criadaPorUsuarioId: string | null;
  atualizadaPorUsuarioId: string | null;
  subgrupos: SubgrupoAvaliacao[];
}

export interface SalvarRegraPontuacaoRequest {
  versaoEsperada: number | null;
  totalPontos: string;
  subgrupos: (Omit<SubgrupoAvaliacao, "id"> & { id?: string })[];
}

export interface ContextoRegraPontuacao {
  usuarioId: string;
  tipoUsuario: string;
}

export interface AuditoriaRegraPontuacao {
  id: string;
  regraPontuacaoId: string;
  usuarioId: string | null;
  perfil: string;
  acao: "CRIACAO" | "ALTERACAO" | "PRIMEIRO_USO" | "ADOCAO_HISTORICA";
  anterior: unknown;
  novo: unknown;
  criadoEm: string;
}

export class ErroPontuacao extends Error {
  readonly campos: { campo: string; codigo: string; mensagem: string }[];
  constructor(readonly status: number, readonly codigo: string, mensagem: string, campo?: string) {
    super(mensagem);
    this.name = "ErroPontuacao";
    this.campos = campo ? [{ campo, codigo, mensagem }] : [];
  }
}

export function validarUuidPontuacao(valor: unknown, campo: string): asserts valor is string {
  if (typeof valor !== "string" || !/^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i.test(valor)) {
    throw new ErroPontuacao(400, "UUID_INVALIDO", "Identificador inválido.", campo);
  }
}
