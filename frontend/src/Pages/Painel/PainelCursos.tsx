import { useEffect, useState } from "react";
import {
    Alert,
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
import { Pencil } from "lucide-react";

import { siteAdminApi } from "../../services/site-api";
import type { SiteCursoAdmin } from "../../services/site-api";
import { limparCacheSite } from "../LandingPage/useSite";
import { CabecalhoPainel, CampoImagem, Carregando, Cartao, SemRegistros, useFeedback } from "./componentes";

export default function PainelCursos() {
    const { avisar, erroDe, componente } = useFeedback();

    const [cursos, setCursos] = useState<SiteCursoAdmin[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [edicao, setEdicao] = useState<SiteCursoAdmin | null>(null);
    const [salvando, setSalvando] = useState(false);

    async function carregar() {
        setCarregando(true);
        try {
            setCursos(await siteAdminApi.listarCursos());
        } catch (err) {
            erroDe(err, "Não foi possível carregar os cursos.");
        } finally {
            setCarregando(false);
        }
    }

    useEffect(() => {
        carregar();
    }, []);

    async function alternar(curso: SiteCursoAdmin, campo: "ativo" | "inscricoes_abertas", valor: boolean) {
        try {
            await siteAdminApi.atualizarCurso(curso.id, { ...curso, [campo]: valor });
            limparCacheSite();
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível atualizar o curso.");
        }
    }

    async function salvar() {
        if (!edicao) return;

        setSalvando(true);
        try {
            await siteAdminApi.atualizarCurso(edicao.id, edicao);
            limparCacheSite();
            setEdicao(null);
            avisar("Curso atualizado.");
            carregar();
        } catch (err) {
            erroDe(err, "Não foi possível salvar o curso.");
        } finally {
            setSalvando(false);
        }
    }

    return (
        <Box>
            <CabecalhoPainel
                titulo="Cursos no site"
                descricao="Os cursos vêm do cadastro acadêmico. Aqui você escolhe quais aparecem no site e quais aceitam inscrição."
            />

            <Alert severity="info" sx={{ mb: 3 }}>
                Para incluir um curso novo, cadastre-o primeiro em Cursos no sistema acadêmico. Ele aparece nesta lista
                automaticamente.
            </Alert>

            {carregando ? (
                <Carregando />
            ) : cursos.length === 0 ? (
                <SemRegistros mensagem="Nenhum curso cadastrado no sistema acadêmico." />
            ) : (
                <Stack spacing={2}>
                    {cursos.map((curso) => (
                        <Cartao key={curso.id} sx={{ opacity: curso.ativo === false ? .6 : 1 }}>
                            <Stack direction={{ xs: "column", md: "row" }} spacing={2.5} alignItems={{ md: "center" }}>
                                <Box sx={{ flex: 1, minWidth: 0 }}>
                                    <Typography sx={{ fontSize: ".78rem", color: "#8792a2", letterSpacing: .6 }}>
                                        {curso.codigo}
                                    </Typography>
                                    <Typography sx={{ fontWeight: 800, fontSize: "1.05rem", color: "#0f1720", mt: .3 }}>
                                        {curso.nome}
                                    </Typography>

                                    <Stack direction="row" spacing={2} mt={.8} flexWrap="wrap" useFlexGap>
                                        {curso.duracao && (
                                            <Typography sx={{ fontSize: ".86rem", color: "#5b6472" }}>
                                                {curso.duracao}
                                            </Typography>
                                        )}
                                        {curso.turno && (
                                            <Typography sx={{ fontSize: ".86rem", color: "#5b6472" }}>
                                                {curso.turno}
                                            </Typography>
                                        )}
                                        {!curso.resumo && (
                                            <Typography sx={{ fontSize: ".86rem", color: "#c08a1e" }}>
                                                Sem descrição para o site
                                            </Typography>
                                        )}
                                    </Stack>
                                </Box>

                                <Stack direction={{ xs: "column", sm: "row" }} spacing={1} alignItems="center">
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={curso.ativo !== false}
                                                onChange={(e) => alternar(curso, "ativo", e.target.checked)}
                                            />
                                        }
                                        label="No site"
                                    />
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={curso.inscricoes_abertas !== false}
                                                onChange={(e) => alternar(curso, "inscricoes_abertas", e.target.checked)}
                                            />
                                        }
                                        label="Inscrições"
                                    />
                                    <Tooltip title="Editar dados do site">
                                        <IconButton size="small" onClick={() => setEdicao(curso)}>
                                            <Pencil size={17} />
                                        </IconButton>
                                    </Tooltip>
                                </Stack>
                            </Stack>
                        </Cartao>
                    ))}
                </Stack>
            )}

            <Dialog open={Boolean(edicao)} onClose={() => setEdicao(null)} fullWidth maxWidth="sm">
                <DialogTitle sx={{ fontWeight: 800 }}>{edicao?.nome}</DialogTitle>

                <DialogContent dividers>
                    <Stack spacing={2.5} pt={1}>
                        <TextField
                            label="Descrição para o site"
                            value={edicao?.resumo ?? ""}
                            onChange={(e) => setEdicao((atual) => (atual ? { ...atual, resumo: e.target.value } : atual))}
                            fullWidth
                            multiline
                            rows={3}
                        />

                        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                            <TextField
                                label="Duração"
                                placeholder="8 semestres"
                                value={edicao?.duracao ?? ""}
                                onChange={(e) => setEdicao((atual) => (atual ? { ...atual, duracao: e.target.value } : atual))}
                                fullWidth
                            />
                            <TextField
                                label="Turno"
                                placeholder="Noturno"
                                value={edicao?.turno ?? ""}
                                onChange={(e) => setEdicao((atual) => (atual ? { ...atual, turno: e.target.value } : atual))}
                                fullWidth
                            />
                            <TextField
                                label="Grau"
                                placeholder="Bacharelado"
                                value={edicao?.grau ?? ""}
                                onChange={(e) => setEdicao((atual) => (atual ? { ...atual, grau: e.target.value } : atual))}
                                fullWidth
                            />
                        </Stack>

                        <CampoImagem
                            rotulo="Imagem do curso"
                            valor={edicao?.imagem ?? ""}
                            onChange={(url) => setEdicao((atual) => (atual ? { ...atual, imagem: url } : atual))}
                            onErro={(msg) => avisar(msg, "error")}
                        />

                        <Stack direction="row" spacing={3} flexWrap="wrap">
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={edicao?.ativo !== false}
                                        onChange={(e) => setEdicao((atual) => (atual ? { ...atual, ativo: e.target.checked } : atual))}
                                    />
                                }
                                label="Exibir no site"
                            />
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={edicao?.inscricoes_abertas !== false}
                                        onChange={(e) =>
                                            setEdicao((atual) => (atual ? { ...atual, inscricoes_abertas: e.target.checked } : atual))
                                        }
                                    />
                                }
                                label="Aceitar inscrições"
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
