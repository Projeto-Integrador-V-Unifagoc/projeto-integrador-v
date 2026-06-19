import { Box, Divider, Stack, Typography } from "@mui/material";
import Container from "../../../../components/Container";
import { ManualStepCard } from "../../../../components/ManualStepCard";
import { BookMarked, CircleAlert, Eye, ScrollText, School, Trash2, UserRoundCheck } from "lucide-react";

export default function ManualTurmas() {
    return (
        <Container>
            <Stack spacing={4} py={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                        Manual do Sistema - Turmas
                    </Typography>
                    <Typography color="text.secondary" fontWeight='bold'>
                        Bem-vindo ao manual de Turmas do UniEduca. Aqui voce encontrara instrucoes detalhadas sobre como criar turmas, manter seus dados e vincular disciplinas e professores.
                    </Typography>
                </Box>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight='bold'>Gerenciando Registros de Turmas</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<ScrollText size={24} />}
                        title="Acesse o modulo de Turmas"
                        description="Na barra lateral do sistema, clique no icone de Turmas para acessar o modulo. A tela exibira a listagem com as turmas cadastradas."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<School size={24} />}
                        title="Clique em Adicionar"
                        description="Na tela de listagem, clique no botao 'Adicionar' para abrir o formulario de cadastro de turma."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={3}
                        icon={<School size={24} />}
                        title="Preencha os dados da turma"
                        description="Selecione o curso e o periodo letivo, depois informe o periodo curricular, a descricao, a sigla, a capacidade de alunos, o turno e o status da turma."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={4}
                        icon={<School size={24} />}
                        title="Conclua o cadastro"
                        description="Depois de preencher os campos obrigatorios, clique em 'Cadastrar'. Apos o cadastro, o sistema redireciona para a tela de detalhes da turma."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={5}
                        icon={<Eye size={24} />}
                        title="Abra os detalhes da turma"
                        description="Na listagem, clique no botao de visualizacao da turma desejada para acessar a tela de detalhes e manutencao do registro."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={6}
                        icon={<Eye size={24} />}
                        title="Edite os dados da turma"
                        description="Para consultar ou editar uma turma, clique no botao de visualizacao da linha desejada. Na tela de detalhes, ajuste os campos necessarios e clique em 'Salvar' para registrar as alteracoes."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={7}
                        icon={<Trash2 size={24} />}
                        title="Exclua uma turma"
                        description="Para excluir um registro, clique no botao 'Excluir' na listagem e confirme a operacao na janela exibida pelo sistema."
                    />
                </ManualStepCard.Root>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight='bold'>Disciplinas, Professores e Regras Operacionais</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<BookMarked size={24} />}
                        title="Localize a secao Disciplinas da Turma"
                        description="Depois de criar a turma, a secao 'Disciplinas da Turma' fica disponivel na tela de detalhes para gerenciamento da oferta."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<BookMarked size={24} />}
                        title="Clique em Adicionar Disciplina"
                        description="Na secao de oferta, clique em 'Adicionar Disciplina' para abrir o formulario de vinculacao de disciplina a turma."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={3}
                        icon={<UserRoundCheck size={24} />}
                        title="Preencha os dados da oferta"
                        description="Selecione uma disciplina da matriz curricular do curso, escolha o professor responsavel e informe o status da oferta. Em seguida, clique em 'Salvar'."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={4}
                        icon={<Eye size={24} />}
                        title="Edite uma oferta existente"
                        description="Para alterar professor ou status de uma disciplina ja vinculada, clique no botao 'Editar' da linha correspondente, atualize os dados e clique em 'Salvar'."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={5}
                        icon={<Trash2 size={24} />}
                        title="Remova uma disciplina da turma"
                        description="Para remover uma disciplina ofertada, clique no botao 'Excluir' da linha desejada e confirme a operacao."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={6}
                        icon={<UserRoundCheck size={24} />}
                        title="Observe as associacoes permitidas"
                        description="A turma deve estar vinculada a um curso e a um periodo letivo existentes. Ao adicionar disciplinas, somente itens da matriz curricular do curso da turma podem ser utilizados, e cada disciplina pode ser adicionada apenas uma vez por turma."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={7}
                        icon={<CircleAlert size={24} />}
                        title="Validacoes importantes"
                        description="A capacidade de alunos deve ser maior que zero. Alem disso, nao e permitido repetir a mesma sigla para o mesmo curso no mesmo periodo letivo, e o professor informado na oferta precisa existir no cadastro academico."
                    />
                </ManualStepCard.Root>
            </Stack>
        </Container>
    )
}
