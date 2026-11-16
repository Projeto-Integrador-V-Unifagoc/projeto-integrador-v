import { useState } from "react";
import { createReactBlockSpec } from "@blocknote/react";
import { ExternalLink, Link2, PlaySquare } from "lucide-react";
import { urlDeIncorporacao } from "./video-url";

/**
 * Blocos próprios do conteúdo acadêmico, além dos padrões do BlockNote:
 * - videoEmbed: vídeo do YouTube, Vimeo ou Google Drive incorporado pelo link;
 * - linkCard: card de link externo com título.
 * O servidor valida os mesmos domínios (backend/.../ConteudoBlocos.ts).
 */

function urlHttp(valor: string) {
    try {
        const url = new URL(valor);
        return url.protocol === "http:" || url.protocol === "https:" ? url : null;
    } catch {
        return null;
    }
}

const estiloCaixa: React.CSSProperties = {
    width: "100%",
    border: "1px dashed #B2AFB6",
    borderRadius: 8,
    padding: 16,
    display: "flex",
    flexDirection: "column",
    gap: 8,
    background: "#F9F7F0",
    fontFamily: "Roboto, Arial, sans-serif",
};

const estiloCampo: React.CSSProperties = {
    width: "100%",
    height: 36,
    border: "1px solid #B2AFB6",
    borderRadius: 6,
    padding: "0 10px",
    fontSize: 14,
};

const estiloBotao: React.CSSProperties = {
    alignSelf: "flex-start",
    height: 32,
    padding: "0 14px",
    border: "none",
    borderRadius: 6,
    background: "#05b5e6",
    color: "#fff",
    fontWeight: 700,
    cursor: "pointer",
};

function FormularioVideo({ onConfirmar }: { onConfirmar: (url: string) => void }) {
    const [valor, setValor] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const confirmar = () => {
        const url = valor.trim();
        if (!urlDeIncorporacao(url)) {
            setErro("Use um link https do YouTube, Vimeo ou Google Drive.");
            return;
        }
        onConfirmar(url);
    };
    return (
        <div style={estiloCaixa} contentEditable={false}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                <PlaySquare size={18} /> Vídeo
            </span>
            <input
                style={estiloCampo}
                placeholder="Cole o link do YouTube ou Vimeo"
                value={valor}
                onChange={(e) => {
                    setValor(e.target.value);
                    setErro(null);
                }}
                onKeyDown={(e) => {
                    e.stopPropagation();
                    if (e.key === "Enter") {
                        e.preventDefault();
                        confirmar();
                    }
                }}
            />
            {erro && <span style={{ color: "#d32f2f", fontSize: 12 }}>{erro}</span>}
            <button type="button" style={estiloBotao} onClick={confirmar}>
                Incorporar
            </button>
        </div>
    );
}

export const VideoEmbed = createReactBlockSpec(
    { type: "videoEmbed", propSchema: { url: { default: "" } }, content: "none" },
    {
        render: ({ block, editor }) => {
            const url = block.props.url;
            if (!url) {
                return <FormularioVideo onConfirmar={(novo) => editor.updateBlock(block, { props: { url: novo } })} />;
            }
            const incorporar = urlDeIncorporacao(url);
            return (
                <div style={{ width: "100%" }} contentEditable={false}>
                    {incorporar ? (
                        <div style={{ position: "relative", paddingTop: "56.25%", borderRadius: 8, overflow: "hidden", background: "#000" }}>
                            <iframe
                                src={incorporar}
                                title="Vídeo"
                                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }}
                                allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                                allowFullScreen
                                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups"
                                referrerPolicy="strict-origin-when-cross-origin"
                            />
                        </div>
                    ) : (
                        <a href={url} target="_blank" rel="noopener noreferrer">{url}</a>
                    )}
                </div>
            );
        },
    },
);

function FormularioLink({ onConfirmar }: { onConfirmar: (url: string, titulo: string) => void }) {
    const [url, setUrl] = useState("");
    const [titulo, setTitulo] = useState("");
    const [erro, setErro] = useState<string | null>(null);
    const confirmar = () => {
        if (!urlHttp(url.trim())) {
            setErro("Informe um endereço começando com http:// ou https://.");
            return;
        }
        onConfirmar(url.trim(), titulo.trim());
    };
    const parar = (e: React.KeyboardEvent) => {
        e.stopPropagation();
        if (e.key === "Enter") {
            e.preventDefault();
            confirmar();
        }
    };
    return (
        <div style={estiloCaixa} contentEditable={false}>
            <span style={{ display: "flex", alignItems: "center", gap: 6, fontWeight: 600 }}>
                <Link2 size={18} /> Link externo
            </span>
            <input style={estiloCampo} placeholder="https://..." value={url} onChange={(e) => (setUrl(e.target.value), setErro(null))} onKeyDown={parar} />
            <input style={estiloCampo} placeholder="Título do link (opcional)" value={titulo} onChange={(e) => setTitulo(e.target.value)} onKeyDown={parar} />
            {erro && <span style={{ color: "#d32f2f", fontSize: 12 }}>{erro}</span>}
            <button type="button" style={estiloBotao} onClick={confirmar}>
                Adicionar
            </button>
        </div>
    );
}

export const LinkCard = createReactBlockSpec(
    { type: "linkCard", propSchema: { url: { default: "" }, titulo: { default: "" } }, content: "none" },
    {
        render: ({ block, editor }) => {
            const { url, titulo } = block.props;
            if (!url) {
                return <FormularioLink onConfirmar={(novo, nome) => editor.updateBlock(block, { props: { url: novo, titulo: nome } })} />;
            }
            const endereco = urlHttp(url);
            return (
                <a
                    href={endereco ? url : undefined}
                    target="_blank"
                    rel="noopener noreferrer"
                    contentEditable={false}
                    style={{
                        width: "100%",
                        display: "flex",
                        gap: 12,
                        alignItems: "center",
                        padding: "12px 16px",
                        border: "1px solid #E0E0E0",
                        borderRadius: 8,
                        textDecoration: "none",
                        color: "inherit",
                        fontFamily: "Roboto, Arial, sans-serif",
                    }}
                >
                    <span style={{ color: "#05b5e6", display: "flex" }}><ExternalLink size={20} /></span>
                    <span style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
                        <strong style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {titulo || endereco?.hostname || url}
                        </strong>
                        <span style={{ fontSize: 12, color: "#7A767F", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{url}</span>
                    </span>
                </a>
            );
        },
    },
);
