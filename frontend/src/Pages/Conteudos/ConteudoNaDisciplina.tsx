import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert, Button, Paper, Skeleton, Stack, Typography } from "@mui/material";
import { ArrowRight, Library } from "lucide-react";
import { conteudoApi } from "../../services/conteudo-api";
import type { ConteudoPublicado } from "../../models/conteudo-model";

// Seção "Conteúdos" do detalhe da disciplina na Home do aluno.
export default function ConteudoNaDisciplina({ turmaDisciplinaId }: { turmaDisciplinaId: string }) {
    const navigate = useNavigate();
    const [conteudo, setConteudo] = useState<ConteudoPublicado | null>(null);
    const [falhou, setFalhou] = useState(false);

    useEffect(() => {
        // O componente é recriado (key) a cada disciplina: não precisa limpar o estado aqui.
        let ativo = true;
        conteudoApi
            .conteudoDoAluno(turmaDisciplinaId)
            .then((dados) => ativo && setConteudo(dados))
            .catch(() => ativo && setFalhou(true));
        return () => {
            ativo = false;
        };
    }, [turmaDisciplinaId]);

    const totalPaginas = conteudo?.topicos.reduce((soma, t) => soma + t.paginas.length, 0) ?? 0;

    return (
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2.5 }}>
            <Stack direction="row" alignItems="center" gap={1} mb={1.5}>
                <Library size={18} />
                <Typography fontWeight={800}>Conteúdos da disciplina</Typography>
            </Stack>
            {falhou ? (
                <Alert severity="warning">Não foi possível carregar os conteúdos agora.</Alert>
            ) : !conteudo ? (
                <Skeleton variant="rounded" height={56} />
            ) : conteudo.topicos.length === 0 ? (
                <Typography variant="body2" color="text.secondary">O professor ainda não publicou conteúdo nesta disciplina.</Typography>
            ) : (
                <Stack gap={1.5}>
                    <Stack gap={0.5}>
                        {conteudo.topicos.slice(0, 4).map((t) => (
                            <Typography key={t.id} variant="body2">
                                • {t.titulo}{" "}
                                <Typography component="span" variant="caption" color="text.secondary">
                                    ({t.paginas.length} {t.paginas.length === 1 ? "página" : "páginas"})
                                </Typography>
                            </Typography>
                        ))}
                        {conteudo.topicos.length > 4 && (
                            <Typography variant="caption" color="text.secondary">e mais {conteudo.topicos.length - 4} tópicos</Typography>
                        )}
                    </Stack>
                    <Button
                        variant="contained"
                        endIcon={<ArrowRight size={16} />}
                        sx={{ alignSelf: "flex-start", textTransform: "none", fontWeight: 700, width: "auto", height: "auto", minHeight: 32 }}
                        onClick={() => navigate(`/minhas-disciplinas/${turmaDisciplinaId}/conteudo`)}
                    >
                        Abrir conteúdo ({totalPaginas} {totalPaginas === 1 ? "página" : "páginas"})
                    </Button>
                </Stack>
            )}
        </Paper>
    );
}
