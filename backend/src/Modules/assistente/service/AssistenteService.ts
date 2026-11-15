import { AIMessage, HumanMessage, SystemMessage, ToolMessage, type BaseMessage } from "@langchain/core/messages";
import { tool, type StructuredToolInterface } from "@langchain/core/tools";

import {
    base,
    perfilDoUsuario,
    promptDoSistema,
    respostaDaAjuda,
    type BaseDeConhecimento,
    type PerfilAssistente,
} from "../conhecimento/carregador";
import { AssistenteErro, comTempoLimite, erroDoProvedor } from "./AssistenteErro";
import { ConfiguracaoIaService } from "./ConfiguracaoIaService";
import { criarModelo, type FabricaDeModelo } from "./ModeloIa";
import { criarFerramentasDeDados, fontesPadrao, type FontesDeDados, type UsuarioAutenticado } from "./FerramentasDados";

export const LIMITES = {
    caracteresMensagem: 1000,
    mensagensHistorico: 10,
    caracteresHistorico: 2000,
    /** Rodadas modelo → ferramenta antes de desistir: evita laço infinito e custo descontrolado. */
    rodadasFerramenta: 6,
    /** Tempo máximo de cada chamada ao provedor: com o modelo sobrecarregado, o SDK fica tentando por minutos. */
    tempoChamadaMs: 45_000,
    /** Tempo máximo da conversa inteira (todas as rodadas somadas). */
    tempoTotalMs: 90_000,
};

export interface MensagemHistorico {
    papel: "usuario" | "assistente";
    texto: string;
}

/** A ferramenta é criada por requisição e só enxerga os artigos do perfil de quem está logado. */
export function criarConsultarAjuda(conhecimento: BaseDeConhecimento, perfil: PerfilAssistente) {
    return tool(async ({ codigo }: { codigo: string }) => respostaDaAjuda(conhecimento, perfil, codigo), {
        name: "consultarAjuda",
        description:
            "Devolve o artigo de ajuda (passo a passo, regras e o link da tela) de um tópico do sumário. " +
            "Chame antes de responder qualquer dúvida de como usar o sistema.",
        schema: {
            type: "object",
            properties: {
                codigo: { type: "string", description: "O código do tópico, exatamente como está no sumário." },
            },
            required: ["codigo"],
        },
    });
}

/**
 * O histórico vem do navegador e pode estar "torto": mensagem do usuário que falhou e ficou sem resposta,
 * pergunta repetida depois de um erro, ou um recorte que começa na fala do assistente. Vários provedores
 * (Gemini, por exemplo) recusam turnos que não alternam ou que começam pelo assistente, então aqui ele é
 * normalizado: começa no usuário, alterna sempre e termina no assistente (a pergunta atual vem logo depois).
 */
export function historicoValido(historico: unknown): BaseMessage[] {
    if (!Array.isArray(historico)) return [];
    const validas = historico
        .filter(
            (m): m is MensagemHistorico =>
                m && (m.papel === "usuario" || m.papel === "assistente") && typeof m.texto === "string" && m.texto.trim() !== "",
        )
        .slice(-LIMITES.mensagensHistorico)
        .map((m) => ({ papel: m.papel, texto: m.texto.trim().slice(0, LIMITES.caracteresHistorico) }));

    const turnos: MensagemHistorico[] = [];
    for (const m of validas) {
        const anterior = turnos[turnos.length - 1];
        if (!anterior && m.papel === "assistente") continue; // nunca começa pelo assistente
        if (anterior?.papel === m.papel) {
            // Usuário repetido: vale a pergunta mais recente (a anterior ficou sem resposta).
            // Assistente repetido: as falas são juntadas.
            anterior.texto = m.papel === "usuario" ? m.texto : `${anterior.texto}\n\n${m.texto}`;
            continue;
        }
        turnos.push({ ...m });
    }
    if (turnos[turnos.length - 1]?.papel === "usuario") turnos.pop(); // pergunta sem resposta: a atual a substitui

    return turnos.map((m) => (m.papel === "usuario" ? new HumanMessage(m.texto) : new AIMessage(m.texto)));
}

/**
 * O modelo às vezes inventa links (/turmas no lugar de /turmas/lista). Só sobrevive link para uma rota que
 * está nos artigos do perfil; o resto vira texto. Assim também nenhum link aponta para tela de outro perfil.
 */
export function manterSoLinksConhecidos(texto: string, rotas: Set<string>): string {
    return texto.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (link, rotulo: string, href: string) =>
        rotas.has(href.split(/[?#]/)[0]) ? link : rotulo,
    );
}

/** Pergunta de cortesia: só conta se for pergunta (termina em "?"). "O próximo passo é salvar." é conteúdo. */
const PERGUNTA_DE_CORTESIA =
    /deu (tudo )?certo|pr[óo]ximo passo|posso (te )?ajudar|mais alguma (coisa|d[úu]vida|informa)|precisa de (mais )?ajuda|ficou (alguma )?d[úu]vida/i;
/** Fechamento que é só cortesia, a frase inteira, sem nenhuma orientação dentro. */
const FECHAMENTO_DE_CORTESIA =
    /^(estou [àa] disposi[çc][ãa]o|fico [àa] disposi[çc][ãa]o|conte comigo|qualquer (outra )?d[úu]vida,? (é|e) s[óo] (me )?(chamar|falar|perguntar)|se precisar(?: de (?:mais )?ajuda)?,? (é|e) s[óo] (me )?(chamar|falar|perguntar))[.!]?$/i;
/** Frase que encaminha para alguém é orientação, nunca cortesia. */
const ORIENTACAO = /secretaria|professor|suporte|coordena|equipe|print|mensagem de erro/i;

const ehCortesia = (frase: string) =>
    frase.length <= 120 &&
    !ORIENTACAO.test(frase) &&
    ((frase.trim().endsWith("?") && PERGUNTA_DE_CORTESIA.test(frase)) || FECHAMENTO_DE_CORTESIA.test(frase.trim()));

/**
 * Tira a pergunta de cortesia do fim da resposta ("Deu tudo certo?", "Posso ajudar com mais alguma coisa?").
 * Olha só a última linha de texto (ignorando a linha do link) e só remove frase que é cortesia por inteiro:
 * passos, orientações e encaminhamentos nunca são cortados.
 */
export function removerFechamentoDeCortesia(texto: string): string {
    const linhas = texto.trimEnd().split("\n");
    let fim = linhas.length - 1;
    while (fim >= 0 && (!linhas[fim].trim() || /^\[[^\]]+\]\([^)]+\)$/.test(linhas[fim].trim()))) fim--;
    if (fim < 0) return texto.trim();

    const frases = linhas[fim].trim().split(/(?<=[.!?])\s+/);
    let corte = frases.length;
    while (corte > 0 && ehCortesia(frases[corte - 1])) corte--;
    if (corte === frases.length) return texto.trim();

    linhas[fim] = frases.slice(0, corte).join(" ");
    return linhas.join("\n").replace(/\n{3,}/g, "\n\n").trim();
}

type ChamadaDeFerramenta = { id?: string; name: string; args: Record<string, unknown> };

/**
 * Executa uma chamada de ferramenta sem nunca derrubar a conversa: ferramenta de outro perfil ou argumentos
 * fora do formato (o LangChain lança ToolInputParsingException) voltam ao modelo como mensagem, e ele corrige
 * a chamada na rodada seguinte em vez de o usuário receber um erro genérico.
 */
async function executarChamada(chamada: ChamadaDeFerramenta, porNome: Map<string, StructuredToolInterface>): Promise<BaseMessage> {
    const responder = (content: string) => new ToolMessage({ tool_call_id: chamada.id ?? "", name: chamada.name, content });
    const ferramenta = porNome.get(chamada.name);
    if (!ferramenta) return responder("FERRAMENTA_INDISPONIVEL: essa consulta não existe para este usuário.");
    try {
        return await ferramenta.invoke({ ...chamada, type: "tool_call" });
    } catch (err) {
        console.warn(`[assistente] argumentos inválidos para ${chamada.name}:`, (err as Error)?.message);
        return responder(
            `ARGUMENTOS_INVALIDOS: a chamada de ${chamada.name} não segue o formato da ferramenta. ` +
                "Confira os parâmetros (tipo e campos obrigatórios) e chame de novo.",
        );
    }
}

export class AssistenteService {
    constructor(
        private readonly configuracao = new ConfiguracaoIaService(),
        private readonly fabrica: FabricaDeModelo = criarModelo,
        private readonly conhecimento: () => BaseDeConhecimento = base,
        private readonly fontes: () => FontesDeDados = fontesPadrao,
    ) {}

    /** `usuario` vem sempre do token já validado pelo middleware: é ele que define perfil e vínculos. */
    async responder(usuario: UsuarioAutenticado, mensagem: unknown, historico: unknown): Promise<{ resposta: string }> {
        const perfil = perfilDoUsuario(usuario?.tipo_usuario);
        if (!perfil || !usuario?.id) throw new AssistenteErro(403, "Seu perfil não tem acesso ao assistente.");

        const texto = typeof mensagem === "string" ? mensagem.trim() : "";
        if (!texto) throw new AssistenteErro(400, "Escreva sua dúvida.");
        if (texto.length > LIMITES.caracteresMensagem) {
            throw new AssistenteErro(400, `A mensagem pode ter no máximo ${LIMITES.caracteresMensagem} caracteres.`);
        }

        const parametros = await this.configuracao.parametrosDeUso();
        const conhecimento = this.conhecimento();
        const ferramentas = [
            criarConsultarAjuda(conhecimento, perfil),
            ...criarFerramentasDeDados(perfil, usuario, this.fontes()),
        ];
        const porNome = new Map<string, StructuredToolInterface>(ferramentas.map((f) => [f.name, f as StructuredToolInterface]));

        const modeloBase = await this.fabrica(parametros);
        if (!modeloBase.bindTools) throw new AssistenteErro(500, "O modelo configurado não aceita ferramentas.");
        const modelo = modeloBase.bindTools(ferramentas);

        const hoje = new Date().toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
        const mensagens: BaseMessage[] = [
            new SystemMessage(`${promptDoSistema(conhecimento, perfil)}\n\nData de hoje: ${hoje}.`),
            ...historicoValido(historico),
            new HumanMessage(texto),
        ];

        const inicio = Date.now();
        try {
            for (let rodada = 0; rodada <= LIMITES.rodadasFerramenta; rodada++) {
                // Prazo da conversa inteira: sem ele, 7 chamadas de 45 s deixariam a pessoa esperando minutos.
                const restante = LIMITES.tempoTotalMs - (Date.now() - inicio);
                if (restante <= 0) throw new AssistenteErro(504, "O assistente demorou demais para responder. Tente uma pergunta mais direta.");
                const resposta = await comTempoLimite(
                    (signal) => modelo.invoke(mensagens, { signal }),
                    Math.min(LIMITES.tempoChamadaMs, restante),
                );
                mensagens.push(resposta);

                const chamadas = resposta.tool_calls ?? [];
                if (chamadas.length === 0 || rodada === LIMITES.rodadasFerramenta) {
                    const rotas = new Set([...conhecimento.artigos[perfil].values()].map((a) => a.rota));
                    const final = removerFechamentoDeCortesia(manterSoLinksConhecidos(resposta.text.trim(), rotas));
                    if (final) return { resposta: final };
                    break;
                }

                // As consultas de uma mesma rodada são independentes: rodam juntas e voltam na ordem pedida.
                mensagens.push(...(await Promise.all(chamadas.map((chamada) => executarChamada(chamada, porNome)))));
            }
        } catch (err) {
            if (err instanceof AssistenteErro) throw err;
            console.error("[assistente] falha no provedor de IA:", (err as Error)?.message);
            throw erroDoProvedor(err);
        }

        return { resposta: "Não consegui montar uma resposta agora. Pode reformular sua dúvida?" };
    }
}
