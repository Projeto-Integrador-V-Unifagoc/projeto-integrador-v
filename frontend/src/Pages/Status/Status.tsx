import { useState } from "react"
import { Box, Stack } from "@mui/material"
import Container from "../../components/Container"
import Button from "../../components/Button"
import TextField from "../../components/TextField"
import { Card } from "../../components/Card"
import { CheckBox } from "../../components/Checkbox"
import { statusApi } from "../../services/status-api"


import {
    
    Grid
    
} from "@mui/material";


export default function StatusMatricula() {
    const [tipo, setTipo] = useState<"disciplina" | "matricula">("disciplina")
    const [descricao, setDescricao] = useState("")
    const [mensagem, setMensagem] = useState<string | null>(null)
    const [erro, setErro] = useState<string | null>(null)

    async function handleSubmit() {
        setMensagem(null)
        setErro(null)

        if (!descricao.trim()) {
            setErro("A descrição é obrigatória.")
            return
        }

        try {
            const response =
                tipo === "disciplina"
                    ? await statusApi.criarStatusMatriculaDisciplina({ descricao })
                    : await statusApi.criarStatusMatriculaCurso({ descricao })

            setMensagem(`Status cadastrado com sucesso. ID: ${response.id}`)
            setDescricao("")
        } catch (error: any) {
            const serverMessage = error?.response?.data?.error
            setErro(serverMessage || "Erro ao cadastrar status. Verifique o servidor e tente novamente.")
            console.error(error)
        }
    }

    return (
        <Container
            maxWidth={false}
            sx={(theme) => ({
                border: `1px solid ${theme.palette.grey[200]}`,
                borderRadius: '8px',
                height: '100%',
                backgroundColor: '#F4F4F4',
            })}
        >
            <Box
                component='div'
                sx={{
                    height: '100%',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    flexDirection: 'column',
                }}
            >

                <Stack
                    display='flex'
                    justifyContent='center'
                    alignItems='center'
                    mt={1}
                >

                    <Stack mt={2} gap={2} component='div'>
                        <Stack>
                            <Card.Root>
                                <Card.Header>
                                    <Card.Title>Cadastro de situação</Card.Title>
                                </Card.Header>
                                <Card.Content>
                                    <Grid container spacing={1}>


                                        <Grid size={6}>
                                            
                                            <TextField
                                                required
                                                label="Descrição"
                                                name="descricao"
                                                value={descricao}
                                                onChange={(event) => setDescricao(event.target.value)}
                                            />
                                        </Grid>

                                        <Grid size={6}>
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <CheckBox
                                                    checked={tipo === "disciplina"}
                                                    onChange={(event) => {
                                                        if (event.target.checked) {
                                                            setTipo("disciplina")
                                                        }
                                                    }}
                                                    label="Disciplina"
                                                    name="tipo"
                                                />

                                                <CheckBox
                                                    checked={tipo === "matricula"}
                                                    onChange={(event) => {
                                                        if (event.target.checked) {
                                                            setTipo("matricula")
                                                        }
                                                    }}
                                                    label="Matrícula"
                                                    name="tipo"
                                                />
                                            </Stack>
                                        </Grid>

                                        <Grid size={10}>

                                            <Button
                                                variant="contained"
                                                sx={{ width: "90px", height: "35px" }}
                                                onClick={handleSubmit}
                                            >
                                                Cadastrar
                                            </Button>

                                        </Grid>
                                        <Grid size={10}>
                                            {mensagem && (
                                                <Box component="p" sx={{ color: "success.main", mt: 1 }}>
                                                    {mensagem}
                                                </Box>
                                            )}
                                            {erro && (
                                                <Box component="p" sx={{ color: "error.main", mt: 1 }}>
                                                    {erro}
                                                </Box>
                                            )}
                                        </Grid>
                                    </Grid>

                                </Card.Content>
                            </Card.Root>
                        </Stack>

                    </Stack>

                </Stack>

            </Box>
        </Container>
    )
}
