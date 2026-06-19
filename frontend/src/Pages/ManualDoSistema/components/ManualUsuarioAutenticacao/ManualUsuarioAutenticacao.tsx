import { Box, Divider, Stack, Typography } from "@mui/material";
import Container from "../../../../components/Container";
import { ManualStepCard } from "../../../../components/ManualStepCard";
import { CircleUserRound, DoorOpen, KeyRound, LogIn, Mail, Settings, UserRoundPlus, Users } from "lucide-react";

export default function ManualUsuarioAutenticacao() {
    return (
        <Container>
            <Stack spacing={4} py={4}>
                <Box>
                    <Typography variant="h4" fontWeight="bold" color="primary">
                        Manual do Sistema - Usuários e Autenticação
                    </Typography>
                    <Typography color="text.secondary" fontWeight='bold'>
                        Bem-vindo ao manual de Usuários e Autenticação do UniEduca. Aqui você encontrará instruções detalhadas sobre como autenticar-se no sistema e gerenciar os usuários de forma eficiente.
                    </Typography>
                </Box>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight='bold'>Realizando Login</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<LogIn size={24} />}
                        title="Acesse a tela de login"
                        description="Ao abrir o sistema, você será direcionado para a tela de autenticação."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<Mail size={24} />}
                        title="Informe seu e-mail"
                        description="Digite o e-mail cadastrado no sistema."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={3}
                        icon={<KeyRound size={24} />}
                        title="Informe sua senha"
                        description="Digite a senha associada ao seu e-mail."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={4}
                        icon={<DoorOpen size={24} />}
                        title="Clique em Acessar"
                        description="Clique no botão 'Acessar' para entrar no sistema."
                    />
                </ManualStepCard.Root>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight='bold'>Acessando o Perfil</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<CircleUserRound size={24} />}
                        title="Clique no ícone de perfil"
                        description="Clique no ícone de perfil no canto superior direito para acessar ao menu."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<CircleUserRound size={24} />}
                        title="Clique em Minha Conta"
                        description="Selecione a opção 'Minha Conta' no menu para visualizar suas informações."
                    />
                </ManualStepCard.Root>
            </Stack>

            <Divider />

            <Stack spacing={2} mt={3} mb={3}>
                <Typography color="text.secondary" fontWeight='bold'>Gerenciando Usuários</Typography>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={1}
                        icon={<Users size={24} />}
                        title="Acesse o menu de usuários"
                        description="Na barra lateral, acesse a opção 'Usuários' para visualizar a listagem."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={2}
                        icon={<UserRoundPlus size={24} />}
                        title="Adicione um novo usuário"
                        description="Clique em 'Adicionar' para criar uma nova conta."
                    />
                </ManualStepCard.Root>

                <ManualStepCard.Root>
                    <ManualStepCard.Content
                        step={3}
                        icon={<Settings size={24} />}
                        title="Configure a conta do usuário"
                        description="Informe o nome, email e perfil do usuário. Caso esse usuário não seja do tipo 'Secretaria', vincule ele a um aluno ou professor já existente."
                    />
                </ManualStepCard.Root>
            </Stack>
        </Container>
    )
}