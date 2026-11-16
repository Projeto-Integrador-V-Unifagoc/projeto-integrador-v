import { useEffect, useState } from "react";
import axios from "axios";
import { Alert, Grid, MenuItem, Stack, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import Container from "../Container";
import { Card } from "../Card";
import TextField from "../TextField";
import Button from "../Button";
import DropDownDepartamentos from "../DropDownDepartamentos/DropDownDepartamentos";
import { useCurso } from "../../hooks/use-curso";
import { cursoSchema } from "../../validators/curso-schema";

type FormCursoProps = {
  cursoId?: string
}

type FormType = {
  codigo: string
  nome: string
  departamentoId: string
  descricao: string
  grauAcademico: string
  modalidade: string
  duracaoPeriodos: string
  cargaHorariaMinima: string
  situacaoAcademica: string
  atoRegulatorio: string
  observacoesRegulatorias: string
}

const initialForm: FormType = {
  codigo: "",
  nome: "",
  departamentoId: "",
  descricao: "", grauAcademico: "", modalidade: "", duracaoPeriodos: "", cargaHorariaMinima: "",
  situacaoAcademica: "ATIVO", atoRegulatorio: "", observacoesRegulatorias: "",
}

export default function FormCurso({ cursoId }: FormCursoProps) {
  const [form, setForm] = useState<FormType>(initialForm)
  const [erros, setErros] = useState<Record<string, string>>({})
  const [alerta, setAlerta] = useState<{
    tipo: "success" | "error"
    mensagem: string
  } | null>(null)

  const navigate = useNavigate()
  const {
    carregando,
    buscarCursoPorId,
    criarCurso,
    atualizarCurso,
  } = useCurso()

  useEffect(() => {
    async function carregarCurso() {
      if (!cursoId) {
        return
      }

      try {
        const curso = await buscarCursoPorId(cursoId)
        setForm({
          codigo: curso.codigo,
          nome: curso.nome,
          departamentoId: curso.departamento.id,
          descricao: curso.descricao ?? "", grauAcademico: curso.grau_academico ?? "", modalidade: curso.modalidade ?? "",
          duracaoPeriodos: curso.duracao_periodos ? String(curso.duracao_periodos) : "",
          cargaHorariaMinima: curso.carga_horaria_minima ? String(curso.carga_horaria_minima) : "",
          situacaoAcademica: curso.situacao_academica ?? "ATIVO", atoRegulatorio: curso.ato_regulatorio ?? "",
          observacoesRegulatorias: curso.observacoes_regulatorias ?? "",
        })
      } catch {
        setAlerta({
          tipo: "error",
          mensagem: "Não foi possível carregar o curso.",
        })
      }
    }

    carregarCurso()
  }, [cursoId])

  function handleChange<K extends keyof FormType>(name: K, value: FormType[K]) {
    setForm((prev) => ({
      ...prev,
      [name]: value,
    }))
  }

  async function handleSubmit() {
    try {
      await cursoSchema.validate(form, { abortEarly: false })
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
      if (cursoId) {
        await atualizarCurso(cursoId, form)
        setAlerta({
          tipo: "success",
          mensagem: "Curso atualizado com sucesso!",
        })
      } else {
        await criarCurso(form)
        setAlerta({
          tipo: "success",
          mensagem: "Curso cadastrado com sucesso!",
        })
        setForm(initialForm)
      }

      setTimeout(() => {
        navigate("/cursos/lista")
      }, 1500)
    } catch (error) {
      setAlerta({
        tipo: "error",
        mensagem: axios.isAxiosError(error) ? error.response?.data?.error ?? "Não foi possível salvar o curso." : "Não foi possível salvar o curso.",
      })
    }
  }

  return (
    <Container>
      <Stack mt={2} gap={2}>
        <Card.Root>
          <Card.Header>
            <Card.Title>{cursoId ? "Editar Curso" : "Cadastrar Curso"}</Card.Title>
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
                <DropDownDepartamentos
                  required
                  value={form.departamentoId}
                  error={!!erros.departamentoId}
                  helperText={erros.departamentoId}
                  onChange={(value) => handleChange("departamentoId", value)}
                />
              </Grid>
            </Grid>
          </Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header><Card.Title>Dados acadêmicos</Card.Title></Card.Header>
          <Card.Content><Grid container spacing={2}>
            <Grid size={12}><TextField required fullWidth multiline minRows={3} label="Descrição do curso" value={form.descricao} error={!!erros.descricao} helperText={erros.descricao} onChange={(e) => handleChange("descricao", e.target.value)} /></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField required select label="Grau acadêmico" value={form.grauAcademico} error={!!erros.grauAcademico} helperText={erros.grauAcademico} onChange={(e) => handleChange("grauAcademico", e.target.value)}><MenuItem value="BACHARELADO">Bacharelado</MenuItem><MenuItem value="LICENCIATURA">Licenciatura</MenuItem><MenuItem value="TECNOLOGO">Tecnólogo</MenuItem><MenuItem value="SEQUENCIAL">Sequencial</MenuItem><MenuItem value="POS_GRADUACAO">Pós-graduação</MenuItem></TextField></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField required select label="Modalidade" value={form.modalidade} error={!!erros.modalidade} helperText={erros.modalidade} onChange={(e) => handleChange("modalidade", e.target.value)}><MenuItem value="PRESENCIAL">Presencial</MenuItem><MenuItem value="HIBRIDO">Híbrido</MenuItem><MenuItem value="EAD">A distância</MenuItem></TextField></Grid>
            <Grid size={{ xs: 12, md: 4 }}><TextField required select label="Situação acadêmica" value={form.situacaoAcademica} error={!!erros.situacaoAcademica} helperText={erros.situacaoAcademica} onChange={(e) => handleChange("situacaoAcademica", e.target.value)}><MenuItem value="ATIVO">Ativo</MenuItem><MenuItem value="EM_EXTINCAO">Em extinção</MenuItem><MenuItem value="INATIVO">Inativo</MenuItem></TextField></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField required type="number" label="Duração prevista (períodos)" value={form.duracaoPeriodos} error={!!erros.duracaoPeriodos} helperText={erros.duracaoPeriodos} onChange={(e) => handleChange("duracaoPeriodos", e.target.value)} inputProps={{ min: 1, max: 30 }} /></Grid>
            <Grid size={{ xs: 12, md: 6 }}><TextField required type="number" label="Carga horária mínima institucional" value={form.cargaHorariaMinima} error={!!erros.cargaHorariaMinima} helperText={erros.cargaHorariaMinima ?? "A carga efetiva continua sendo calculada pela matriz curricular."} onChange={(e) => handleChange("cargaHorariaMinima", e.target.value)} inputProps={{ min: 1 }} /></Grid>
          </Grid></Card.Content>
        </Card.Root>

        <Card.Root>
          <Card.Header><Card.Title>Informações regulatórias</Card.Title></Card.Header>
          <Card.Content><Grid container spacing={2}>
            <Grid size={12}><TextField fullWidth label="Ato de autorização ou reconhecimento" value={form.atoRegulatorio} error={!!erros.atoRegulatorio} helperText={erros.atoRegulatorio} onChange={(e) => handleChange("atoRegulatorio", e.target.value)} placeholder="Ex.: Portaria MEC nº 123/2026" /></Grid>
            <Grid size={12}><TextField fullWidth multiline minRows={3} label="Observações regulatórias" value={form.observacoesRegulatorias} onChange={(e) => handleChange("observacoesRegulatorias", e.target.value)} /></Grid>
            <Grid size={12}><Typography variant="caption" color="text.secondary">Essas informações são administrativas e não substituem os dados calculados da matriz vigente.</Typography></Grid>
          </Grid></Card.Content>
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
            {cursoId ? "Salvar" : "Cadastrar"}
          </Button>
        </Stack>
      </Stack>
    </Container>
  )
}
