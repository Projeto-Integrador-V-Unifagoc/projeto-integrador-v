import { useEffect, useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from "lucide-react";

import { siteAdminApi, urlImagem } from "../../services/site-api";
import type { SiteBanner } from "../../services/site-api";
import { limparCacheSite } from "../LandingPage/useSite";
import { CabecalhoPainel, CampoImagem, Carregando, Cartao, SemRegistros, useFeedback } from "./componentes";

const VAZIO: Partial<SiteBanner> = {
    titulo: "",
    subtitulo: "",
    imagem_desktop: "",
    imagem_mobile: "",
    texto_botao: "FAÇA SUA INSCRIÇÃO",
    url_botao: "/inscricao",
    nova_aba: false,
    destaque: false,
    ativo: true,
    ordem: 0,
};

export default function PainelBanners() {
    const { avisar, erroDe, componente } = useFeedback();

    const [banners, setBanners] = useState<SiteBanner[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [edicao, setEdicao] = useState<Partial<SiteBanner> | null>(null);
    const [salvando, setSalvando] = useState(false);

    async function carregar() {
        setCarregando(true);
        try {
            setBanners(await siteAdminApi.listarBanners());
        } catch (err) {
            erroDe(err, "Não foi possível carregar os banners.");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    async function salvar() {
        if (!edicao?.titulo?.trim()) {
            avisar("Informe o título do banner.", "error");
            return;
        }

        setSalvando(true);
        try {
            if (edicao.id) {
                await siteAdminApi.atualizarBanner(edicao.id, edicao);
            } else {
                await siteAdminApi.criarBanner({ ...edicao, ordem: edicao.ordem || banners.length + 1 });
            }

            limparCacheSite();
            setEdicao(null);
            avisar("Banner salvo.");
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível salvar o banner.");
        } finally {
            setSalvando(false);
        }
    }

    async function alternarAtivo(banner: SiteBanner) {
        try {
            await siteAdminApi.atualizarBanner(banner.id, { ...banner, ativo: !banner.ativo });
            limparCacheSite();
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível alterar o banner.");
        }
    }

    async function mover(banner: SiteBanner, direcao: -1 | 1) {
        const indice = banners.findIndex((item) => item.id === banner.id);
        const vizinho = banners[indice + direcao];
        if (!vizinho) return;

        try {
            await Promise.all([
                siteAdminApi.atualizarBanner(banner.id, { ...banner, ordem: vizinho.ordem }),
                siteAdminApi.atualizarBanner(vizinho.id, { ...vizinho, ordem: banner.ordem }),
            ]);
            limparCacheSite();
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível reordenar.");
        }
    }

    async function remover(banner: SiteBanner) {
        if (!window.confirm(`Excluir o banner "${banner.titulo}"?`)) return;

        try {
            await siteAdminApi.removerBanner(banner.id);
            limparCacheSite();
            avisar("Banner excluído.");
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível excluir o banner.");
        }
    }

    return (
        <Box>
            <CabecalhoPainel
                titulo="Banners do carrossel"
                descricao="As imagens que passam sozinhas no topo da página inicial."
                acao={
                    <Button variant="contained" onClick={() => setEdicao({ ...VAZIO })} sx={{ width: "auto", px: 3, height: 44 }}>
                        <Plus size={17} style={{ marginRight: 7 }} />
                        Novo banner
                    </Button>
                }
            />

            {carregando ? (
                <Carregando />
            ) : banners.length === 0 ? (
                <SemRegistros mensagem="Nenhum banner cadastrado. Clique em 'Novo banner' para adicionar a primeira imagem." />
            ) : (
                <Stack spacing={2}>
                    {banners.map((banner, indice) => (
                        <Cartao key={banner.id} sx={{ opacity: banner.ativo ? 1 : .55 }}>
                            <Stack direction={{ xs: "column", md: "row" }} spacing={2.5}>
                                <Box
                                    sx={{
                                        width: { xs: "100%", md: 260 },
                                        height: 140,
                                        flexShrink: 0,
                                        borderRadius: 2,
                                        bgcolor: "#eef2f5",
                                        backgroundImage: banner.imagem_desktop ? `url(${urlImagem(banner.imagem_desktop)})` : undefined,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                    }}
                                />

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 800, fontSize: "1.08rem", color: "#0f1720" }}>
                                        {banner.titulo}
                                    </Typography>
                                    <Typography sx={{ color: "#5b6472", fontSize: ".93rem", mt: .6 }}>
                                        {banner.subtitulo}
                                    </Typography>
                                    <Typography sx={{ color: "#8792a2", fontSize: ".85rem", mt: 1.2 }}>
                                        Botão: {banner.texto_botao} → {banner.url_botao}
                                    </Typography>
                                </Box>

                                <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                                    <FormControlLabel
                                        control={<Switch checked={banner.ativo} onChange={() => alternarAtivo(banner)} />}
                                        label={banner.ativo ? "No ar" : "Oculto"}
                                        sx={{ mr: 0 }}
                                    />

                                    <Stack direction="row" spacing={.5}>
                                        <Tooltip title="Subir">
                                            <span>
                                                <IconButton size="small" disabled={indice === 0} onClick={() => mover(banner, -1)}>
                                                    <ArrowUp size={17} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title="Descer">
                                            <span>
                                                <IconButton
                                                    size="small"
                                                    disabled={indice === banners.length - 1}
                                                    onClick={() => mover(banner, 1)}
                                                >
                                                    <ArrowDown size={17} />
                                                </IconButton>
                                            </span>
                                        </Tooltip>
                                        <Tooltip title="Editar">
                                            <IconButton size="small" onClick={() => setEdicao(banner)}>
                                                <Pencil size={17} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Excluir">
                                            <IconButton size="small" color="error" onClick={() => remover(banner)}>
                                                <Trash2 size={17} />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Stack>
                            </Stack>
                        </Cartao>
                    ))}
                </Stack>
            )}

            <Dialog open={Boolean(edicao)} onClose={() => setEdicao(null)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 800 }}>{edicao?.id ? "Editar banner" : "Novo banner"}</DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2.5} pt={1}>
                        <TextField
                            label="Título"
                            value={edicao?.titulo ?? ""}
                            onChange={(e) => setEdicao((atual) => ({ ...atual, titulo: e.target.value }))}
                            fullWidth
                            helperText="Aparece em destaque sobre a imagem."
                        />

                        <TextField
                            label="Subtítulo"
                            value={edicao?.subtitulo ?? ""}
                            onChange={(e) => setEdicao((atual) => ({ ...atual, subtitulo: e.target.value }))}
                            fullWidth
                        />

                        <CampoImagem
                            rotulo="Imagem (desktop)"
                            valor={edicao?.imagem_desktop ?? ""}
                            onChange={(url) =>
                                setEdicao((atual) => ({
                                    ...atual,
                                    imagem_desktop: url,
                                    imagem_mobile: atual?.imagem_mobile || url,
                                }))
                            }
                            onErro={(msg) => avisar(msg, "error")}
                        />

                        <CampoImagem
                            rotulo="Imagem (celular) — opcional"
                            valor={edicao?.imagem_mobile ?? ""}
                            altura={140}
                            onChange={(url) => setEdicao((atual) => ({ ...atual, imagem_mobile: url }))}
                            onErro={(msg) => avisar(msg, "error")}
                        />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Texto do botão"
                                value={edicao?.texto_botao ?? ""}
                                onChange={(e) => setEdicao((atual) => ({ ...atual, texto_botao: e.target.value }))}
                                fullWidth
                            />
                            <TextField
                                label="Link do botão"
                                value={edicao?.url_botao ?? ""}
                                onChange={(e) => setEdicao((atual) => ({ ...atual, url_botao: e.target.value }))}
                                fullWidth
                                helperText="/inscricao ou um endereço completo."
                            />
                        </Stack>

                        <Stack direction="row" spacing={3} flexWrap="wrap">
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(edicao?.ativo)}
                                        onChange={(e) => setEdicao((atual) => ({ ...atual, ativo: e.target.checked }))}
                                    />
                                }
                                label="Exibir no site"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(edicao?.nova_aba)}
                                        onChange={(e) => setEdicao((atual) => ({ ...atual, nova_aba: e.target.checked }))}
                                    />
                                }
                                label="Abrir em nova aba"
                            />
                        </Stack>
                    </Stack>
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button onClick={() => setEdicao(null)} sx={{ width: "auto" }}>
                        Cancelar
                    </Button>
                    <Button variant="contained" onClick={salvar} disabled={salvando} sx={{ width: "auto", px: 3 }}>
                        {salvando ? "Salvando..." : "Salvar"}
                    </Button>
                </DialogActions>
            </Dialog>

            {componente}
        </Box>
    );
}
