type Ambiente = Record<string, string | undefined>;

// Depois de ativado, o processo não volta a carregar dotenv ou usar SMTP externo.
let modoTesteConfirmado = false;

export function estaEmModoTeste(ambiente: Ambiente = process.env): boolean {
  const flag = ambiente.ACADEMICO_MODO_TESTE;
  if (flag && flag !== "true" && flag !== "false") {
    throw new Error("ACADEMICO_MODO_TESTE deve ser true ou false.");
  }

  const ativo = flag === "true" || (ambiente === process.env && modoTesteConfirmado);
  if (ativo && ambiente.NODE_ENV === "production") {
    throw new Error("O modo de teste acadêmico não pode ser utilizado em produção.");
  }
  if (ativo && ambiente === process.env) modoTesteConfirmado = true;
  return ativo;
}

/** Valida o destino sem abrir conexão e sem incluir a URL em mensagens de erro. */
export function validarBancoTeste(databaseUrl: string | undefined): string {
  if (!databaseUrl) {
    throw new Error("O modo de teste exige DATABASE_URL explícita para um banco isolado.");
  }

  let destino: URL;
  try {
    destino = new URL(databaseUrl);
  } catch {
    throw new Error("DATABASE_URL de teste inválida.");
  }

  if (!["postgres:", "postgresql:"].includes(destino.protocol)) {
    throw new Error("O banco de teste deve usar uma URL PostgreSQL.");
  }
  if (!["localhost", "127.0.0.1", "[::1]"].includes(destino.hostname)) {
    throw new Error("O banco de teste deve estar em localhost, 127.0.0.1 ou [::1].");
  }
  // pg aceita parâmetros que sobrescrevem host/database. Não permitir essa rota.
  if (destino.search || destino.hash) {
    throw new Error("A URL do banco de teste não pode conter parâmetros ou fragmentos.");
  }
  if (destino.port && (Number(destino.port) < 1 || Number(destino.port) > 65535)) {
    throw new Error("A porta do banco de teste é inválida.");
  }

  let nome: string;
  try {
    nome = decodeURIComponent(destino.pathname.slice(1));
  } catch {
    throw new Error("O nome do banco de teste é inválido.");
  }
  if (!/^[a-zA-Z0-9_]+_(test|e2e)$/.test(nome)) {
    throw new Error("O nome do banco de teste deve terminar em _test ou _e2e.");
  }

  return databaseUrl;
}

/**
 * As entradas de aplicação e Knex chamam esta função antes de qualquer dotenv.
 * Não há fallback para DATABASE ou credenciais locais no modo explícito.
 * Unidades com repositório mockado podem fornecer uma URL sintética sem banco ativo.
 */
export function configurarAmbienteTeste(ambiente: Ambiente = process.env): string | undefined {
  if (!estaEmModoTeste(ambiente)) return undefined;
  const databaseUrl = validarBancoTeste(ambiente.DATABASE_URL);
  ambiente.EMAIL_MODO_TESTE = "true";
  return databaseUrl;
}
