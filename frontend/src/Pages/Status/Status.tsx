import { useEffect, useState } from "react"
import { Box, Grid, Stack } from "@mui/material"
import { useNavigate, useSearchParams } from "react-router-dom"
import Container from "../../components/Container"
import Button from "../../components/Button"
import TextField from "../../components/TextField"
import { Card } from "../../components/Card"
import { CheckBox } from "../../components/Checkbox"
import { statusApi } from "../../services/status-api"


export default function StatusMatricula() {
    const [searchParams] = useSearchParams()
    const tipoParam = searchParams.get("tipo")
    const idParam = searchParams.get("id")
    const navigate = useNavigate()

    const [tipo, setTipo] = useState<"disciplina" | "matricula">(
        tipoParam === "matricula" ? "matricula" : "disciplina"
    )
    const [descricao, setDescricao] = useState("")
    const [mensagem, setMensagem] = useState<string | null>(null)
    const [erro, setErro] = useState<string | null>(null)
    const [editId] = useState<string | null>(() =>
        idParam && (tipoParam === "disciplina" || tipoParam === "matricula") ? idParam : null
    )
    const [editTipo] = useState<"disciplina" | "matricula" | null>(() =>
        tipoParam === "disciplina" || tipoParam === "matricula" ? tipoParam : null
    )

    const isEditMode = Boolean(editId && editTipo)

    async function carregarStatusParaEdicao(tipoParam: "disciplina" | "matricula", id: string) {
        setMensagem(null)
        setErro(null)

        try {
            const status =
                tipoParam === "disciplina"
                    ? await statusApi.buscarStatusMatriculaDisciplinaPorId(id)
                    : await statusApi.buscarStatusMatriculaCursoPorId(id)

            if (!status) {
                setErro("Status não encontrado para edição.")
                return
            }

            setDescricao(status.descricao)
        } catch (error: unknown) {
            const serverMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
            setErro(serverMessage || "Erro ao carregar status para edição.")
            console.error(error)
        }
    }

    useEffect(() => {
        const currentEditId = editId
        const currentEditTipo = editTipo

        if (!currentEditId || !currentEditTipo) {
            return
        }

        async function loadStatus() {
            await carregarStatusParaEdicao(currentEditTipo!, currentEditId!)
        }

        void loadStatus()
    }, [editId, editTipo])

    async function handleSubmit() {
        setMensagem(null)
        setErro(null)

        if (!descricao.trim()) {
            setErro("A descrição é obrigatória.")
            return
        }

        try {
            if (isEditMode && editId && editTipo) {
                await (editTipo === "disciplina"
                    ? statusApi.atualizarStatusMatriculaDisciplina(editId, { descricao })
                    : statusApi.atualizarStatusMatriculaCurso(editId, { descricao }))

                setMensagem("Status atualizado com sucesso.")
                setTimeout(() => navigate("/statusLista"), 2000)

            } else {
                await (tipo === "disciplina"
                    ? statusApi.criarStatusMatriculaDisciplina({ descricao })
                    : statusApi.criarStatusMatriculaCurso({ descricao }))

                setMensagem("Status cadastrado com sucesso.")
                setDescricao("")
                setTimeout(() => navigate("/statusLista"), 2000)
            }
        } catch (error: unknown) {
            const serverMessage = (error as { response?: { data?: { error?: string } } })?.response?.data?.error
            setErro(serverMessage || "Erro ao salvar status. Verifique o servidor e tente novamente.")
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
                                    <Card.Title>{isEditMode ? "Editar situação" : "Cadastro de situação"}</Card.Title>
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
                                                    disabled={isEditMode}
                                                />

                                                <CheckBox
                                                    checked={tipo === "matricula"}
                                                    onChange={(event) => {
                                                        if (event.target.checked) {
                                                            setTipo("matricula")
                                                        }
                                                    }}
                                                    label="Curso"
                                                    name="tipo"
                                                    disabled={isEditMode}
                                                />
                                            </Stack>
                                        </Grid>

                                        <Grid size={10}>

                                            <Button
                                                variant="contained"
                                                sx={{ width: "90px", height: "35px" }}
                                                onClick={handleSubmit}
                                            >
                                                {isEditMode ? "Salvar" : "Cadastrar"}
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
