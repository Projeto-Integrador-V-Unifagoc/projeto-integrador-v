import { useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    FormControlLabel,
    IconButton,
    LinearProgress,
    Stack,
    Switch,
    TextField,
    Tooltip,
    Typography,
} from "@mui/material";
import { ExternalLink, Images, Pencil, Plus, Trash2, Upload } from "lucide-react";

import { siteAdminApi, urlImagem } from "../../services/site-api";
import type { SiteAlbum } from "../../services/site-api";
import { limparCacheSite } from "../LandingPage/useSite";
import { formatarData } from "../LandingPage/componentes";
import { CabecalhoPainel, CampoImagem, Carregando, Cartao, ChipStatus, SemRegistros, useFeedback } from "./componentes";

const HOJE = new Date().toISOString().slice(0, 10);

const VAZIO: Partial<SiteAlbum> = {
    titulo: "",
    descricao: "",
    capa: "",
    data: HOJE,
    status: "rascunho",
    ordem: 0,
};

export default function PainelGaleria() {
    const { avisar, erroDe, componente } = useFeedback();
    const inputFotos = useRef<HTMLInputElement | null>(null);

    const [albuns, setAlbuns] = useState<SiteAlbum[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [edicao, setEdicao] = useState<Partial<SiteAlbum> | null>(null);
    const [salvando, setSalvando] = useState(false);
    const [aberto, setAberto] = useState<SiteAlbum | null>(null);
    const [enviandoFotos, setEnviandoFotos] = useState(false);

    async function carregar() {
        setCarregando(true);
        try {
            setAlbuns(await siteAdminApi.listarAlbuns());
        } catch (err) {
            erroDe(err, "Não foi possível carregar os álbuns.");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    async function salvar() {
        if (!edicao?.titulo?.trim()) {
            avisar("Informe o título do álbum.", "error");
            return;
        }

        setSalvando(true);
        try {
            if (edicao.id) {
                await siteAdminApi.atualizarAlbum(edicao.id, edicao);
            } else {
                await siteAdminApi.criarAlbum({ ...edicao, ordem: edicao.ordem || albuns.length + 1 });
            }

            limparCacheSite();
            setEdicao(null);
            avisar("Álbum salvo.");
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível salvar o álbum.");
        } finally {
            setSalvando(false);
        }
    }

    async function publicar(album: SiteAlbum, publicado: boolean) {
        try {
            await siteAdminApi.atualizarAlbum(album.id, { ...album, status: publicado ? "publicado" : "rascunho" });
            limparCacheSite();
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível alterar o status.");
        }
    }

    async function remover(album: SiteAlbum) {
        if (!window.confirm(`Excluir o álbum "${album.titulo}" e todas as suas fotos?`)) return;

        try {
            await siteAdminApi.removerAlbum(album.id);
            limparCacheSite();
            avisar("Álbum excluído.");
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível excluir o álbum.");
        }
    }

    async function abrirFotos(album: SiteAlbum) {
        try {
            setAberto(await siteAdminApi.buscarAlbum(album.id));
        } catch (err) {
            erroDe(err, "Não foi possível abrir o álbum.");
        }
    }

    async function enviarFotos(arquivos: FileList | null) {
        if (!aberto || !arquivos || arquivos.length === 0) return;

        setEnviandoFotos(true);
        try {
            await siteAdminApi.enviarFotos(aberto.id, Array.from(arquivos));
            limparCacheSite();
            setAberto(await siteAdminApi.buscarAlbum(aberto.id));
            avisar("Fotos enviadas.");
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível enviar as fotos.");
        } finally {
            setEnviandoFotos(false);
            if (inputFotos.current) inputFotos.current.value = "";
        }
    }

    async function removerFoto(fotoId: string) {
        if (!aberto) return;

        try {
            await siteAdminApi.removerFoto(aberto.id, fotoId);
            limparCacheSite();
            setAberto(await siteAdminApi.buscarAlbum(aberto.id));
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível remover a foto.");
        }
    }

    return (
        <Box>
            <CabecalhoPainel
                titulo="Galeria de fotos"
                descricao="Crie álbuns por evento e envie várias fotos de uma vez."
                acao={
                    <Button variant="contained" onClick={() => setEdicao({ ...VAZIO })} sx={{ width: "auto", px: 3, height: 44 }}>
                        <Plus size={17} style={{ marginRight: 7 }} />
                        Novo álbum
                    </Button>
                }
            />

            {carregando ? (
                <Carregando />
            ) : albuns.length === 0 ? (
                <SemRegistros mensagem="Nenhum álbum criado. Crie um álbum e depois envie as fotos do evento." />
            ) : (
                <Box
                    sx={{
                        display: "grid",
                        gap: 2.5,
                        gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", lg: "repeat(3, 1fr)" },
                    }}
                >
                    {albuns.map((album) => (
                        <Cartao key={album.id} sx={{ p: 0, overflow: "hidden" }}>
                            <Box
                                sx={{
                                    height: 160,
                                    bgcolor: "#eef2f5",
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "center",
                                    backgroundImage: album.capa ? `url(${urlImagem(album.capa)})` : undefined,
                                    backgroundSize: "cover",
                                    backgroundPosition: "center",
                                }}
                            >
                                {!album.capa && <Images size={30} color="#9aa7b4" />}
                            </Box>

                            <Box sx={{ p: 2.5 }}>
                                <Stack direction="row" spacing={1.2} alignItems="center">
                                    <ChipStatus status={album.status} />
                                    <Typography sx={{ fontSize: ".82rem", color: "#8792a2" }}>
                                        {album.total_fotos ?? 0} fotos
                                    </Typography>
                                </Stack>

                                <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f1720", mt: 1 }}>
                                    {album.titulo}
                                </Typography>
                                {album.data && (
                                    <Typography sx={{ fontSize: ".84rem", color: "#8792a2", mt: .3 }}>
                                        {formatarData(album.data)}
                                    </Typography>
                                )}

                                <Stack direction="row" spacing={1} mt={2}>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        onClick={() => abrirFotos(album)}
                                        sx={{ width: "auto", fontSize: 13 }}
                                    >
                                        Gerenciar fotos
                                    </Button>

                                    <Box sx={{ flex: 1 }} />

                                    {album.status === "publicado" && (
                                        <Tooltip title="Ver no site">
                                            <IconButton size="small" onClick={() => window.open(`/galeria/${album.slug}`, "_blank")}>
                                                <ExternalLink size={16} />
                                            </IconButton>
                                        </Tooltip>
                                    )}
                                    <Tooltip title="Editar">
                                        <IconButton
                                            size="small"
                                            onClick={() =>
                                                setEdicao({ ...album, data: album.data?.slice(0, 10) ?? null })
                                            }
                                        >
                                            <Pencil size={16} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Excluir">
                                        <IconButton size="small" color="error" onClick={() => remover(album)}>
                                            <Trash2 size={16} />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>

                                <FormControlLabel
                                    control={
                                        <Switch
                                            size="small"
                                            checked={album.status === "publicado"}
                                            onChange={(e) => publicar(album, e.target.checked)}
                                        />
                                    }
                                    label={album.status === "publicado" ? "Visível no site" : "Oculto"}
                                    sx={{ mt: 1 }}
                                />
                            </Box>
                        </Cartao>
                    ))}
                </Box>
            )}

            <Dialog open={Boolean(edicao)} onClose={() => setEdicao(null)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 800 }}>{edicao?.id ? "Editar álbum" : "Novo álbum"}</DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2.5} pt={1}>
                        <TextField
                            label="Título"
                            value={edicao?.titulo ?? ""}
                            onChange={(e) => setEdicao((atual) => ({ ...atual, titulo: e.target.value }))}
                            fullWidth
                        />

                        <TextField
                            label="Descrição"
                            value={edicao?.descricao ?? ""}
                            onChange={(e) => setEdicao((atual) => ({ ...atual, descricao: e.target.value }))}
                            fullWidth
                            multiline
                            rows={3}
                        />

                        <TextField
                            label="Data do evento"
                            type="date"
                            value={edicao?.data?.slice(0, 10) ?? ""}
                            onChange={(e) => setEdicao((atual) => ({ ...atual, data: e.target.value }))}
                            fullWidth
                            InputLabelProps={{ shrink: true }}
                        />

                        <CampoImagem
                            rotulo="Capa do álbum"
                            valor={edicao?.capa ?? ""}
                            onChange={(url) => setEdicao((atual) => ({ ...atual, capa: url }))}
                            onErro={(msg) => avisar(msg, "error")}
                        />

                        <FormControlLabel
                            control={
                                <Switch
                                    checked={edicao?.status === "publicado"}
                                    onChange={(e) =>
                                        setEdicao((atual) => ({ ...atual, status: e.target.checked ? "publicado" : "rascunho" }))
                                    }
                                />
                            }
                            label="Publicar no site"
                        />
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

            <Dialog open={Boolean(aberto)} onClose={() => setAberto(null)} fullWidth maxWidth="md">
                <DialogTitle sx={{ fontWeight: 800 }}>Fotos — {aberto?.titulo}</DialogTitle>

                <DialogContent dividers>
                    <input
                        ref={inputFotos}
                        type="file"
                        accept="image/*"
                        multiple
                        hidden
                        onChange={(e) => enviarFotos(e.target.files)}
                    />

                    <Button
                        variant="outlined"
                        onClick={() => inputFotos.current?.click()}
                        disabled={enviandoFotos}
                        sx={{ width: "auto", mb: 2.5 }}
                    >
                        <Upload size={16} style={{ marginRight: 7 }} />
                        Enviar fotos (até 20 por vez)
                    </Button>

                    {enviandoFotos && <LinearProgress sx={{ mb: 2.5 }} />}

                    {(aberto?.fotos?.length ?? 0) === 0 ? (
                        <SemRegistros mensagem="Nenhuma foto neste álbum ainda." />
                    ) : (
                        <Box
                            sx={{
                                display: "grid",
                                gap: 1.5,
                                gridTemplateColumns: { xs: "repeat(2, 1fr)", sm: "repeat(3, 1fr)", md: "repeat(4, 1fr)" },
                            }}
                        >
                            {aberto?.fotos?.map((foto) => (
                                <Box
                                    key={foto.id}
                                    sx={{
                                        position: "relative",
                                        aspectRatio: "4 / 3",
                                        borderRadius: 2,
                                        overflow: "hidden",
                                        backgroundImage: `url(${urlImagem(foto.arquivo)})`,
                                        backgroundSize: "cover",
                                        backgroundPosition: "center",
                                    }}
                                >
                                    <IconButton
                                        size="small"
                                        onClick={() => removerFoto(foto.id)}
                                        aria-label="Remover foto"
                                        sx={{
                                            position: "absolute",
                                            top: 6,
                                            right: 6,
                                            bgcolor: "rgba(0,0,0,.55)",
                                            color: "#fff",
                                            "&:hover": { bgcolor: "rgba(200,30,30,.9)" },
                                        }}
                                    >
                                        <Trash2 size={15} />
                                    </IconButton>
                                </Box>
                            ))}
                        </Box>
                    )}
                </DialogContent>

                <DialogActions sx={{ px: 3, py: 2 }}>
                    <Button variant="contained" onClick={() => setAberto(null)} sx={{ width: "auto", px: 3 }}>
                        Concluir
                    </Button>
                </DialogActions>
            </Dialog>

            {componente}
        </Box>
    );
}
