import { cifrar, decifrar } from "../../configuracao-email/service/CriptografiaSegredo";
import {
    ConfiguracaoIaRepository,
    PROVEDORES_IA,
    type AtualizarConfiguracaoIaDTO,
    type ConfiguracaoIa,
    type ProvedorIa,
} from "../repository/ConfiguracaoIaRepository";
import { AssistenteErro, comTempoLimite, erroDoProvedor } from "./AssistenteErro";
import {
    criarModelo,
    MODELO_SUGERIDO,
    MODELOS_POR_PROVEDOR,
    modeloPermitido,
    type FabricaDeModelo,
    type OpcaoDeModelo,
    type ParametrosModelo,
} from "./ModeloIa";

const CONTEXTO_CIFRA = "assistente-ia";
const TAMANHO_MAXIMO_CHAVE = 400;

/** O que a tela de configuração recebe. A chave nunca sai do servidor: só os últimos caracteres. */
export interface ConfiguracaoIaPublica {
    provedor: ProvedorIa;
    modelo: string;
    modeloSugerido: Record<ProvedorIa, string>;
    modelosDisponiveis: Record<ProvedorIa, OpcaoDeModelo[]>;
    possuiChave: boolean;
    chaveFinal: string;
    ativo: boolean;
    testadoEm: string | null;
    resultadoTeste: string;
}

export interface AtualizarConfiguracaoIaEntrada {
    provedor?: unknown;
    modelo?: unknown;
    apiKey?: unknown;
    ativo?: unknown;
}

export class ConfiguracaoIaService {
    constructor(
        private readonly repository = new ConfiguracaoIaRepository(),
        private readonly fabrica: FabricaDeModelo = criarModelo,
    ) {}

    private async carregar(): Promise<ConfiguracaoIa> {
        const config = await this.repository.buscar();
        if (!config) throw new AssistenteErro(500, "A configuração do assistente não foi encontrada. Rode as migrations.");
        return config;
    }

    private publica(config: ConfiguracaoIa): ConfiguracaoIaPublica {
        return {
            provedor: config.provedor,
            modelo: config.modelo,
            modeloSugerido: MODELO_SUGERIDO,
            modelosDisponiveis: MODELOS_POR_PROVEDOR,
            possuiChave: Boolean(config.api_key_cifrada),
            chaveFinal: config.api_key_final,
            ativo: config.ativo,
            testadoEm: config.testado_em,
            resultadoTeste: config.resultado_teste,
        };
    }

    async buscarPublico(): Promise<ConfiguracaoIaPublica> {
        return this.publica(await this.carregar());
    }

    /** Para o widget: só diz se o chat deve aparecer. */
    async estaAtivo(): Promise<boolean> {
        const config = await this.repository.buscar();
        return Boolean(config?.ativo && config.api_key_cifrada);
    }

    async atualizar(entrada: AtualizarConfiguracaoIaEntrada): Promise<ConfiguracaoIaPublica> {
        const atual = await this.carregar();
        const dados: AtualizarConfiguracaoIaDTO = {};

        if (entrada.provedor !== undefined) {
            const provedor = String(entrada.provedor).trim().toLowerCase();
            if (!(PROVEDORES_IA as readonly string[]).includes(provedor)) {
                throw new AssistenteErro(400, `Provedor inválido. Use: ${PROVEDORES_IA.join(", ")}.`);
            }
            dados.provedor = provedor as ProvedorIa;
        }

        const provedorFinal = dados.provedor ?? atual.provedor;
        if (entrada.modelo !== undefined) {
            const modelo = String(entrada.modelo).trim();
            if (!modeloPermitido(provedorFinal, modelo)) {
                throw new AssistenteErro(400, "Escolha um dos modelos disponíveis para este provedor.");
            }
            dados.modelo = modelo;
        } else if (dados.provedor && !modeloPermitido(provedorFinal, atual.modelo)) {
            // O modelo salvo era do provedor anterior: volta para o padrão do novo.
            dados.modelo = "";
        }

        const apiKey = entrada.apiKey === undefined ? "" : String(entrada.apiKey).trim();
        if (apiKey) {
            if (apiKey.length > TAMANHO_MAXIMO_CHAVE || /\s/.test(apiKey)) {
                throw new AssistenteErro(400, "Chave de acesso inválida.");
            }
            dados.api_key_cifrada = cifrar(apiKey, CONTEXTO_CIFRA);
            dados.api_key_final = apiKey.slice(-4);
        } else if (dados.provedor && dados.provedor !== atual.provedor && atual.api_key_cifrada) {
            // A chave de um provedor não serve para outro: trocar o provedor exige uma chave nova.
            throw new AssistenteErro(400, "Ao trocar o provedor, informe a chave de acesso do novo provedor.");
        }

        if (entrada.ativo !== undefined) dados.ativo = Boolean(entrada.ativo);

        const terminaComChave = Boolean(dados.api_key_cifrada ?? atual.api_key_cifrada);
        if ((dados.ativo ?? atual.ativo) && !terminaComChave) {
            throw new AssistenteErro(400, "Informe a chave de acesso antes de ativar o assistente.");
        }

        if (Object.keys(dados).length === 0) {
            throw new AssistenteErro(400, "Informe ao menos um campo para atualizar.");
        }

        return this.publica(await this.repository.atualizar(dados));
    }

    /** Parâmetros para chamar o modelo. Lança 503 quando o assistente está desligado. */
    async parametrosDeUso(): Promise<ParametrosModelo> {
        const config = await this.carregar();
        if (!config.ativo || !config.api_key_cifrada) {
            throw new AssistenteErro(503, "O assistente está desativado no momento.");
        }
        return this.parametros(config);
    }

    private parametros(config: ConfiguracaoIa): ParametrosModelo {
        let apiKey: string;
        try {
            apiKey = decifrar(config.api_key_cifrada, CONTEXTO_CIFRA);
        } catch {
            throw new AssistenteErro(500, "Não foi possível ler a chave salva do assistente. Cadastre a chave novamente.");
        }
        // Modelo salvo antes da lista existir (ou removido dela) cai no padrão do provedor.
        const modelo = modeloPermitido(config.provedor, config.modelo) ? config.modelo : "";
        return { provedor: config.provedor, modelo, apiKey };
    }

    async testarConexao(): Promise<{ sucesso: boolean; mensagem: string }> {
        const config = await this.carregar();
        if (!config.api_key_cifrada) throw new AssistenteErro(400, "Salve a chave de acesso antes de testar.");

        try {
            // Carregado só aqui: as telas de configuração e o status do widget não precisam do LangChain.
            const { HumanMessage } = await import("@langchain/core/messages");
            const modelo = await this.fabrica(this.parametros(config));
            await comTempoLimite((signal) => modelo.invoke([new HumanMessage("Responda apenas: ok")], { signal }), 45_000);
            const mensagem = "Conexão com o provedor funcionando.";
            await this.repository.registrarTeste(true, mensagem);
            return { sucesso: true, mensagem };
        } catch (err) {
            if (err instanceof AssistenteErro && err.status === 500) throw err;
            const mensagem = erroDoProvedor(err).message;
            await this.repository.registrarTeste(false, mensagem);
            return { sucesso: false, mensagem };
        }
    }
}
