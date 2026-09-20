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

import { siteAdminApi } from "../../services/site-api";
import type { SiteMenuItem } from "../../services/site-api";
import { limparCacheSite } from "../LandingPage/useSite";
import { CabecalhoPainel, Carregando, Cartao, SemRegistros, useFeedback } from "./componentes";

const VAZIO: Partial<SiteMenuItem> = { rotulo: "", url: "", ativo: true, externo: false, ordem: 0 };

export default function PainelMenu() {
    const { avisar, erroDe, componente } = useFeedback();

    const [itens, setItens] = useState<SiteMenuItem[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [edicao, setEdicao] = useState<Partial<SiteMenuItem> | null>(null);
    const [salvando, setSalvando] = useState(false);

    async function carregar() {
        setCarregando(true);
        try {
            setItens(await siteAdminApi.listarMenu());
        } catch (err) {
            erroDe(err, "Não foi possível carregar o menu.");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    async function salvar() {
        if (!edicao?.rotulo?.trim() || !edicao?.url?.trim()) {
            avisar("Informe o nome e o endereço do item.", "error");
            return;
        }

        setSalvando(true);
        try {
            if (edicao.id) {
                await siteAdminApi.atualizarMenuItem(edicao.id, edicao);
            } else {
                await siteAdminApi.criarMenuItem({ ...edicao, ordem: edicao.ordem || itens.length + 1 });
            }

            limparCacheSite();
            setEdicao(null);
            avisar("Menu atualizado.");
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível salvar o item.");
        } finally {
            setSalvando(false);
        }
    }

    async function mover(item: SiteMenuItem, direcao: -1 | 1) {
        const indice = itens.findIndex((atual) => atual.id === item.id);
        const vizinho = itens[indice + direcao];
        if (!vizinho) return;

        try {
            await Promise.all([
                siteAdminApi.atualizarMenuItem(item.id, { ...item, ordem: vizinho.ordem }),
                siteAdminApi.atualizarMenuItem(vizinho.id, { ...vizinho, ordem: item.ordem }),
            ]);
            limparCacheSite();
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível reordenar.");
        }
    }

    async function alternar(item: SiteMenuItem) {
        try {
            await siteAdminApi.atualizarMenuItem(item.id, { ...item, ativo: !item.ativo });
            limparCacheSite();
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível alterar o item.");
        }
    }

    async function remover(item: SiteMenuItem) {
        if (!window.confirm(`Remover "${item.rotulo}" do menu?`)) return;

        try {
            await siteAdminApi.removerMenuItem(item.id);
            limparCacheSite();
            avisar("Item removido.");
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível remover o item.");
        }
    }

    return (
        <Box>
            <CabecalhoPainel
                titulo="Menu do site"
                descricao="Ordem e nomes das abas que aparecem no topo. Cada item abre a sua própria página."
                acao={
                    <Button variant="contained" onClick={() => setEdicao({ ...VAZIO })} sx={{ width: "auto", px: 3, height: 44 }}>
                        <Plus size={17} style={{ marginRight: 7 }} />
                        Novo item
                    </Button>
                }
            />

            {carregando ? (
                <Carregando />
            ) : itens.length === 0 ? (
                <SemRegistros mensagem="Nenhum item no menu." />
            ) : (
                <Stack spacing={1.5}>
                    {itens.map((item, indice) => (
                        <Cartao key={item.id} sx={{ py: 2, opacity: item.ativo ? 1 : .55 }}>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Typography sx={{ fontWeight: 800, color: "#c3ccd6", fontSize: "1.1rem", width: 28 }}>
                                    {indice + 1}
                                </Typography>

                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#0f1720" }}>
                                        {item.rotulo}
                                    </Typography>
                                    <Typography sx={{ fontSize: ".86rem", color: "#8792a2" }}>{item.url}</Typography>
                                </Box>

                                <FormControlLabel
                                    control={<Switch size="small" checked={item.ativo} onChange={() => alternar(item)} />}
                                    label={item.ativo ? "Visível" : "Oculto"}
                                    sx={{ mr: 0, display: { xs: "none", sm: "flex" } }}
                                />

                                <Stack direction="row" spacing={.3}>
                                    <Tooltip title="Subir">
                                        <span>
                                            <IconButton size="small" disabled={indice === 0} onClick={() => mover(item, -1)}>
                                                <ArrowUp size={17} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Descer">
                                        <span>
                                            <IconButton
                                                size="small"
                                                disabled={indice === itens.length - 1}
                                                onClick={() => mover(item, 1)}
                                            >
                                                <ArrowDown size={17} />
                                            </IconButton>
                                        </span>
                                    </Tooltip>
                                    <Tooltip title="Editar">
                                        <IconButton size="small" onClick={() => setEdicao(item)}>
                                            <Pencil size={17} />
                                        </IconButton>
                                    </Tooltip>
                                    <Tooltip title="Remover">
                                        <IconButton size="small" color="error" onClick={() => remover(item)}>
                                            <Trash2 size={17} />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </Stack>
                        </Cartao>
                    ))}
                </Stack>
            )}

            <Dialog open={Boolean(edicao)} onClose={() => setEdicao(null)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 800 }}>{edicao?.id ? "Editar item" : "Novo item"}</DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2.5} pt={1}>
                        <TextField
                            label="Nome da aba"
                            value={edicao?.rotulo ?? ""}
                            onChange={(e) => setEdicao((atual) => ({ ...atual, rotulo: e.target.value }))}
                            fullWidth
                        />
                        <TextField
                            label="Endereço"
                            value={edicao?.url ?? ""}
                            onChange={(e) => setEdicao((atual) => ({ ...atual, url: e.target.value }))}
                            fullWidth
                            helperText="Páginas do site: / , /sobre , /cursos , /noticias , /galeria , /contato"
                        />

                        <Stack direction="row" spacing={3}>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(edicao?.ativo)}
                                        onChange={(e) => setEdicao((atual) => ({ ...atual, ativo: e.target.checked }))}
                                    />
                                }
                                label="Visível"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={Boolean(edicao?.externo)}
                                        onChange={(e) => setEdicao((atual) => ({ ...atual, externo: e.target.checked }))}
                                    />
                                }
                                label="Link externo"
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
