import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { Stack } from "@mui/material";

import Container from "../../components/Container";
import {
  abasFicha,
  alunoMock,
  FichaAlunoConteudoAba,
  FichaAlunoHeader,
  FichaAlunoNotasReais,
  FichaAlunoResumoCard,
  FichaAlunoTabs,
  opcoesSemestre,
  type AbaFicha,
} from "../../components/FichaAluno";
import { useNota } from "../../hooks/use-nota";
import type { BoletimAluno } from "../../models/nota-model";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const mensagemErro = (erro: unknown) => {
  const e = erro as { response?: { data?: { mensagem?: string } }; message?: string };
  return e.response?.data?.mensagem || e.message || "Não foi possível carregar as notas do aluno.";
};

export default function FichaAluno() {
  const { id } = useParams();
  const api = useNota();

  const [busca, setBusca] = useState("");
  const [semestre, setSemestre] = useState(alunoMock.semestre);
  const [abaAtual, setAbaAtual] = useState<AbaFicha>("notas");

  const [boletim, setBoletim] = useState<BoletimAluno | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string>();

  useEffect(() => {
    if (!id || !UUID.test(id)) {
      setErro("Identificador do aluno inválido para consulta de notas.");
      return;
    }
    let ativo = true;
    setCarregando(true);
    setErro(undefined);
    api
      .consultarAluno(id)
      .then((r) => ativo && setBoletim(r))
      .catch((e) => ativo && setErro(mensagemErro(e)))
      .finally(() => ativo && setCarregando(false));
    return () => {
      ativo = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const aluno = useMemo(
    () => ({
      ...alunoMock,
      ra: id ?? alunoMock.ra,
    }),
    [id]
  );

  const abaSelecionada = abasFicha.find((aba) => aba.value === abaAtual);

  return (
    <Stack spacing={{ xs: 1.5, md: 2 }}>
      <Container sx={{ p: { xs: 2, md: 3 } }}>
        <Stack spacing={2.5}>
          <FichaAlunoHeader
            busca={busca}
            semestre={semestre}
            opcoesSemestre={opcoesSemestre}
            onBuscaChange={setBusca}
            onSemestreChange={setSemestre}
          />
          <FichaAlunoResumoCard aluno={aluno} />
        </Stack>
      </Container>

      <Container sx={{ p: { xs: 1.25, md: 2.5 } }}>
        <Stack spacing={2}>
          <FichaAlunoTabs
            abas={abasFicha}
            abaAtual={abaAtual}
            onChange={setAbaAtual}
          />

          {abaAtual === "notas" ? (
            <FichaAlunoNotasReais boletim={boletim} carregando={carregando} erro={erro} />
          ) : (
            <FichaAlunoConteudoAba titulo={abaSelecionada?.label ?? ""} />
          )}
        </Stack>
      </Container>
    </Stack>
  );
}
