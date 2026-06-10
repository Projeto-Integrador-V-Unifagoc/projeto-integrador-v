import {
    Box,
    Grid,
    Stack,
    Typography,
} from "@mui/material";

import {
    CalendarCheck,
    ClipboardCheck,
    ClipboardList,
    FileText,
    GraduationCap,
    Info,
    Layers,
    NotebookPen,
    Users,
} from "lucide-react";
import Container from "../../components/Container";
import { ManualCard } from "../../components/ManualCard";
import { useNavigate } from "react-router-dom";

export default function ManualDoSistema() {

    const navigate = useNavigate()

    return (
        <Container>
            <Stack spacing={4} py={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                        Manual do Sistema
                    </Typography>

                    <Typography color="text.secondary" fontWeight='bold'>
                        Bem-vindo ao manual do UniEduca. Aqui você encontrará instruções de
                        utilização dos principais módulos do sistema.
                    </Typography>
                </Box>

               {/*<TextField
                    fullWidth
                    placeholder="Pesquisar no manual..."
                />*/}

                    <Grid container spacing={2}>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root
                                onClick={() => navigate("/manual-do-sistema/usuarios-e-autenticacao")}
                            >
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<Users size={27} />}
                                        title="Usuários e Autenticação"
                                        description="Entenda como autenticar-se no sistema e como realizar todo o gerenciamento de usuários."
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>


                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root
                                onClick={() => navigate("/manual-do-sistema/alunos")}
                            >
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<Users size={27} />}
                                        title="Alunos"
                                        description="Aprenda a gerenciar os registros de alunos, podendo listar, editar e cadastrar novos acadêmicos."
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root>
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<ClipboardList size={27} />}
                                        title="Tarefas"
                                        description="Neste módulo, você aprenderá a criar, editar e gerenciar tarefas relacionadas aos alunos, como atividades, trabalhos e projetos. Caso você seja um aluno, poderá acompanhar suas tarefas e prazos de entrega."
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root>
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<CalendarCheck size={27} />}
                                        title="Frequência"
                                        description="Saiba como registrar e acompanhar a frequência dos alunos, garantindo um controle eficiente das presenças e ausências."
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root>
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<ClipboardCheck size={27} />}
                                        title="Matrículas e Vínculos"
                                        description="Entenda como gerenciar as matrículas e vínculos dos alunos, incluindo processos de inscrição."
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root>
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<FileText size={27} />}
                                        title="Documentos"
                                        description="Aprenda a gerenciar os documentos dos alunos, como certificados, comprovantes e outros arquivos importantes."
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root>
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<ClipboardCheck size={27} />}
                                        title="Avaliações"
                                        description="Saiba como criar, editar e gerenciar avaliações para os alunos, incluindo critérios de avaliação e lançamento de notas. Além disso, os alunos poderão acompanhar suas avaliações e resultados."
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root>
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<GraduationCap size={27} />}
                                        title="Cursos"
                                        description="Aprenda a gerenciar os cursos disponíveis."
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root>
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<NotebookPen size={27} />}
                                        title="Disciplinas"
                                        description="Aprenda a gerenciar as disciplinas."
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root
                                onClick={() => navigate("/manual-do-sistema/status")}
                            >
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<Info size={27} />}
                                        title="Status"
                                        description="Crie status de situação para Disciplinas e Cursos"
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root>
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<Layers size={27} />}
                                        title="Períodos Letivos"
                                        description="Aprenda a gerenciar os períodos letivos, incluindo definição de datas e configurações relacionadas."
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root>
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<Users size={27} />}
                                        title="Turmas"
                                        description="Aprenda a gerenciar as turmas, incluindo a associação de alunos e professores."
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                    </Grid>
            </Stack>
        </Container>
    );
}