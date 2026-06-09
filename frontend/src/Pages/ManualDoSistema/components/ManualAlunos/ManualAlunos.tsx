import { Box, Divider, Stack, Typography } from "@mui/material";
import Container from "../../../../components/Container";
import { ManualStepCard } from "../../../../components/ManualStepCard";
import { ClipboardList, Pencil, ScrollText, UserRoundPlus, Users } from "lucide-react";

export default function ManualAlunos() {
    return (
        <Container>
            <Stack spacing={4} py={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                        Manual do Sistema - Alunos
                    </Typography>
                    <Typography color="text.secondary" fontWeight='bold'>
                        Bem-vindo ao manual de Alunos do UniEduca. Aqui você encontrará instruções detalhadas sobre como gerenciar as informações dos alunos no sistema.
                    </Typography>
                </Box>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight='bold'>Gerenciando Registros de Alunos</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<ScrollText size={24} />}
                        title="Listagem de Alunos"
                        description="Na barra lateral do sistema, clique no ícone de Alunos para acessar o módulo. Você será redirecionado para uma listagem completa dos alunos cadastrados."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<UserRoundPlus size={24} />}
                        title="Cadastro de Alunos"
                        description="Para cadastrar um novo aluno, clique no botão 'Adicionar' e preencha os campos obrigatório. Após preencher as informações, clique em 'Cadastrar' para concluir o cadastro. Após, você será redirecionado para a página de Listagem de Alunos."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={3}
                        icon={<Pencil size={24} />}
                        title="Edição do Aluno"
                        description="Para editar as informações de um aluno existente, clique no botão 'Editar', simbolizado por um LÁPIS na linha do aluno desejado. Atualize os campos necessários e clique em 'Editar Aluno' para confirmar as alterações."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={4}
                        icon={<ClipboardList size={24} />}
                        title="Ficha do Aluno"
                        description="Para visualizar as informações detalhadas de um aluno, clique no botão 'Ficha', simbolizado por um CLIPBOARD na linha do aluno desejado."
                    />
                </ManualStepCard.Root>
            </Stack>
        </Container>
    )
}