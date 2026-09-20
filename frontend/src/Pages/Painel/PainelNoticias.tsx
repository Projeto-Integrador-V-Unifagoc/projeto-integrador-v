import { useEffect, useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControl,
    FormControlLabel,
    IconButton,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { ExternalLink, Pencil, Plus, Trash2 } from "lucide-react";

import { api } from "../../lib/axios";
import { siteAdminApi, urlImagem } from "../../services/site-api";
import type { SiteCategoria, SiteNoticia } from "../../services/site-api";
import { limparCacheSite } from "../LandingPage/useSite";
import { formatarData } from "../LandingPage/componentes";
import { CabecalhoPainel, CampoImagem, Carregando, Cartao, ChipStatus, SemRegistros, useFeedback } from "./componentes";

const HOJE = new Date().toISOString().slice(0, 10);

const VAZIA: Partial<SiteNoticia> = {
    titulo: "",
    resumo: "",
    conteudo: "",
    imagem: "",
    autor: "",
    categoria_id: null,
    publicado_em: HOJE,
    destaque: false,
    status: "rascunho",
};

export default function PainelNoticias() {
    const { avisar, erroDe, componente } = useFeedback();

    const [noticias, setNoticias] = useState<SiteNoticia[]>([]);
    const [categorias, setCategorias] = useState<SiteCategoria[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [edicao, setEdicao] = useState<Partial<SiteNoticia> | null>(null);
    const [salvando, setSalvando] = useState(false);

    async function carregar() {
        setCarregando(true);
        try {
            const [lista, categoriasApi] = await Promise.all([
                siteAdminApi.listarNoticias(),
                api.get("/site/categorias").then((r) => r.data),
            ]);

            setNoticias(lista);
            setCategorias(Array.isArray(categoriasApi) ? categoriasApi : []);
        } catch (err) {
            erroDe(err, "Não foi possível carregar as notícias.");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    async function salvar() {
        if (!edicao?.titulo?.trim()) {
            avisar("Informe o título da notícia.", "error");
            return;
        }

        setSalvando(true);
        try {
            if (edicao.id) {
                await siteAdminApi.atualizarNoticia(edicao.id, edicao);
            } else {
                await siteAdminApi.criarNoticia(edicao);
            }

            limparCacheSite();
            setEdicao(null);
            avisar("Notícia salva.");
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível salvar a notícia.");
        } finally {
            setSalvando(false);
        }
    }

    async function publicar(noticia: SiteNoticia, publicado: boolean) {
        try {
            await siteAdminApi.atualizarNoticia(noticia.id, {
                ...noticia,
                status: publicado ? "publicado" : "rascunho",
                publicado_em: noticia.publicado_em?.slice(0, 10) ?? HOJE,
            });
            limparCacheSite();
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível alterar o status.");
        }
    }

    async function remover(noticia: SiteNoticia) {
        if (!window.confirm(`Excluir a notícia "${noticia.titulo}"?`)) return;

        try {
            await siteAdminApi.removerNoticia(noticia.id);
            limparCacheSite();
            avisar("Notícia excluída.");
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível excluir a notícia.");
        }
    }

    return (
        <Box>
            <CabecalhoPainel
                titulo="Notícias e eventos"
                descricao="Publique comunicados, eventos e novidades na página de notícias."
                acao={
                    <Button variant="contained" onClick={() => setEdicao({ ...VAZIA })} sx={{ width: "auto", px: 3, height: 44 }}>
                        <Plus size={17} style={{ marginRight: 7 }} />
                        Nova notícia
                    </Button>
                }
            />

            {carregando ? (
                <Carregando />
            ) : noticias.length === 0 ? (
                <SemRegistros mensagem="Nenhuma notícia cadastrada ainda." />
            ) : (
                <Stack spacing={2}>
                    {noticias.map((noticia) => (
                        <Cartao key={noticia.id}>
                            <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems={{ md: "center" }}>
                                <Box
                                    sx={{
                                        width: { xs: "100%", md: 150 },
                                        height: 96,
                                        flexShrink: 0,
                                        borderRadius: 2,
                                        bgcolor: "#eef2f5",
                                        backgroundImage: noticia.imagem ? `url(${urlImagem(noticia.imagem)})` : undefined,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                    }}
                                />

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Stack direction="row" spacing={1.2} alignItems="center" flexWrap="wrap" useFlexGap>
                                        <ChipStatus status={noticia.status} />
                                        {noticia.categoria_nome && (
                                            <Typography sx={{ fontSize: ".82rem", color: "#8792a2" }}>
                                                {noticia.categoria_nome}
                                            </Typography>
                                        )}
                                        <Typography sx={{ fontSize: ".82rem", color: "#8792a2" }}>
                                            {formatarData(noticia.publicado_em)}
                                        </Typography>
                                    </Stack>

                                    <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f1720", mt: .8 }}>
                                        {noticia.titulo}
                                    </Typography>
                                    <Typography sx={{ color: "#5b6472", fontSize: ".92rem", mt: .4 }} noWrap>
                                        {noticia.resumo}
                                    </Typography>
                                </Box>

                                <Stack spacing={1} alignItems={{ xs: "flex-start", md: "flex-end" }}>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={noticia.status === "publicado"}
                                                onChange={(e) => publicar(noticia, e.target.checked)}
                                            />
                                        }
                                        label={noticia.status === "publicado" ? "No ar" : "Rascunho"}
                                        sx={{ mr: 0 }}
                                    />

                                    <Stack direction="row" spacing={.5}>
                                        {noticia.status === "publicado" && (
                                            <Tooltip title="Ver no site">
                                                <IconButton
                                                    size="small"
                                                    onClick={() => window.open(`/noticias/${noticia.slug}`, "_blank")}
                                                >
                                                    <ExternalLink size={17} />
                                                </IconButton>
                                            </Tooltip>
                                        )}
                                        <Tooltip title="Editar">
                                            <IconButton
                                                size="small"
                                                onClick={() =>
                                                    setEdicao({
                                                        ...noticia,
                                                        publicado_em: noticia.publicado_em?.slice(0, 10) ?? null,
                                                    })
                                                }
                                            >
                                                <Pencil size={17} />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Excluir">
                                            <IconButton size="small" color="error" onClick={() => remover(noticia)}>
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

            <Dialog open={Boolean(edicao)} onClose={() => setEdicao(null)} fullWidth maxWidth="md">
                <DialogTitle sx={{ fontWeight: 800 }}>{edicao?.id ? "Editar notícia" : "Nova notícia"}</DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2.5} pt={1}>
                        <TextField
                            label="Título"
                            value={edicao?.titulo ?? ""}
                            onChange={(e) => setEdicao((atual) => ({ ...atual, titulo: e.target.value }))}
                            fullWidth
                        />

                        <TextField
                            label="Resumo"
                            value={edicao?.resumo ?? ""}
                            onChange={(e) => setEdicao((atual) => ({ ...atual, resumo: e.target.value }))}
                            fullWidth
                            multiline
                            rows={2}
                            helperText="Texto curto que aparece no card da notícia."
                        />

                        <TextField
                            label="Conteúdo"
                            value={edicao?.conteudo ?? ""}
                            onChange={(e) => setEdicao((atual) => ({ ...atual, conteudo: e.target.value }))}
                            fullWidth
                            multiline
                            rows={9}
                            helperText="Separe os parágrafos com uma linha em branco."
                        />

                        <CampoImagem
                            rotulo="Imagem de capa"
                            valor={edicao?.imagem ?? ""}
                            onChange={(url) => setEdicao((atual) => ({ ...atual, imagem: url }))}
                            onErro={(msg) => avisar(msg, "error")}
                        />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <FormControl fullWidth>
                                <InputLabel id="categoria-noticia">Categoria</InputLabel>
                                <Select
                                    labelId="categoria-noticia"
                                    label="Categoria"
                                    value={edicao?.categoria_id ?? ""}
                                    onChange={(e) =>
                                        setEdicao((atual) => ({ ...atual, categoria_id: e.target.value || null }))
                                    }
                                >
                                    <MenuItem value="">Sem categoria</MenuItem>
                                    {categorias.map((categoria) => (
                                        <MenuItem key={categoria.id} value={categoria.id}>
                                            {categoria.nome}
                                        </MenuItem>
                                    ))}
                                </Select>
                            </FormControl>

                            <TextField
                                label="Autor"
                                value={edicao?.autor ?? ""}
                                onChange={(e) => setEdicao((atual) => ({ ...atual, autor: e.target.value }))}
                                fullWidth
                            />

                            <TextField
                                label="Data de publicação"
                                type="date"
                                value={edicao?.publicado_em?.slice(0, 10) ?? ""}
                                onChange={(e) => setEdicao((atual) => ({ ...atual, publicado_em: e.target.value }))}
                                fullWidth
                                InputLabelProps={{ shrink: true }}
                            />
                        </Stack>

                        <Stack direction="row" spacing={3} flexWrap="wrap">
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={edicao?.status === "publicado"}
                                        onChange={(e) =>
                                            setEdicao((atual) => ({
                                                ...atual,
                                                status: e.target.checked ? "publicado" : "rascunho",
                                            }))
                                        }
                                    />
                                }
                                label="Publicar no site"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(edicao?.destaque)}
                                        onChange={(e) => setEdicao((atual) => ({ ...atual, destaque: e.target.checked }))}
                                    />
                                }
                                label="Destacar"
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
