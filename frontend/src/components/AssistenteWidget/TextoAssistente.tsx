import { Fragment, type ReactNode } from "react";
import { Box, ButtonBase, Stack, Typography } from "@mui/material";
import { AppWindow, ChevronRight } from "lucide-react";
import { Link as RouterLink } from "react-router-dom";

import { CORES_DASHBOARD } from "../DashboardLayout/dashboard-estilos";
import { nomeDaTela, separarAtalhos, type Atalho } from "./atalhos";
import { ehRotaInterna } from "./rotaInterna";

/**
 * Markdown mínimo das respostas do assistente: parágrafos, listas, **negrito**, `código` e [links](/rota).
 * Monta elementos React (nunca HTML).
 *
 * Os links de tela não ficam no meio do texto: viram botões no fim da resposta, um por tela. Uma linha que
 * só tem link some do texto (o botão a substitui); um link dentro de uma frase vira só o nome da tela.
 */

const PADRAO_INLINE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

function inline(texto: string): ReactNode[] {
    return texto.split(PADRAO_INLINE).map((parte, i) => {
        if (parte.startsWith("**") && parte.endsWith("**") && parte.length > 4) {
            return <strong key={i}>{parte.slice(2, -2)}</strong>;
        }
        if (parte.startsWith("`") && parte.endsWith("`") && parte.length > 2) {
            return (
                <Box key={i} component="code" sx={{ px: 0.5, borderRadius: 0.5, bgcolor: "action.hover", fontSize: "0.85em" }}>
                    {parte.slice(1, -1)}
                </Box>
            );
        }
        const link = parte.match(/^\[([^\]]+)\]\(([^)\s]+)\)$/);
        if (link) {
            // No meio da frase fica só o nome: o caminho para a tela é o botão no fim da resposta.
            const [, rotulo, href] = link;
            return ehRotaInterna(href) ? <strong key={i}>{nomeDaTela(rotulo)}</strong> : <Fragment key={i}>{rotulo}</Fragment>;
        }
        return <Fragment key={i}>{parte}</Fragment>;
    });
}

type Bloco = { tipo: "p"; linhas: string[] } | { tipo: "ol" | "ul"; itens: string[] };

function blocos(texto: string): Bloco[] {
    const resultado: Bloco[] = [];
    for (const bruta of texto.split("\n")) {
        const linha = bruta.trim();
        const ultimo = resultado[resultado.length - 1];
        if (!linha) {
            resultado.push({ tipo: "p", linhas: [] });
            continue;
        }
        const numerada = linha.match(/^\d+[.)]\s+(.*)$/);
        const marcador = linha.match(/^[-*•]\s+(.*)$/);
        const tipo = numerada ? "ol" : marcador ? "ul" : "p";
        const conteudo = numerada?.[1] ?? marcador?.[1] ?? linha.replace(/^#+\s*/, "");

        if (ultimo && ultimo.tipo === tipo) {
            if (tipo === "p") (ultimo as { linhas: string[] }).linhas.push(conteudo);
            else (ultimo as { itens: string[] }).itens.push(conteudo);
        } else {
            resultado.push(tipo === "p" ? { tipo, linhas: [conteudo] } : { tipo, itens: [conteudo] });
        }
    }
    return resultado.filter((b) => (b.tipo === "p" ? b.linhas.length > 0 : b.itens.length > 0));
}

// Azul escuro do padrão sobre o azul suave: ≥ 5,5:1 de contraste também no hover.
const AZUL_TEXTO = CORES_DASHBOARD.acentoHover;

/**
 * A saída da resposta para a tela certa: uma faixa da largura do balão, fácil de tocar no celular.
 * Usa ButtonBase de propósito: o tema global fixa todo MuiButton em 75×30 px, o que quebrava o rótulo letra a letra.
 */
function AtalhoDeTela({ atalho, aoNavegar }: { atalho: Atalho; aoNavegar?: () => void }) {
    return (
        <ButtonBase
            component={RouterLink}
            to={atalho.rota}
            onClick={aoNavegar}
            focusRipple
            sx={(theme) => ({
                width: "100%",
                display: "flex",
                alignItems: "center",
                gap: 1.25,
                px: 1.25,
                py: 1,
                borderRadius: 1.5,
                justifyContent: "flex-start",
                textAlign: "left",
                color: AZUL_TEXTO,
                bgcolor: CORES_DASHBOARD.acentoSuave,
                transition: theme.transitions.create("background-color", { duration: theme.transitions.duration.shorter }),
                "&:hover": { bgcolor: CORES_DASHBOARD.acentoSuaveHover },
                "&.Mui-focusVisible": { outline: `2px solid ${theme.palette.primary.main}`, outlineOffset: 2 },
                "@media (prefers-reduced-motion: reduce)": { transition: "none" },
            })}
        >
            <AppWindow size={18} aria-hidden style={{ flexShrink: 0 }} />
            <Typography
                component="span"
                variant="body2"
                sx={{ flex: 1, minWidth: 0, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", wordBreak: "normal" }}
            >
                {atalho.rotulo}
            </Typography>
            <ChevronRight size={18} aria-hidden style={{ flexShrink: 0, opacity: 0.7 }} />
        </ButtonBase>
    );
}

export default function TextoAssistente({ texto, aoNavegar }: { texto: string; aoNavegar?: () => void }) {
    const { corpo, atalhos } = separarAtalhos(texto);

    return (
        <Box sx={{ "& > * + *": { mt: 1 }, wordBreak: "break-word" }}>
            {blocos(corpo).map((bloco, i) =>
                bloco.tipo === "p" ? (
                    <Typography key={i} variant="body2">
                        {bloco.linhas.map((l, j) => (
                            <Fragment key={j}>
                                {j > 0 && <br />}
                                {inline(l)}
                            </Fragment>
                        ))}
                    </Typography>
                ) : (
                    <Box key={i} component={bloco.tipo} sx={{ m: 0, pl: 2.5, "& li + li": { mt: 0.5 } }}>
                        {bloco.itens.map((item, j) => (
                            <Typography key={j} component="li" variant="body2">
                                {inline(item)}
                            </Typography>
                        ))}
                    </Box>
                ),
            )}

            {atalhos.length > 0 && (
                <Stack spacing={0.75} sx={{ pt: 0.75 }}>
                    {atalhos.map((atalho) => (
                        <AtalhoDeTela key={atalho.rota} atalho={atalho} aoNavegar={aoNavegar} />
                    ))}
                </Stack>
            )}
        </Box>
    );
}
