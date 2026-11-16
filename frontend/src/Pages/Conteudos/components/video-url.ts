// O servidor valida os mesmos domínios (backend/.../ConteudoBlocos.ts).
const DOMINIOS_DE_VIDEO = ["youtube.com", "youtu.be", "youtube-nocookie.com", "vimeo.com", "drive.google.com"];

export function urlDeVideoPermitida(valor: string) {
    try {
        const url = new URL(valor);
        const host = url.hostname.toLowerCase();
        return url.protocol === "https:" && DOMINIOS_DE_VIDEO.some((d) => host === d || host.endsWith(`.${d}`));
    } catch {
        return false;
    }
}

// Converte o link de compartilhamento no endereço do player incorporável.
export function urlDeIncorporacao(valor: string): string | null {
    if (!urlDeVideoPermitida(valor)) return null;
    const url = new URL(valor);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return `https://www.youtube-nocookie.com/embed/${url.pathname.slice(1)}`;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
        const id = url.searchParams.get("v") ?? url.pathname.match(/\/(?:embed|shorts)\/([^/?]+)/)?.[1];
        return id ? `https://www.youtube-nocookie.com/embed/${id}` : null;
    }
    if (host === "vimeo.com") {
        const id = url.pathname.match(/\/(\d+)/)?.[1];
        return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host === "player.vimeo.com") return valor;
    if (host === "drive.google.com") {
        const id = url.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
        return id ? `https://drive.google.com/file/d/${id}/preview` : null;
    }
    return null;
}
