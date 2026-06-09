import { Box, Divider, Stack, Typography } from "@mui/material";
import Container from "../../../../components/Container";
import { ManualStepCard } from "../../../../components/ManualStepCard";
import { CirclePlus, Info } from "lucide-react";

export default function ManualStatus() {
    return (
        <Container>
            <Stack spacing={4} py={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                        Manual do Sistema - Status
                    </Typography>
                    <Typography color="text.secondary" fontWeight='bold'>
                        Bem-vindo ao manual de Status do UniEduca. Aqui você encontrará instruções detalhadas sobre como gerenciar as informações de status no sistema.
                    </Typography>
                </Box>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight='bold'>Gerenciando Registros de Status</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<Info size={24} />}
                        title="Acesse o módulo de Status"
                        description="Na barra lateral do sistema, clique no ícone de Status para acessar o módulo. Você será redirecionado para uma listagem completa dos registros de status."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<CirclePlus size={24} />}
                        title="Crie um novo registro de status"
                        description="Para criar um novo registro de status, clique no botão 'Adicionar' na parte superior direita da listagem. Preencha os campos obrigatórios e clique em 'Cadastrar'."
                    />
                </ManualStepCard.Root>
            </Stack>
        </Container>
    )
}