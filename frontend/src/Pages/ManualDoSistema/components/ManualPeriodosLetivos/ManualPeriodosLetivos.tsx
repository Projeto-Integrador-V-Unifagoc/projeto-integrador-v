import { Box, Divider, Stack, Typography } from "@mui/material";
import Container from "../../../../components/Container";
import { ManualStepCard } from "../../../../components/ManualStepCard";
import { CalendarClock, CalendarRange, CircleAlert, Pencil, ScrollText, Trash2 } from "lucide-react";

export default function ManualPeriodosLetivos() {
    return (
        <Container>
            <Stack spacing={4} py={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                        Manual do Sistema - Periodos Letivos
                    </Typography>
                    <Typography color="text.secondary" fontWeight='bold'>
                        Bem-vindo ao manual de Periodos Letivos do UniEduca. Aqui voce encontrara instrucoes detalhadas sobre como organizar os ciclos academicos e manter suas datas e situacoes atualizadas.
                    </Typography>
                </Box>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight='bold'>Gerenciando Registros de Periodos Letivos</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<ScrollText size={24} />}
                        title="Acesse o modulo de Periodos Letivos"
                        description="Na barra lateral do sistema, clique no icone de Periodos Letivos para acessar o modulo. A tela exibira a listagem dos periodos cadastrados."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<CalendarRange size={24} />}
                        title="Clique em Adicionar"
                        description="Na listagem, clique no botao 'Adicionar' para abrir o formulario de cadastro de periodo letivo."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={3}
                        icon={<CalendarRange size={24} />}
                        title="Preencha os dados do periodo"
                        description="Informe o codigo, o ano, o semestre, a data de inicio, a data de fim e selecione o status desejado entre Planejado, Ativo e Encerrado."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={4}
                        icon={<CalendarRange size={24} />}
                        title="Conclua o cadastro"
                        description="Depois de preencher os campos obrigatorios, clique em 'Cadastrar'. O sistema retornara para a listagem apos salvar o registro."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={5}
                        icon={<Pencil size={24} />}
                        title="Edite um periodo letivo"
                        description="Para editar um periodo existente, clique no botao 'Editar' da linha desejada, ajuste as informacoes necessarias e clique em 'Salvar'."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={6}
                        icon={<Trash2 size={24} />}
                        title="Exclua um periodo letivo"
                        description="Para excluir um registro, clique no botao 'Excluir' e confirme a operacao. A exclusao remove o periodo selecionado da listagem."
                    />
                </ManualStepCard.Root>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight='bold'>Regras e Restricoes</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<CircleAlert size={24} />}
                        title="Observe as validacoes de semestre e datas"
                        description="O semestre aceita apenas os valores 1 ou 2. Alem disso, a data de fim deve ser maior ou igual a data de inicio para que o registro possa ser salvo."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<CalendarClock size={24} />}
                        title="Considere as restricoes do modulo"
                        description="Nao e permitido cadastrar dois periodos com o mesmo codigo nem repetir a mesma combinacao de ano e semestre. Os periodos letivos cadastrados sao utilizados na criacao das turmas."
                    />
                </ManualStepCard.Root>
            </Stack>
        </Container>
    )
}
