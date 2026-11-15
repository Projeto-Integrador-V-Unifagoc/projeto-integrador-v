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

function historicoValido(historico: unknown): BaseMessage[] {
    if (!Array.isArray(historico)) return [];
    return historico
        .filter(
            (m): m is MensagemHistorico =>
                m && (m.papel === "usuario" || m.papel === "assistente") && typeof m.texto === "string" && m.texto.trim() !== "",
        )
        .slice(-LIMITES.mensagensHistorico)
        .map((m) => {
            const texto = m.texto.slice(0, LIMITES.caracteresHistorico);
            return m.papel === "usuario" ? new HumanMessage(texto) : new AIMessage(texto);
        });
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

const CORTESIA = /deu (tudo )?certo|pr[óo]ximo passo|posso ajudar (com|em) (mais )?(alguma|algo)|mais alguma (coisa|d[úu]vida|informa)|estou [àa] disposi|[ée] s[óo] (me )?(chamar|falar|avisar)|precisar de (mais )?ajuda/i;

/**
 * Tira as frases de cortesia do fim da resposta ("Deu tudo certo?", "Posso ajudar com mais alguma coisa?").
 * Só olha o fim e só remove frase curta que bate com o padrão: o conteúdo da resposta nunca é cortado.
 */
export function removerFechamentoDeCortesia(texto: string): string {
    const linhas = texto.trimEnd().split("\n");
    for (let fim = linhas.length - 1; fim >= 0; fim--) {
        const linha = linhas[fim].trim();
        if (!linha) continue;
        if (/^\[[^\]]+\]\([^)]+\)$/.test(linha)) continue; // a linha do link fica

        const frases = linha.split(/(?<=[.!?])\s+/);
        let corte = frases.length;
        while (corte > 0 && CORTESIA.test(frases[corte - 1]) && frases[corte - 1].length <= 120) corte--;
        if (corte === frases.length) break;
        linhas[fim] = frases.slice(0, corte).join(" ");
        if (corte > 0) break;
    }
    return linhas.join("\n").replace(/\n{3,}/g, "\n\n").trim();
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

        try {
            for (let rodada = 0; rodada <= LIMITES.rodadasFerramenta; rodada++) {
                const resposta = await comTempoLimite((signal) => modelo.invoke(mensagens, { signal }), LIMITES.tempoChamadaMs);
                mensagens.push(resposta);

                const chamadas = resposta.tool_calls ?? [];
                if (chamadas.length === 0 || rodada === LIMITES.rodadasFerramenta) {
                    const rotas = new Set([...conhecimento.artigos[perfil].values()].map((a) => a.rota));
                    const final = removerFechamentoDeCortesia(manterSoLinksConhecidos(resposta.text.trim(), rotas));
                    if (final) return { resposta: final };
                    break;
                }

                for (const chamada of chamadas) {
                    const ferramenta = porNome.get(chamada.name);
                    // Ferramenta que não existe para este perfil: responde sem executar nada.
                    mensagens.push(
                        ferramenta
                            ? await ferramenta.invoke(chamada)
                            : new ToolMessage({
                                  tool_call_id: chamada.id ?? "",
                                  content: "FERRAMENTA_INDISPONIVEL: essa consulta não existe para este usuário.",
                              }),
                    );
                }
            }
        } catch (err) {
            if (err instanceof AssistenteErro) throw err;
            console.error("[assistente] falha no provedor de IA:", (err as Error)?.message);
            throw erroDoProvedor(err);
        }

        return { resposta: "Não consegui montar uma resposta agora. Pode reformular sua dúvida?" };
    }
}
