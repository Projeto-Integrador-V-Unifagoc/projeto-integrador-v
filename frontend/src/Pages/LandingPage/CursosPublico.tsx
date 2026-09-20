import { Box, CircularProgress, Stack } from "@mui/material";

import { CapaPagina, CartaoCurso, Container, EstadoVazio, Grade } from "./componentes";
import { usarSeo } from "./LayoutPublico";
import { useSiteContexto } from "./useSite";

export default function CursosPublico() {
    const { conteudo, carregando, navegar, urlInscricao } = useSiteContexto();
    const nome = conteudo.configuracoes.site_nome || "UniEduca";

    usarSeo(
        `Cursos de graduação — ${nome}`,
        `Conheça os cursos de graduação da ${nome} e as vagas com inscrições abertas.`,
    );

    const abertos = conteudo.cursos.filter((curso) => curso.inscricoes_abertas);
    const outros = conteudo.cursos.filter((curso) => !curso.inscricoes_abertas);

    return (
        <Box>
            <CapaPagina
                titulo="Cursos de graduação"
                descricao="Todos os cursos publicados pela instituição, com duração, turno e situação das inscrições."
            />

            <Container sx={{ py: { xs: 7, md: 10 } }}>
                {carregando ? (
                    <Stack alignItems="center" py={6}>
                        <CircularProgress />
                    </Stack>
                ) : conteudo.cursos.length === 0 ? (
                    <EstadoVazio mensagem="Nenhum curso publicado no site. Cadastre e ative os cursos em /painel para exibi-los aqui." />
                ) : (
                    <Stack spacing={6}>
                        {abertos.length > 0 && (
                            <Grade>
                                {abertos.map((curso) => (
                                    <CartaoCurso key={curso.id} curso={curso} urlInscricao={urlInscricao} onNavegar={navegar} />
                                ))}
                            </Grade>
                        )}

                        {outros.length > 0 && (
                            <Grade>
                                {outros.map((curso) => (
                                    <CartaoCurso key={curso.id} curso={curso} urlInscricao={urlInscricao} onNavegar={navegar} />
                                ))}
                            </Grade>
                        )}
                    </Stack>
                )}
            </Container>
        </Box>
    );
}
