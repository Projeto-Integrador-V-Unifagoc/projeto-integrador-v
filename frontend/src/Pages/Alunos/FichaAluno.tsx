import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Alert,
  Chip,
  CircularProgress,
  Divider,
  Paper,
  Stack,
  Typography,
} from "@mui/material";

import Container from "../../components/Container";
import {
  abasFicha,
  FichaAlunoConteudoAba,
  FichaAlunoHeader,
  FichaAlunoNotasTabela,
  FichaAlunoResumoCard,
  FichaAlunoTabs,
  type AbaFicha,
  type AlunoFicha,
} from "../../components/FichaAluno";
import type { MatriculaDetalhada } from "../../models/matricula-model";
import type { PeriodoLetivoResponse } from "../../models/periodo-letivo-model";
import { alunoApi } from "../../services/aluno-api";
import type { DocumentoAluno } from "../../services/documento-api";
import {
  fichaApi,
  type AlunoFicha as AlunoFichaApi,
  type FrequenciaAluno as FrequenciaAlunoResponse,
  type NotaFicha,
} from "../../services/ficha-api";
import { montarNotasFicha, normalizarSemestre } from "./notasFicha.utils";

const VALOR_NAO_INFORMADO = "Nao informado";

function getMensagemErro(error: unknown, fallback: string) {
  const axiosError = error as {
    response?: {
      data?: { error?: string; mensagem?: string; message?: string };
    };
    message?: string;
  };

  return (
    axiosError.response?.data?.error ||
    axiosError.response?.data?.mensagem ||
    axiosError.response?.data?.message ||
    axiosError.message ||
    fallback
  );
}

function formatarPeriodo(periodo?: string | number | null) {
  if (periodo === undefined || periodo === null || periodo === "") {
    return VALOR_NAO_INFORMADO;
  }

  const periodoTexto = String(periodo);
  if (periodoTexto.toLowerCase().includes("period")) return periodoTexto;

  return `${periodoTexto}o Periodo`;
}

function formatarData(data?: string | null) {
  if (!data) return VALOR_NAO_INFORMADO;

  const date = new Date(data);
  if (Number.isNaN(date.getTime())) return data;

  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(date);
}

function calcularIdade(data?: string | null) {
  if (!data) return VALOR_NAO_INFORMADO;

  const nascimento = new Date(data);
  if (Number.isNaN(nascimento.getTime())) return VALOR_NAO_INFORMADO;

  const hoje = new Date();
  let idade = hoje.getFullYear() - nascimento.getFullYear();
  const aindaNaoFezAniversario =
    hoje.getMonth() < nascimento.getMonth() ||
    (hoje.getMonth() === nascimento.getMonth() &&
      hoje.getDate() < nascimento.getDate());

  if (aindaNaoFezAniversario) idade -= 1;

  return `${idade} anos`;
}

function getCursoAluno(
  aluno: AlunoFichaApi,
  matriculaAtiva?: MatriculaDetalhada,
) {
  if (typeof aluno.curso === "string" && aluno.curso) return aluno.curso;
  if (typeof aluno.curso === "object" && aluno.curso?.nome)
    return aluno.curso.nome;
  return matriculaAtiva?.curso_nome ?? VALOR_NAO_INFORMADO;
}

function getCampusPolo(aluno: AlunoFichaApi) {
  const cidade = aluno.pessoa?.cidade;
  const nomeCidade = cidade?.nome;
  const uf = cidade?.uf;

  if (nomeCidade && uf) return `${nomeCidade} - ${uf}`;
  if (nomeCidade) return nomeCidade;

  return VALOR_NAO_INFORMADO;
}

function getMatriculaAtiva(matriculas: MatriculaDetalhada[]) {
  return (
    matriculas.find((matricula) =>
      ["MATRICULADO", "ATIVO", "ATIVA", "REGULAR"].includes(
        String(matricula.status ?? "").toUpperCase(),
      ),
    ) ?? matriculas[0]
  );
}

function getOpcoesSemestre(
  periodos: PeriodoLetivoResponse[],
  matriculas: MatriculaDetalhada[],
  notas: NotaFicha[],
) {
  const opcoes = [
    ...periodos.map((periodo) =>
      normalizarSemestre(
        periodo.codigo || `${periodo.ano}-${periodo.semestre}`,
      ),
    ),
    ...matriculas.map((matricula) =>
      normalizarSemestre((matricula as any).semestre),
    ),
    ...notas.map((nota) => normalizarSemestre(nota.periodoLetivo)),
  ].filter(Boolean);

  return Array.from(new Set(opcoes));
}

function montarAlunoFicha(
  aluno: AlunoFichaApi,
  matriculaAtiva?: MatriculaDetalhada,
): AlunoFicha {
  return {
    nome:
      aluno.pessoa?.nome ?? matriculaAtiva?.aluno_nome ?? VALOR_NAO_INFORMADO,
    ra: String(aluno.matricula ?? matriculaAtiva?.aluno_matricula ?? ""),
    unidade: VALOR_NAO_INFORMADO,
    curso: getCursoAluno(aluno, matriculaAtiva),
    campusPolo: getCampusPolo(aluno),
    periodo: formatarPeriodo(aluno.periodo),
    turno: VALOR_NAO_INFORMADO,
    turma: matriculaAtiva?.turma_id ?? VALOR_NAO_INFORMADO,
    status: matriculaAtiva?.status ?? "Sem matricula",
    nascimento: formatarData(aluno.pessoa?.dataNascimento),
    idade: calcularIdade(aluno.pessoa?.dataNascimento),
    responsavelFinanceiro: aluno.pessoa?.nome ?? VALOR_NAO_INFORMADO,
    email: aluno.usuario?.email ?? VALOR_NAO_INFORMADO,
    semestre: normalizarSemestre((matriculaAtiva as any)?.semestre) || "",
  };
}

export default function FichaAluno() {
  const { id, matricula } = useParams<{ id?: string; matricula?: string }>();

  const [semestre, setSemestre] = useState("");
  const [abaAtual, setAbaAtual] = useState<AbaFicha>("notas");
  const [aluno, setAluno] = useState<AlunoFichaApi | null>(null);
  const [matriculas, setMatriculas] = useState<MatriculaDetalhada[]>([]);
  const [notas, setNotas] = useState<NotaFicha[]>([]);
  const [frequencia, setFrequencia] = useState<
    FrequenciaAlunoResponse | undefined
  >();
  const [documentos, setDocumentos] = useState<DocumentoAluno[]>([]);
  const [periodos, setPeriodos] = useState<PeriodoLetivoResponse[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    let deveAtualizarEstado = true;

    async function carregarFicha() {
      const identificador = matricula ?? id;

      if (!identificador) {
        setErro("Nao foi possivel identificar o aluno da ficha.");
        setCarregando(false);
        return;
      }

      setCarregando(true);
      setErro(null);

      try {
        const alunoId = matricula
          ? (await alunoApi.buscarAlunoPorMatricula(matricula)).id
          : identificador;

        const ficha = await fichaApi.buscarFicha(alunoId);

        if (!deveAtualizarEstado) return;

        const matriculasCarregadas = ficha.matriculas ?? [];
        const notasCarregadas = ficha.notas ?? [];
        const frequenciaCarregada = ficha.frequencia;
        const documentosCarregados = ficha.documentos ?? [];
        const periodosCarregados = ficha.periodos ?? [];
        const opcoesCarregadas = getOpcoesSemestre(
          periodosCarregados,
          matriculasCarregadas,
          notasCarregadas,
        );

        setAluno(ficha.aluno);
        setMatriculas(matriculasCarregadas);
        setNotas(notasCarregadas);
        setFrequencia(frequenciaCarregada);
        setDocumentos(documentosCarregados);
        setPeriodos(periodosCarregados);

        // prefer period with status 'ativo' as initial semester selection
        const periodoAtivo = periodosCarregados.find(
          (p: PeriodoLetivoResponse) =>
            String(p.status ?? "").toLowerCase() === "ativo",
        );
        const semestrePadrao = periodoAtivo
          ? normalizarSemestre(
              periodoAtivo.codigo ||
                `${periodoAtivo.ano}-${periodoAtivo.semestre}`,
            )
          : opcoesCarregadas[0] || "";

        setSemestre((semestreAtual) =>
          semestreAtual && opcoesCarregadas.includes(semestreAtual)
            ? semestreAtual
            : semestrePadrao,
        );
      } catch (error) {
        if (!deveAtualizarEstado) return;
        setErro(
          getMensagemErro(error, "Nao foi possivel carregar a ficha do aluno."),
        );
        setAluno(null);
      } finally {
        if (deveAtualizarEstado) setCarregando(false);
      }
    }

    void carregarFicha();

    return () => {
      deveAtualizarEstado = false;
    };
  }, [id, matricula]);

  const matriculaAtiva = useMemo(
    () => getMatriculaAtiva(matriculas),
    [matriculas],
  );
  const alunoFicha = useMemo(
    () => (aluno ? montarAlunoFicha(aluno, matriculaAtiva) : null),
    [aluno, matriculaAtiva],
  );
  const opcoesSemestre = useMemo(
    () => getOpcoesSemestre(periodos, matriculas, notas),
    [matriculas, notas, periodos],
  );
  const notasFicha = useMemo(
    () => montarNotasFicha(notas, frequencia, matriculas, semestre),
    [frequencia, matriculas, notas, semestre],
  );
  const abaSelecionada = abasFicha.find((aba) => aba.value === abaAtual);

  if (carregando) {
    return (
      <Container sx={{ p: { xs: 2, md: 3 } }}>
        <Stack alignItems="center" spacing={2} py={6}>
          <CircularProgress />
          <Typography variant="body2" color="text.secondary">
            Carregando ficha do aluno...
          </Typography>
        </Stack>
      </Container>
    );
  }

  if (erro || !alunoFicha) {
    return (
      <Container sx={{ p: { xs: 2, md: 3 } }}>
        <Alert severity="error">
          {erro ?? "Aluno nao encontrado para montar a ficha."}
        </Alert>
      </Container>
    );
  }

  return (
    <Stack spacing={{ xs: 1.5, md: 2 }}>
      <Container sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <FichaAlunoHeader
            semestre={semestre}
            opcoesSemestre={opcoesSemestre}
            onSemestreChange={setSemestre}
          />
          <FichaAlunoResumoCard aluno={{ ...alunoFicha, semestre }} />
        </Stack>
      </Container>

      <Container sx={{ p: { xs: 1.25, md: 2.5 } }}>
        <Stack spacing={2}>
          <FichaAlunoTabs
            abas={abasFicha}
            abaAtual={abaAtual}
            onChange={setAbaAtual}
          />

          {abaAtual === "notas" && (
            <FichaAlunoNotasTabela
              notas={notasFicha}
              semestre={semestre || "todos"}
            />
          )}

          {abaAtual === "documentos" && (
            <FichaAlunoConteudoAba titulo="Documentos">
              {documentos.length === 0 ? (
                <Typography variant="body2" color="text.secondary">
                  Nenhum documento encontrado para este aluno.
                </Typography>
              ) : (
                <Stack spacing={1.5}>
                  {documentos.map((documento) => (
                    <Paper
                      key={documento.id}
                      elevation={0}
                      sx={{
                        border: (theme) => `1px solid ${theme.palette.divider}`,
                        borderRadius: 2,
                        p: 2,
                      }}
                    >
                      <Stack
                        direction={{ xs: "column", sm: "row" }}
                        spacing={1}
                        justifyContent="space-between"
                      >
                        <Stack minWidth={0}>
                          <Typography variant="subtitle2" fontWeight={700}>
                            {documento.tipo_documento}
                          </Typography>
                          <Typography
                            variant="body2"
                            color="text.secondary"
                            sx={{ wordBreak: "break-word" }}
                          >
                            {documento.nome_arquivo}
                          </Typography>
                          {documento.observacao && (
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {documento.observacao}
                            </Typography>
                          )}
                        </Stack>
                        <Chip
                          label={documento.status ?? "PENDENTE"}
                          size="small"
                          color={
                            documento.status === "APROVADO"
                              ? "success"
                              : "default"
                          }
                          sx={{ alignSelf: { xs: "flex-start", sm: "center" } }}
                        />
                      </Stack>
                    </Paper>
                  ))}
                </Stack>
              )}
            </FichaAlunoConteudoAba>
          )}

          {abaAtual !== "notas" && abaAtual !== "documentos" && (
            <FichaAlunoConteudoAba
              titulo={abaSelecionada?.label ?? ""}
              descricao={`A aba "${abaSelecionada?.label ?? ""}" ainda nao possui endpoint no backend.`}
            />
          )}

          {matriculas.length === 0 && (
            <>
              <Divider />
              <Alert severity="warning">
                Este aluno ainda nao possui matriculas retornadas pela API.
              </Alert>
            </>
          )}
        </Stack>
      </Container>
    </Stack>
  );
}
