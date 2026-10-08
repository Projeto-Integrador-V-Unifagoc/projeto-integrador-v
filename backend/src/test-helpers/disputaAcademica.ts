import type { Knex } from "knex";
import { estaEmModoTeste, validarBancoTeste } from "../config/ambienteTeste";

export interface EvidenciaBloqueioPostgres {
  pid: number;
  bloqueadores: number[];
  evento: string;
  tiposLock: string[];
  /** Inclui esperas transitivas: outra operação pode estar à frente na fila. */
  cadeiaAteBloqueador: number[];
}

export interface OpcoesDisputaAcademica {
  tempoLimiteMs?: number;
  maxConsultas?: number;
  /** Quando conhecidos, impede contar uma sessão alheia entre as operações. */
  pidsEsperados?: readonly number[];
  /** Executa ainda com o bloqueador retido, após provar todas as esperas. */
  aposComprovarBloqueio?: (bloqueios: readonly EvidenciaBloqueioPostgres[]) => Promise<void>;
}

export interface ResultadoDisputaAcademica<T> {
  bloqueadorPid: number;
  bloqueios: EvidenciaBloqueioPostgres[];
  resultados: PromiseSettledResult<T>[];
  consultas: number;
}

interface EsperaPostgres {
  pid: number;
  bloqueadores: number[];
  evento: string;
  tiposLock: string[];
}

function validarConexaoIsolada(conexao: unknown): void {
  if (typeof conexao === "string") {
    validarBancoTeste(conexao);
    return;
  }
  if (!conexao || typeof conexao !== "object") {
    throw new Error("A barreira exige destino PostgreSQL explícito e isolado.");
  }
  // Knex normaliza a URL em objeto. Validar o destino sem acessar credenciais.
  const destino = conexao as Record<string, unknown>;
  if ("connectionString" in destino || "options" in destino) {
    throw new Error("A conexão da barreira não pode sobrescrever o destino ou opções de sessão.");
  }
  if (typeof destino.host !== "string" || !["localhost", "127.0.0.1", "::1", "[::1]"].includes(destino.host)) {
    throw new Error("O banco de teste deve estar em localhost, 127.0.0.1 ou [::1].");
  }
  if (typeof destino.database !== "string") {
    throw new Error("A barreira exige nome explícito de banco isolado.");
  }
  const url = new URL("postgresql://localhost");
  url.hostname = destino.host === "::1" ? "[::1]" : destino.host;
  url.pathname = `/${encodeURIComponent(destino.database)}`;
  if (destino.port !== undefined) {
    const porta = String(destino.port);
    if (!/^[0-9]+$/.test(porta) || Number(porta) < 1 || Number(porta) > 65535) {
      throw new Error("A porta do banco de teste é inválida.");
    }
    url.port = porta;
  }
  validarBancoTeste(url.toString());
}

export function validarDestinoPostgresTeste(banco: Knex): void {
  if (!estaEmModoTeste()) {
    throw new Error("Disputas acadêmicas exigem ACADEMICO_MODO_TESTE=true.");
  }
  const configuracao = banco.client.config;
  if (!["pg", "postgres", "postgresql"].includes(String(configuracao.client))) {
    throw new Error("A barreira de disputa exige PostgreSQL real.");
  }
  validarConexaoIsolada(configuracao.connection);
  // A configuração original e o destino efetivo devem permanecer isolados.
  if (banco.client.connectionSettings) validarConexaoIsolada(banco.client.connectionSettings);
}

function opcoesValidas(opcoes: OpcoesDisputaAcademica, quantidade: number) {
  const tempoLimiteMs = opcoes.tempoLimiteMs ?? 10_000;
  const maxConsultas = opcoes.maxConsultas ?? 2_000;
  if (!Number.isInteger(tempoLimiteMs) || tempoLimiteMs < 1 || tempoLimiteMs > 60_000
    || !Number.isInteger(maxConsultas) || maxConsultas < 1) {
    throw new Error("A barreira exige limites positivos; tempo máximo de 60000 ms.");
  }
  const pids = opcoes.pidsEsperados;
  if (pids && (pids.length !== quantidade || new Set(pids).size !== quantidade
    || pids.some((pid) => !Number.isInteger(pid) || pid < 1))) {
    throw new Error("Informe exatamente um PID PostgreSQL distinto por operação.");
  }
  return { tempoLimiteMs, maxConsultas, pids };
}

function cadeiaAteBloqueador(
  pid: number,
  bloqueadorPid: number,
  esperas: Map<number, EsperaPostgres>,
  caminho: number[] = [],
): number[] | null {
  if (caminho.includes(pid)) return null;
  const proximoCaminho = [...caminho, pid];
  if (pid === bloqueadorPid) return proximoCaminho;
  for (const bloqueador of esperas.get(pid)?.bloqueadores ?? []) {
    const cadeia = cadeiaAteBloqueador(bloqueador, bloqueadorPid, esperas, proximoCaminho);
    if (cadeia) return cadeia;
  }
  return null;
}

const consultaEsperas = `
  SELECT a.pid,
         pg_blocking_pids(a.pid) AS bloqueadores,
         a.wait_event AS evento,
         ARRAY(
           SELECT DISTINCT l.locktype
           FROM pg_locks l
           WHERE l.pid = a.pid AND NOT l.granted
           ORDER BY l.locktype
         ) AS "tiposLock"
  FROM pg_stat_activity a
  WHERE a.datname = current_database()
    AND a.pid <> pg_backend_pid()
    AND a.state = 'active'
    AND a.wait_event_type = 'Lock'
    AND EXISTS (SELECT 1 FROM pg_locks l WHERE l.pid = a.pid AND NOT l.granted)
`;

/**
 * Mantém locks numa sessão controlada e só libera após observar TODAS as sessões
 * concorrentes aguardando esses locks em pg_stat_activity + pg_locks.
 *
 * `bloquear` adquire os locks na ordem do protocolo acadêmico da operação testada.
 * Cada operação usa uma sessão independente e deve ter seu próprio timeout.
 * O pool precisa acomodar bloqueador, observador e operações (N + 2 conexões).
 * Operações HTTP podem usar outro pool; o observador sempre usa `banco`.
 *
 * Não presume concorrência por Promise.all ou tempo decorrido. Consultas reais
 * são a barreira, sem sleeps, alteração de triggers ou escrita em pg_locks.
 * Rejeições das operações ficam em `resultados` para asserções de conflito/rollback.
 */
export async function disputarComBloqueioAcademico<T>(
  banco: Knex,
  bloquear: (trx: Knex.Transaction) => Promise<void>,
  operacoes: readonly (() => Promise<T>)[],
  opcoes: OpcoesDisputaAcademica = {},
): Promise<ResultadoDisputaAcademica<T>> {
  validarDestinoPostgresTeste(banco);
  if (operacoes.length < 1) throw new Error("Informe ao menos uma operação concorrente.");
  const { tempoLimiteMs, maxConsultas, pids } = opcoesValidas(opcoes, operacoes.length);
  const poolMaximo = banco.client.config.pool?.max ?? 10;
  if (poolMaximo < operacoes.length + 2) {
    throw new Error("O pool da barreira deve acomodar operações, bloqueador e observador.");
  }

  const bloqueador = await banco.transaction();
  let conclusaoOperacoes: Promise<PromiseSettledResult<T>[]> | undefined;
  try {
    const identificacao = await bloqueador.raw<{ rows: { pid: number }[] }>("SELECT pg_backend_pid() AS pid");
    const bloqueadorPid = identificacao.rows[0].pid;
    if (pids?.includes(bloqueadorPid)) {
      throw new Error("O PID do bloqueador não pode ser uma operação concorrente.");
    }
    await bloqueador.raw("SELECT set_config('lock_timeout', ?, true)", [`${tempoLimiteMs}ms`]);
    await bloquear(bloqueador);

    let concluidas = 0;
    const promessas = operacoes.map((operacao) => Promise.resolve().then(operacao).then(
      (resultado) => { concluidas += 1; return resultado; },
      (erro: unknown) => { concluidas += 1; throw erro; },
    ));
    // Instala handlers de rejeição antes das consultas, sem antecipar a liberação.
    conclusaoOperacoes = Promise.allSettled(promessas);

    const inicio = Date.now();
    for (let consultas = 1; consultas <= maxConsultas; consultas += 1) {
      if (concluidas > 0) throw new Error("Uma operação terminou antes de comprovar a espera de todas as sessões.");
      const consulta = await banco.raw<{ rows: EsperaPostgres[] }>(consultaEsperas);
      if (concluidas > 0) throw new Error("Uma operação terminou antes de comprovar a espera de todas as sessões.");
      const esperas = new Map(consulta.rows.map((espera) => [espera.pid, espera]));
      const bloqueios: EvidenciaBloqueioPostgres[] = [];
      for (const espera of consulta.rows) {
        if (pids && !pids.includes(espera.pid)) continue;
        const cadeia = cadeiaAteBloqueador(espera.pid, bloqueadorPid, esperas);
        if (cadeia) bloqueios.push({ ...espera, cadeiaAteBloqueador: cadeia });
      }
      if (bloqueios.length === operacoes.length) {
        await opcoes.aposComprovarBloqueio?.(bloqueios);
        await bloqueador.commit();
        return { bloqueadorPid, bloqueios, resultados: await conclusaoOperacoes, consultas };
      }
      if (bloqueios.length > operacoes.length) {
        throw new Error("A barreira encontrou sessões adicionais; informe pidsEsperados para identificar as operações.");
      }
      if (Date.now() - inicio >= tempoLimiteMs) break;
    }
    throw new Error("A barreira não comprovou todas as sessões aguardando os locks dentro dos limites.");
  } finally {
    // Também libera locks em timeout, falha do observador ou erro da preparação.
    if (!bloqueador.isCompleted()) await bloqueador.rollback();
    if (conclusaoOperacoes) await conclusaoOperacoes;
  }
}
