import {
    Box,
    Card,
    CardContent,
    Grid,
    Stack,
    TextField,
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
    UserStar,
} from "lucide-react";
import Container from "../../components/Container";
import { ManualCard } from "../../components/ManualCard";

export default function ManualDoSistema() {
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

                <TextField
                    fullWidth
                    placeholder="Pesquisar no manual..."
                />

                    <Grid container spacing={2}>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root>
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
                            <ManualCard.Root>
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<Users size={27} />}
                                        title="Alunos"
                                        description="Aprenda a gerenciar o registro de alunos, podendo listar, editar e cadastrar novos acadêmicos."
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
                                        description=""
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
                                        description=""
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root>
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<ClipboardCheck size={27} />}
                                        title="Matrícula"
                                        description=""
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
                                        description=""
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
                                        description=""
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
                                        description=""
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
                                        description=""
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                        <Grid size={{ xs: 12, md: 6 }}>
                            <ManualCard.Root>
                                <ManualCard.Header>
                                    <ManualCard.Content
                                        icon={<Info size={27} />}
                                        title="Status"
                                        description=""
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
                                        description=""
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
                                        description=""
                                    />
                                </ManualCard.Header>
                            </ManualCard.Root>
                        </Grid>

                    </Grid>
            </Stack>
        </Container>
    );
}