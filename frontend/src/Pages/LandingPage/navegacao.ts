import type { MouseEvent } from "react";

function ehExterno(url: string): boolean {
    return /^https?:\/\//i.test(url);
}

function mesmoSite(url: string): boolean {
    try {
        return new URL(url).host === window.location.host;
    } catch {
        return false;
    }
}

/**
 * Devolve as props para renderizar um elemento de navegacao como ancora real.
 * O clique simples continua na SPA; clique do meio, ctrl/cmd+clique e
 * "abrir em nova aba" ficam a cargo do navegador.
 */
export function propsDeLink(url: string, navegar: (destino: string) => void) {
    const externo = ehExterno(url) && !mesmoSite(url);

    return {
        component: "a" as const,
        href: url,
        ...(externo ? { target: "_blank", rel: "noopener noreferrer" } : {}),
        onClick: (evento: MouseEvent<HTMLElement>) => {
            if (
                evento.defaultPrevented ||
                evento.button !== 0 ||
                evento.metaKey ||
                evento.ctrlKey ||
                evento.shiftKey ||
                evento.altKey ||
                externo
            ) {
                return;
            }

            evento.preventDefault();
            navegar(url);
        },
    };
}
