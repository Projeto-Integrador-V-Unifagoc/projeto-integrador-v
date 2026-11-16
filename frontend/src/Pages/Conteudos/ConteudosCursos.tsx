import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Box, Card, CardActionArea, CardContent, Grid, InputAdornment, Skeleton, Stack, TextField, Typography } from "@mui/material";
import { ArrowRight, GraduationCap, Search } from "lucide-react";
import Container from "../../components/Container";
import { conteudoApi, mensagemDeErro } from "../../services/conteudo-api";
import type { CursoConteudo } from "../../models/conteudo-model";
import { ehGestorDeConteudo } from "./conteudo-perfil";

export default function ConteudosCursos() {
    const navigate = useNavigate();
    const gestor = ehGestorDeConteudo();
    const [cursos, setCursos] = useState<CursoConteudo[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState<string | null>(null);
    const [busca, setBusca] = useState("");

    useEffect(() => {
        conteudoApi
            .listarCursos()
            .then(setCursos)
            .catch((e) => setErro(mensagemDeErro(e, "Não foi possível carregar os cursos.")))
            .finally(() => setCarregando(false));
    }, []);

    const filtrados = useMemo(() => {
        const termo = busca.trim().toLowerCase();
        return termo ? cursos.filter((c) => `${c.nome} ${c.codigo}`.toLowerCase().includes(termo)) : cursos;
    }, [cursos, busca]);

    return (
        <Container>
            <Stack gap={3} sx={{ py: 3 }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" gap={2}>
                    <Box>
                        <Typography variant="h5" fontWeight={700}>
                            {gestor ? "Conteúdos Acadêmicos" : "Meus Conteúdos"}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            {gestor
                                ? "Selecione um curso para ver as disciplinas da matriz curricular."
                                : "Selecione um curso para ver as disciplinas que você leciona."}
                        </Typography>
                    </Box>
                    <TextField
                        placeholder="Buscar curso..."
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        sx={{ maxWidth: { sm: 320 } }}
                        InputProps={{ startAdornment: <InputAdornment position="start"><Search size={16} /></InputAdornment> }}
                    />
                </Stack>

                {erro && <Alert severity="error">{erro}</Alert>}

                {carregando ? (
                    <Grid container spacing={2}>
                        {[1, 2, 3].map((i) => (
                            <Grid key={i} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Skeleton variant="rounded" height={140} />
                            </Grid>
                        ))}
                    </Grid>
                ) : filtrados.length === 0 && !erro ? (
                    <Stack alignItems="center" gap={1} sx={{ py: 6 }}>
                        <Box component="img" src="/assets/nodata.svg" alt="" sx={{ width: 160, opacity: 0.8 }} />
                        <Typography color="text.secondary" textAlign="center">
                            {busca
                                ? "Nenhum curso encontrado."
                                : gestor
                                    ? "Nenhum curso com disciplinas na matriz curricular."
                                    : "Você ainda não possui disciplinas vinculadas ao seu perfil. Procure a secretaria."}
                        </Typography>
                    </Stack>
                ) : (
                    <Grid container spacing={2}>
                        {filtrados.map((curso) => (
                            <Grid key={curso.id} size={{ xs: 12, sm: 6, md: 4 }}>
                                <Card
                                    variant="outlined"
                                    sx={{ height: "100%", transition: "all .15s", "&:hover": { borderColor: "primary.main", boxShadow: 3 } }}
                                >
                                    <CardActionArea sx={{ height: "100%" }} onClick={() => navigate(`/conteudos/cursos/${curso.id}`)}>
                                        <CardContent>
                                            <Stack gap={1.5}>
                                                <Box sx={{ color: "primary.main" }}><GraduationCap size={28} /></Box>
                                                <Box>
                                                    <Typography fontWeight={700}>{curso.nome}</Typography>
                                                    <Typography variant="body2" color="text.secondary">{curso.codigo}</Typography>
                                                </Box>
                                                <Typography variant="body2">
                                                    {curso.totalDisciplinas} {curso.totalDisciplinas === 1 ? "disciplina" : "disciplinas"}
                                                    {gestor ? " na matriz" : " suas neste curso"}
                                                </Typography>
                                                <Stack direction="row" alignItems="center" gap={0.5} sx={{ color: "primary.main" }}>
                                                    <Typography variant="body2" fontWeight={700}>Acessar</Typography>
                                                    <ArrowRight size={16} />
                                                </Stack>
                                            </Stack>
                                        </CardContent>
                                    </CardActionArea>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Stack>
        </Container>
    );
}
