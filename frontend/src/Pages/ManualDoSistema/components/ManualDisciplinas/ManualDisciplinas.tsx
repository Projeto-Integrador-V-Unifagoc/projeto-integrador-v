import { Box, Divider, Stack, Typography } from "@mui/material";
import Container from "../../../../components/Container";
import { ManualStepCard } from "../../../../components/ManualStepCard";
import { BookOpenText, CircleAlert, Pencil, ScrollText, Trash2, Waypoints } from "lucide-react";

export default function ManualDisciplinas() {
    return (
        <Container>
            <Stack spacing={4} py={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                        Manual do Sistema - Disciplinas
                    </Typography>
                    <Typography color="text.secondary" fontWeight='bold'>
                        Bem-vindo ao manual de Disciplinas do UniEduca. Aqui voce encontrara instrucoes detalhadas sobre como cadastrar, consultar, editar e excluir disciplinas no sistema.
                    </Typography>
                </Box>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight='bold'>Gerenciando Registros de Disciplinas</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<ScrollText size={24} />}
                        title="Acesse o modulo de Disciplinas"
                        description="Na barra lateral do sistema, clique no icone de Disciplinas para acessar o modulo. A tela exibira a listagem com os registros ja cadastrados."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<BookOpenText size={24} />}
                        title="Clique em Adicionar"
                        description="Na tela de listagem, clique no botao 'Adicionar' para abrir o formulario de cadastro de disciplina."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={3}
                        icon={<BookOpenText size={24} />}
                        title="Preencha os campos da disciplina"
                        description="Informe o codigo, o nome e a carga horaria. Se necessario, preencha tambem o campo de pre-requisito para registrar dependencias academicas."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={4}
                        icon={<BookOpenText size={24} />}
                        title="Conclua o cadastro"
                        description="Depois de preencher os campos obrigatorios, clique em 'Cadastrar'. Apos o salvamento, o sistema retorna para a listagem de disciplinas."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={5}
                        icon={<Pencil size={24} />}
                        title="Edite uma disciplina existente"
                        description="Na listagem, clique no botao 'Editar' da disciplina desejada. Atualize as informacoes necessarias e clique em 'Salvar' para confirmar as alteracoes."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={6}
                        icon={<Trash2 size={24} />}
                        title="Exclua uma disciplina"
                        description="Para excluir um registro, clique no botao 'Excluir' da disciplina desejada e confirme a operacao na janela de confirmacao."
                    />
                </ManualStepCard.Root>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight='bold'>Regras e Relacionamentos</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<CircleAlert size={24} />}
                        title="Observe as validacoes do formulario"
                        description="O codigo da disciplina deve ser unico. A carga horaria deve ser informada como numero inteiro e maior que zero. Caso esses criterios nao sejam atendidos, o cadastro ou a atualizacao nao sera concluido."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<Waypoints size={24} />}
                        title="Entenda o relacionamento com outros modulos"
                        description="As disciplinas cadastradas sao utilizadas na matriz curricular dos cursos e, depois, podem ser ofertadas nas turmas. Por isso, mantenha codigo, nome, carga horaria e pre-requisito sempre atualizados."
                    />
                </ManualStepCard.Root>
            </Stack>
        </Container>
    )
}
