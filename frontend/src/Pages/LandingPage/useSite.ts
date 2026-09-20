import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";

import { sitePublicoApi } from "../../services/site-api";
import type { SiteConteudo } from "../../services/site-api";
import { CONTATO, MENU_PADRAO } from "./conteudo";

export interface ContextoSite {
    conteudo: SiteConteudo;
    carregando: boolean;
    navegar: (url: string) => void;
    urlInscricao: string;
}

export function useSiteContexto(): ContextoSite {
    return useOutletContext<ContextoSite>();
}

const CONTEUDO_VAZIO: SiteConteudo = {
    configuracoes: {
        site_nome: "UniEduca",
        contato_endereco: CONTATO.endereco,
        contato_telefone: CONTATO.telefone,
        contato_email: CONTATO.email,
        contato_horario: CONTATO.horario,
        url_inscricao: "/inscricao",
    },
    menu: MENU_PADRAO,
    banners: [],
    noticias: [],
    albuns: [],
    cursos: [],
};

let cache: SiteConteudo | null = null;
let requisicao: Promise<SiteConteudo> | null = null;

function carregar(): Promise<SiteConteudo> {
    if (cache) return Promise.resolve(cache);

    if (!requisicao) {
        requisicao = sitePublicoApi
            .conteudo()
            .then((dados) => {
                cache = {
                    ...CONTEUDO_VAZIO,
                    ...dados,
                    configuracoes: { ...CONTEUDO_VAZIO.configuracoes, ...(dados.configuracoes ?? {}) },
                    menu: dados.menu?.length ? dados.menu : CONTEUDO_VAZIO.menu,
                };
                return cache;
            })
            .catch(() => CONTEUDO_VAZIO)
            .finally(() => {
                requisicao = null;
            });
    }

    return requisicao;
}

export function limparCacheSite() {
    cache = null;
    requisicao = null;
}

export function useSite() {
    const [conteudo, setConteudo] = useState<SiteConteudo>(cache ?? CONTEUDO_VAZIO);
    const [carregando, setCarregando] = useState(!cache);

    useEffect(() => {
        let ativo = true;

        carregar()
            .then((dados) => {
                if (ativo) setConteudo(dados);
            })
            .finally(() => {
                if (ativo) setCarregando(false);
            });

        return () => {
            ativo = false;
        };
    }, []);

    return { conteudo, carregando };
}
