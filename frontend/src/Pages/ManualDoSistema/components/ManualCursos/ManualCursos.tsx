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
                        Bem-vindo ao manual de Cursos do UniEduca. Aqui você encontra instruções para cadastrar cursos, organizar a matriz curricular e configurar a pontuação por período letivo.
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

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight="bold">Pontuação por Curso e Período Letivo</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<Eye size={24} />}
                        title="Abra Pontuação e escolha o período letivo"
                        description="Na listagem de Cursos, secretaria ou administrador acessa 'Pontuação' no curso desejado e seleciona o período letivo institucional. Esse período pertence ao calendário e é diferente do período ideal da matriz curricular. Se ainda não houver regra para o curso e período, o formulário começa vazio, sem total padrão de 100 pontos."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<Pencil size={24} />}
                        title="Defina o total e os subgrupos"
                        description="Informe um total positivo e use 'Adicionar subgrupo' para distribuir seus pontos. Cada subgrupo tem nome livre, orçamento positivo e modo de quantidade 'Fixa' ou 'Sem limite'. Nomes podem se repetir. No modo Fixa, informe uma quantidade inteira positiva; Sem limite permite variar a quantidade, mas não ultrapassar o orçamento em pontos."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={3}
                        icon={<ScrollText size={24} />}
                        title="Confira a soma, o saldo e a precisão"
                        description="A 'Soma dos orçamentos' precisa ser igual ao 'Total de pontos', com 'Saldo a distribuir' zero. Como exemplo, 120 pontos podem ser distribuídos em Provas 72/fixa 4, Avaliações institucionais 6/fixa 1 e Trabalhos e projetos 42/sem limite. Digite pontos com até duas casas decimais, usando vírgula ou ponto, sem separador de milhares, sinal ou espaços. Mais casas são rejeitadas, sem arredondamento. Esse exemplo não é aplicado automaticamente aos cursos."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={4}
                        icon={<Pencil size={24} />}
                        title="Disponibilize e revise a regra"
                        description="Clique em 'Disponibilizar regra' para criar a configuração. Antes do primeiro uso, 'Salvar regra' permite ajustá-la. Os erros indicam o campo a corrigir e mantêm suas entradas. Se outra alteração causar conflito, o rascunho permanece para revisão; 'Recarregar regra' substitui essas entradas pela versão salva. Revise antes de recarregar."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={5}
                        icon={<CircleAlert size={24} />}
                        title="Respeite a regra preservada"
                        description="Cada oferta do mesmo curso e período usa a mesma distribuição, com saldo próprio. Depois da primeira avaliação, a regra fica preservada mesmo se essa avaliação for removida. Uma distribuição diferente precisa ser configurada explicitamente para um período seguinte. Registros históricos compatíveis conservam a regra histórica; ela não cria um padrão automático para novos períodos."
                    />
                </ManualStepCard.Root>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight="bold">Avaliações, Pendências e Resultado Acadêmico</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<BookCopy size={24} />}
                        title="Distribua avaliações na oferta e no subgrupo"
                        description="Em Avaliações, o professor escolhe a oferta autorizada e o subgrupo da regra. As novas avaliações são regulares. Sem regra, sua criação fica bloqueada. Não é obrigatório dividir o orçamento igualmente: quatro Provas de 12, 18, 18 e 24 distribuem 72 pontos. O plano só fica completo quando cada orçamento e quantidade fixa são cumpridos exatamente. Após a primeira nota, inclusive zero, a estrutura da avaliação fica protegida; descrição e datas seguem o fluxo existente."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<CircleAlert size={24} />}
                        title="Diferencie zero, ausência e resultado parcial"
                        description="Uma nota zero conta como lançamento; 'Não lançada' indica ausência. As notas devem respeitar o máximo real da avaliação e a precisão de duas casas. Se um item do lote for inválido, nenhuma nota desse lote é gravada parcialmente. Plano incompleto ou notas ausentes mantém pendências, mesmo se o indicador parcial mostrar 100%. Confira os motivos apresentados no boletim, rendimento, ficha e relatórios."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={3}
                        icon={<GraduationCap size={24} />}
                        title="Leia nota e frequência separadamente"
                        description="O corte por nota é 60% exatos do total: em 120 pontos, são 72. A aprovação na disciplina exige também etapa regular completa e frequência registrada de pelo menos 75%. Frequência ausente mantém pendência; entre 75% e 80% o requisito é cumprido com alerta. 'Resultado por nota suficiente' não garante sozinho aprovação na disciplina. Percentuais arredondados não decidem o resultado: com total 100,01, o corte é 60,006, então 60,00 fica abaixo e 60,01 atinge o corte."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={4}
                        icon={<Eye size={24} />}
                        title="Consulte Recuperação de forma explícita"
                        description="A aba Recuperação consulta alunos com etapa regular completa e pontos regulares abaixo do corte. Ao abrir essa consulta, o sistema pode criar a avaliação de recuperação quando houver elegível e o período estiver aberto. O máximo é o total da regra, fora do orçamento regular. O resultado considera o maior valor entre regular e recuperação, inclusive após retificação, sem somá-los. Recuperação não supre frequência insuficiente; abrir o boletim ou rendimento não cria essa avaliação."
                    />
                </ManualStepCard.Root>
            </Stack>
        </Container>
    )
}
