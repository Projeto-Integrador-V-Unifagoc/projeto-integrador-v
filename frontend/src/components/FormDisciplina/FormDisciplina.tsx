import { useEffect, useState } from "react";
import { Alert, Grid, Stack } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Container from "../Container";
import { Card } from "../Card";
import TextField from "../TextField";
import Button from "../Button";
import DropDownCursos from "../DropDownCursos/DropDownCursos";
import { useDisciplina } from "../../hooks/use-disciplina";
import { disciplinaSchema } from "../../validators/disciplina-schema";

type FormDisciplinaProps = {
  disciplinaId?: string
}

type FormType = {
  codigo: string
  nome: string
  cursoId: string
  cargaHoraria: string
  preRequisito: string
}

const initialForm: FormType = {
  codigo: "",
  nome: "",
  cursoId: "",
  cargaHoraria: "",
  preRequisito: "",
}

export default function FormDisciplina({ disciplinaId }: FormDisciplinaProps) {
  const [form, setForm] = useState<FormType>(initialForm)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [alerta, setAlerta] = useState<{
    tipo: "success" | "error"
    mensagem: string
  } | null>(null)

  const navigate = useNavigate()
  const {
    carregando,
    buscarDisciplinaPorId,
    criarDisciplina,
    atualizarDisciplina,
  } = useDisciplina()

  useEffect(() => {
    async function carregarDisciplina() {
      if (!disciplinaId) {
        return
      }

      try {
        const disciplina = await buscarDisciplinaPorId(disciplinaId)
        setForm({
          codigo: disciplina.codigo,
          nome: disciplina.nome,
          cursoId: disciplina.curso.id,
          cargaHoraria: String(disciplina.carga_horaria),
          preRequisito: disciplina.pre_requisito ?? "",
        })
      } catch {
        setAlerta({
          tipo: "error",
          mensagem: "Não foi possível carregar a disciplina.",
        })
      }
    }

    carregarDisciplina()
  }, [disciplinaId])

  function handleChange<K extends keyof FormType>(name: K, value: FormType[K]) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit() {
    const payload = {
      ...form,
      cargaHoraria: Number(form.cargaHoraria),
    }

    try {
      await disciplinaSchema.validate(payload, { abortEarly: false })
      setErros({})
    } catch (error: any) {
      const errosFormatados: Record<string, string> = {}
      error.inner.forEach((err: any) => {
        errosFormatados[err.path] = err.message
      })
      setErros(errosFormatados)
      return
    }

    try {
      if (disciplinaId) {
        await atualizarDisciplina(disciplinaId, payload)
        setAlerta({
          tipo: "success",
          mensagem: "Disciplina atualizada com sucesso!",
        })
      } else {
        await criarDisciplina(payload)
        setAlerta({
          tipo: "success",
          mensagem: "Disciplina cadastrada com sucesso!",
        })
        setForm(initialForm)
      }

      setTimeout(() => {
        navigate("/disciplinas/lista")
      }, 1500)
    } catch {
      setAlerta({
        tipo: "error",
        mensagem: disciplinaId
          ? "Não foi possível atualizar a disciplina."
          : "Não foi possível cadastrar a disciplina.",
      })
    }
  }

  return (
    <Container>
      <Stack mt={2} gap={2}>
        <Card.Root>
          <Card.Header>
            <Card.Title>{disciplinaId ? "Editar Disciplina" : "Cadastrar Disciplina"}</Card.Title>
          </Card.Header>
          <Card.Content>
            <Grid container spacing={1}>
              <Grid size={3}>
                <TextField
                  required
                  label="Código"
                  value={form.codigo}
                  error={!!erros.codigo}
                  helperText={erros.codigo}
                  onChange={(e) => handleChange("codigo", e.target.value)}
                />
              </Grid>
              <Grid size={5}>
                <TextField
                  required
                  label="Nome"
                  value={form.nome}
                  error={!!erros.nome}
                  helperText={erros.nome}
                  onChange={(e) => handleChange("nome", e.target.value)}
                />
              </Grid>
              <Grid size={4}>
                <DropDownCursos
                  required
                  value={form.cursoId}
                  optionValue="id"
                  error={!!erros.cursoId}
                  helperText={erros.cursoId}
                  onChange={(value) => handleChange("cursoId", value)}
                />
              </Grid>
              <Grid size={4}>
                <TextField
                  required
                  label="Carga Horária"
                  value={form.cargaHoraria}
                  error={!!erros.cargaHoraria}
                  helperText={erros.cargaHoraria}
                  onChange={(e) => handleChange("cargaHoraria", e.target.value)}
                />
              </Grid>
              <Grid size={8}>
                <TextField
                  label="Pré-requisito"
                  value={form.preRequisito}
                  error={!!erros.preRequisito}
                  helperText={erros.preRequisito}
                  onChange={(e) => handleChange("preRequisito", e.target.value)}
                />
              </Grid>
            </Grid>
          </Card.Content>
        </Card.Root>

        <Stack direction="row" justifyContent="space-between" gap={2}>
          {alerta && (
            <Alert
              severity={alerta.tipo}
              sx={{
                width: "100%",
                height: "35px",
                display: "flex",
                alignItems: "center",
              }}
            >
              {alerta.mensagem}
            </Alert>
          )}
          <Button
            variant="contained"
            sx={{ width: "120px", height: "35px" }}
            onClick={handleSubmit}
            isLoading={carregando}
          >
            {disciplinaId ? "Salvar" : "Cadastrar"}
          </Button>
        </Stack>
      </Stack>
    </Container>
  )
}
