import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { Box, LinearProgress } from "@mui/material";

import HeaderPublico from "./HeaderPublico";
import RodapePublico from "./RodapePublico";
import { useSite } from "./useSite";

const ROTAS_DO_SITE = ["/", "/inscricao", "/sobre", "/cursos", "/noticias", "/galeria", "/contato"];

function caminhoInterno(url: string): string | null {
    try {
        const alvo = new URL(url);
        const caminho = alvo.pathname.replace(/\/+$/, "") || "/";

        if (alvo.host === window.location.host) {
            return caminho + alvo.search + alvo.hash;
        }

        if (ROTAS_DO_SITE.includes(caminho)) {
            return caminho + alvo.search + alvo.hash;
        }

        return null;
    } catch {
        return null;
    }
}

export function definirMeta(nome: string, conteudo: string, propriedade = false) {
    const seletor = propriedade ? `meta[property="${nome}"]` : `meta[name="${nome}"]`;
    let tag = document.head.querySelector<HTMLMetaElement>(seletor);

    if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute(propriedade ? "property" : "name", nome);
        document.head.appendChild(tag);
    }

    tag.content = conteudo;
}

export function usarSeo(titulo: string, descricao: string) {
    useEffect(() => {
        const anterior = document.title;

        document.title = titulo;
        definirMeta("description", descricao);
        definirMeta("og:title", titulo, true);
        definirMeta("og:description", descricao, true);
        definirMeta("og:type", "website", true);

        return () => {
            document.title = anterior;
        };
    }, [titulo, descricao]);
}

export default function LayoutPublico() {
    const navigate = useNavigate();
    const { pathname } = useLocation();
    const { conteudo, carregando } = useSite();

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
    }, [pathname]);

    function navegar(url: string) {
        if (!url) return;

        if (url.startsWith("#")) {
            document.querySelector(url)?.scrollIntoView({ behavior: "smooth", block: "start" });
            return;
        }

        if (/^https?:\/\//i.test(url)) {
            const interna = caminhoInterno(url);

            if (interna) {
                navigate(interna);
                return;
            }

            window.location.href = url;
            return;
        }

        navigate(url);
    }

    const urlInscricao = conteudo.configuracoes.url_inscricao || "/inscricao";

    return (
        <Box sx={{ bgcolor: "#fff", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <HeaderPublico
                menu={conteudo.menu}
                nomeSite={conteudo.configuracoes.site_nome}
                urlInscricao={urlInscricao}
                onNavegar={navegar}
            />

            <Box sx={{ height: 72 }} />

            {carregando && <LinearProgress sx={{ height: 2 }} />}

            <Box component="main" sx={{ flex: 1 }}>
                <Outlet context={{ conteudo, carregando, navegar, urlInscricao }} />
            </Box>

            <RodapePublico configuracoes={conteudo.configuracoes} menu={conteudo.menu} onNavegar={navegar} />
        </Box>
    );
}
