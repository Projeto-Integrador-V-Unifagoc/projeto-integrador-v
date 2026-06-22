import { Box, Divider, Stack, Typography } from "@mui/material";
import Container from "../../../../components/Container";
import { ManualStepCard } from "../../../../components/ManualStepCard";
import { BookCopy, CircleAlert, Eye, GraduationCap, Pencil, ScrollText, Trash2 } from "lucide-react";

export default function ManualCursos() {
    return (
        <Container>
            <Stack spacing={4} py={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                        Manual do Sistema - Cursos
                    </Typography>
                    <Typography color="text.secondary" fontWeight='bold'>
                        Bem-vindo ao manual de Cursos do UniEduca. Aqui voce encontrara instrucoes detalhadas sobre como cadastrar cursos, manter seus dados e organizar a matriz curricular.
                    </Typography>
                </Box>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight='bold'>Gerenciando Registros de Cursos</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<ScrollText size={24} />}
                        title="Acesse o modulo de Cursos"
                        description="Na barra lateral do sistema, clique no icone de Cursos para acessar o modulo. Voce sera redirecionado para a listagem com os cursos cadastrados."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<GraduationCap size={24} />}
                        title="Clique em Adicionar"
                        description="Na tela de listagem, clique no botao 'Adicionar' para abrir o formulario de cadastro de curso."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={3}
                        icon={<GraduationCap size={24} />}
                        title="Preencha os dados do curso"
                        description="Informe o codigo, o nome e selecione o departamento. O departamento escolhido define a estrutura academica a que o curso ficara vinculado."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={4}
                        icon={<GraduationCap size={24} />}
                        title="Conclua o cadastro"
                        description="Depois de preencher os campos obrigatorios, clique em 'Cadastrar'. Apos salvar, o sistema retorna para a listagem de cursos."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={5}
                        icon={<Pencil size={24} />}
                        title="Edite um curso existente"
                        description="Na listagem, clique no botao 'Editar' da linha desejada. Atualize os dados necessarios e clique em 'Salvar' para concluir a alteracao."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={6}
                        icon={<Trash2 size={24} />}
                        title="Exclua um curso"
                        description="Para excluir um curso, clique no botao 'Excluir' correspondente e confirme a operacao na janela de confirmacao."
                    />
                </ManualStepCard.Root>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight='bold'>Matriz Curricular e Dependencias</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<Eye size={24} />}
                        title="Abra a matriz curricular"
                        description="Na listagem de cursos, clique no botao 'Matriz' do curso desejado para acessar a tela de matriz curricular."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<BookCopy size={24} />}
                        title="Clique em Adicionar Disciplina"
                        description="Na tela da matriz curricular, clique em 'Adicionar Disciplina' para abrir o formulario de associacao de disciplina ao curso."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={3}
                        icon={<BookCopy size={24} />}
                        title="Preencha os dados da associacao"
                        description="Selecione a disciplina, informe o periodo ideal, revise a carga horaria e marque se a disciplina e obrigatoria. Em seguida, clique em 'Salvar'."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={4}
                        icon={<Pencil size={24} />}
                        title="Edite uma associacao existente"
                        description="Para alterar uma disciplina ja vinculada a matriz, clique no botao 'Editar' da linha correspondente, ajuste as informacoes disponiveis e clique em 'Salvar'."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={5}
                        icon={<Trash2 size={24} />}
                        title="Remova uma disciplina da matriz"
                        description="Para remover uma associacao da matriz curricular, clique no botao 'Excluir' da disciplina desejada e confirme a operacao."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={6}
                        icon={<CircleAlert size={24} />}
                        title="Regras de negocio"
                        description="Cada disciplina pode aparecer apenas uma vez na matriz curricular do mesmo curso. As disciplinas vinculadas ao curso sao utilizadas depois na oferta de disciplinas das turmas, por isso a matriz deve permanecer consistente."
                    />
                </ManualStepCard.Root>
            </Stack>
        </Container>
    )
}
