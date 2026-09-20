import { useEffect, useState } from "react";
import { Alert, Box, Button, Chip, Stack, Typography } from "@mui/material";
import { ExternalLink } from "lucide-react";

import { api } from "../../lib/axios";
import { CabecalhoPainel, Carregando, Cartao, SemRegistros, useFeedback } from "./componentes";

interface UsuarioPainel {
    id: string;
    nome?: string;
    email: string;
    tipo_usuario: string;
}

const CORES: Record<string, { bg: string; cor: string }> = {
    administrador: { bg: "#e7edff", cor: "#2b4a9e" },
    secretaria: { bg: "#e3f7ec", cor: "#116b41" },
    professor: { bg: "#fdf3e2", cor: "#9a6510" },
    aluno: { bg: "#eef2f5", cor: "#51606e" },
};

export default function PainelUsuarios() {
    const { erroDe, componente } = useFeedback();

    const [usuarios, setUsuarios] = useState<UsuarioPainel[]>([]);
    const [carregando, setCarregando] = useState(true);
    const [semPermissao, setSemPermissao] = useState(false);

    useEffect(() => {
        api.get("/usuarios")
            .then(({ data }) => setUsuarios(Array.isArray(data) ? data : []))
            .catch((err) => {
                if (err?.response?.status === 403) {
                    setSemPermissao(true);
                    return;
                }
                erroDe(err, "Não foi possível carregar os usuários.");
            })
            .finally(() => setCarregando(false));
    }, []);

    const administrativos = usuarios.filter((usuario) =>
        ["administrador", "secretaria"].includes(String(usuario.tipo_usuario).toLowerCase()),
    );

    return (
        <Box>
            <CabecalhoPainel
                titulo="Usuários com acesso ao painel"
                descricao="Somente perfis administrador e secretaria conseguem entrar em /painel."
                acao={
                    <Button
                        variant="outlined"
                        onClick={() => window.open("/usuarios/lista", "_blank")}
                        sx={{ width: "auto", px: 3, height: 44 }}
                    >
                        <ExternalLink size={16} style={{ marginRight: 7 }} />
                        Cadastrar usuário
                    </Button>
                }
            />

            {semPermissao ? (
                <Alert severity="warning">
                    A listagem de usuários do sistema é liberada apenas para o perfil secretaria. Peça à secretaria para
                    cadastrar ou alterar acessos, ou use a tela de usuários do sistema.
                </Alert>
            ) : carregando ? (
                <Carregando />
            ) : administrativos.length === 0 ? (
                <SemRegistros mensagem="Nenhum usuário administrativo encontrado." />
            ) : (
                <Stack spacing={1.5}>
                    {administrativos.map((usuario) => {
                        const tipo = String(usuario.tipo_usuario).toLowerCase();
                        const cores = CORES[tipo] ?? CORES.aluno;

                        return (
                            <Cartao key={usuario.id} sx={{ py: 2 }}>
                                <Stack direction="row" spacing={2} alignItems="center">
                                    <Box sx={{ flex: 1, minWidth: 0 }}>
                                        <Typography sx={{ fontWeight: 700, fontSize: "1rem", color: "#0f1720" }}>
                                            {usuario.nome ?? usuario.email}
                                        </Typography>
                                        <Typography sx={{ fontSize: ".88rem", color: "#8792a2" }}>
                                            {usuario.email}
                                        </Typography>
                                    </Box>

                                    <Chip
                                        label={usuario.tipo_usuario}
                                        size="small"
                                        sx={{ fontWeight: 700, textTransform: "capitalize", bgcolor: cores.bg, color: cores.cor }}
                                    />
                                </Stack>
                            </Cartao>
                        );
                    })}
                </Stack>
            )}

            {componente}
        </Box>
    );
}
