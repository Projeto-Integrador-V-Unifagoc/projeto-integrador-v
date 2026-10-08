import { ThemeProvider } from "@mui/material";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import type { ResultadoAcademico } from "../../models/resultado-academico-model";
import { theme } from "../../theme";
import { ResultadoAcademicoResumo } from "./ResultadoAcademicoResumo";

afterEach(cleanup);

function resultado(overrides: Partial<ResultadoAcademico> = {}): ResultadoAcademico {
  return {
    contratoVersao: 2,
    turmaDisciplinaId: "22222222-2222-2222-2222-222222222222",
    matriculaTurmaDisciplinaId: "44444444-4444-4444-4444-444444444444",
    regraPontuacaoId: "77777777-7777-7777-7777-777777777777",
    totalPontos: "120.00", cortePontos: "72.00",
    planoCompleto: true, avaliacoesRegulares: 6, avaliacoesLancadas: 6,
    avaliacoesSemNota: [], etapaRegularCompleta: true,
    pontosRegularesObtidos: "72.00", pontosMaximosLancados: "120.00",
    indicadorRegular: { percentual: 60, parcial: false, denominadorPontos: "120.00" },
    pontosRecuperacao: null, valorMaximoRecuperacao: "120.00",
    pontosEfetivos: "72.00", percentualResultado: 60,
    resultadoPorNota: "SUFICIENTE", elegivelRecuperacaoPorNota: false,
    frequencia: { presencas: 0, faltas: 0, percentual: null, situacao: "NAO_LANCADO", requisito: "PENDENTE" },
    aprovacaoDisciplina: "PENDENTE", motivos: ["FREQUENCIA_PENDENTE"],
    ...overrides,
  };
}

function mostrar(valor: ResultadoAcademico | null | undefined, compacto = false) {
  return render(<ThemeProvider theme={theme}>
    <ResultadoAcademicoResumo resultado={valor} compacto={compacto} />
  </ThemeProvider>);
}

describe("ResultadoAcademicoResumo - apresentação do contrato canônico", () => {
  it("mostra os 72 pontos suficientes em 120 com corte e aprovação pendente pela frequência ausente", () => {
    mostrar(resultado());
    expect(screen.getByLabelText("Pontos regulares")).toHaveTextContent("72,00");
    expect(screen.getByLabelText("Total de pontos")).toHaveTextContent("120,00");
    expect(screen.getByLabelText("Corte")).toHaveTextContent("72,00");
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Suficiente");
    expect(screen.getByLabelText("Frequência")).toHaveTextContent("Não lançada");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Pendente");
    expect(screen.getByText("Frequência pendente")).toBeInTheDocument();
    expect(screen.queryByText(/^Aprovad[ao]$/i)).not.toBeInTheDocument();
  });

  it("mantém frequência insuficiente separada da nota suficiente e explica o impedimento", () => {
    mostrar(resultado({ frequencia: { presencas: 10, faltas: 10, percentual: 50, situacao: "RISCO_REPROVACAO", requisito: "INSUFICIENTE" },
      aprovacaoDisciplina: "NAO_APROVADA", motivos: ["FREQUENCIA_INSUFICIENTE"] }));
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Suficiente");
    expect(screen.getByLabelText("Frequência")).toHaveTextContent("50,00%");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Não aprovada");
    expect(screen.getByText("Frequência insuficiente")).toBeInTheDocument();
  });

  it("permite apresentar aprovação com alerta de frequência aos 75%, conforme o servidor", () => {
    mostrar(resultado({ frequencia: { presencas: 15, faltas: 5, percentual: 75, situacao: "ALERTA", requisito: "SUFICIENTE" },
      aprovacaoDisciplina: "APROVADA", motivos: [] }));
    expect(screen.getByLabelText("Frequência")).toHaveTextContent("75,00%");
    expect(screen.getByLabelText("Frequência")).toHaveTextContent("Alerta");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Aprovada");
  });

  it("explica plano incompleto e indicador parcial de 100% sem antecipar aprovação ou elegibilidade", () => {
    mostrar(resultado({ planoCompleto: false, etapaRegularCompleta: false,
      avaliacoesRegulares: 2, avaliacoesLancadas: 1, avaliacoesSemNota: ["66666666-6666-6666-6666-666666666666"],
      pontosRegularesObtidos: "12.00", pontosMaximosLancados: "12.00",
      indicadorRegular: { percentual: 100, parcial: true, denominadorPontos: "12.00" },
      pontosEfetivos: null, percentualResultado: null, resultadoPorNota: "EM_ANDAMENTO",
      elegivelRecuperacaoPorNota: false, motivos: ["PLANO_INCOMPLETO", "NOTAS_PENDENTES", "FREQUENCIA_PENDENTE"] }));
    expect(screen.getByLabelText("Indicador regular")).toHaveTextContent("100,00%");
    expect(screen.getByLabelText("Indicador regular")).toHaveTextContent("Parcial");
    expect(screen.getByLabelText("Pontos efetivos")).toHaveTextContent("-");
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Em andamento");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Pendente");
    expect(screen.getByText("Plano incompleto")).toBeInTheDocument();
    expect(screen.getByText("Notas pendentes")).toBeInTheDocument();
    expect(screen.queryByText("Elegível para recuperação por nota")).not.toBeInTheDocument();
  });

  it("mostra nota não lançada e percentual ausente em vez de preenchê-los com zero", () => {
    mostrar(resultado({ avaliacoesRegulares: 1, avaliacoesLancadas: 0, avaliacoesSemNota: ["66666666-6666-6666-6666-666666666666"],
      etapaRegularCompleta: false, pontosRegularesObtidos: "0.00", pontosMaximosLancados: "0.00",
      indicadorRegular: { percentual: null, parcial: true, denominadorPontos: "0.00" },
      pontosEfetivos: null, percentualResultado: null, resultadoPorNota: "NAO_LANCADA",
      motivos: ["SEM_NOTAS", "NOTAS_PENDENTES", "FREQUENCIA_PENDENTE"] }));
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Não lançada");
    expect(screen.getByLabelText("Indicador regular")).toHaveTextContent("-");
    expect(screen.getByText("Sem notas lançadas")).toBeInTheDocument();
    expect(screen.getByLabelText("Frequência")).not.toHaveTextContent("0,00%");
  });

  it("exibe zero registrado como pontos efetivos sem tratá-lo como resultado ausente", () => {
    mostrar(resultado({ pontosRegularesObtidos: "0.00", pontosEfetivos: "0.00", percentualResultado: 0,
      indicadorRegular: { percentual: 0, parcial: false, denominadorPontos: "120.00" },
      resultadoPorNota: "EM_RECUPERACAO", elegivelRecuperacaoPorNota: true,
      motivos: ["ABAIXO_DO_CORTE", "RECUPERACAO_PENDENTE", "FREQUENCIA_PENDENTE"] }));
    expect(screen.getByLabelText("Pontos efetivos")).toHaveTextContent("0,00");
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Em recuperação");
    expect(screen.getByText("Elegível para recuperação por nota")).toBeInTheDocument();
  });

  it("não aprova 179,99 em 300 mesmo quando o percentual exibido arredonda para 60%", () => {
    mostrar(resultado({ totalPontos: "300.00", cortePontos: "180.00", pontosRegularesObtidos: "179.99",
      pontosMaximosLancados: "300.00", indicadorRegular: { percentual: 60, parcial: false, denominadorPontos: "300.00" },
      valorMaximoRecuperacao: "300.00", pontosEfetivos: "179.99", percentualResultado: 60,
      resultadoPorNota: "EM_RECUPERACAO", elegivelRecuperacaoPorNota: true,
      motivos: ["ABAIXO_DO_CORTE", "RECUPERACAO_PENDENTE", "FREQUENCIA_PENDENTE"] }));
    expect(screen.getByLabelText("Pontos efetivos")).toHaveTextContent("179,99");
    expect(screen.getByLabelText("Percentual do resultado")).toHaveTextContent("60,00%");
    expect(screen.getByLabelText("Corte")).toHaveTextContent("180,00");
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Em recuperação");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Pendente");
    expect(screen.getByText("Abaixo do corte")).toBeInTheDocument();
  });

  it("preserva o corte exato de três casas para 60 em 100,01 sem arredondamento da decisão", () => {
    mostrar(resultado({ totalPontos: "100.01", cortePontos: "60.006", pontosRegularesObtidos: "60.00",
      pontosMaximosLancados: "100.01", indicadorRegular: { percentual: 59.99, parcial: false, denominadorPontos: "100.01" },
      valorMaximoRecuperacao: "100.01", pontosEfetivos: "60.00", percentualResultado: 59.99,
      resultadoPorNota: "EM_RECUPERACAO", elegivelRecuperacaoPorNota: true,
      motivos: ["ABAIXO_DO_CORTE", "RECUPERACAO_PENDENTE", "FREQUENCIA_PENDENTE"] }));
    expect(screen.getByLabelText("Corte")).toHaveTextContent("60,006");
    expect(screen.getByLabelText("Total de pontos")).toHaveTextContent("100,01");
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Em recuperação");
  });

  it("conserva recuperação melhor que a regular retificada sem somar as etapas", () => {
    mostrar(resultado({ pontosRegularesObtidos: "70.00", pontosRecuperacao: "80.00", pontosEfetivos: "80.00",
      indicadorRegular: { percentual: 58.33, parcial: false, denominadorPontos: "120.00" }, percentualResultado: 66.67,
      elegivelRecuperacaoPorNota: true, frequencia: { presencas: 19, faltas: 1, percentual: 95, situacao: "REGULAR", requisito: "SUFICIENTE" },
      aprovacaoDisciplina: "APROVADA", motivos: [] }));
    expect(screen.getByLabelText("Pontos regulares")).toHaveTextContent("70,00");
    expect(screen.getByLabelText("Recuperação")).toHaveTextContent("80,00");
    expect(screen.getByLabelText("Pontos efetivos")).toHaveTextContent("80,00");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Aprovada");
    expect(screen.queryByText("150,00")).not.toBeInTheDocument();
  });

  it("explica resultado insuficiente após recuperação sem esconder frequência suficiente", () => {
    mostrar(resultado({ pontosRegularesObtidos: "60.00", pontosRecuperacao: "65.00", pontosEfetivos: "65.00",
      indicadorRegular: { percentual: 50, parcial: false, denominadorPontos: "120.00" }, percentualResultado: 54.17,
      resultadoPorNota: "INSUFICIENTE", elegivelRecuperacaoPorNota: true,
      frequencia: { presencas: 19, faltas: 1, percentual: 95, situacao: "REGULAR", requisito: "SUFICIENTE" },
      aprovacaoDisciplina: "NAO_APROVADA", motivos: ["ABAIXO_DO_CORTE"] }));
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Insuficiente");
    expect(screen.getByLabelText("Frequência")).toHaveTextContent("95,00%");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Não aprovada");
  });

  it("explicita regra ausente sem preencher total ou corte padrão de 100", () => {
    mostrar(resultado({ regraPontuacaoId: null, totalPontos: null, cortePontos: null, planoCompleto: false,
      etapaRegularCompleta: false, pontosEfetivos: null, percentualResultado: null,
      resultadoPorNota: "EM_ANDAMENTO", valorMaximoRecuperacao: null,
      motivos: ["REGRA_AUSENTE", "PLANO_INCOMPLETO", "FREQUENCIA_PENDENTE"] }));
    expect(screen.getByText("Regra de pontuação ausente")).toBeInTheDocument();
    expect(screen.getByLabelText("Total de pontos")).toHaveTextContent("-");
    expect(screen.getByLabelText("Corte")).toHaveTextContent("-");
    expect(screen.queryByText("100,00")).not.toBeInTheDocument();
  });

  it.each([null, undefined])("trata DTO %s como indisponibilidade, sem fabricar classificação", (valor) => {
    mostrar(valor);
    expect(screen.getByText("Resultado acadêmico indisponível")).toBeInTheDocument();
    expect(screen.queryByLabelText("Aprovação na disciplina")).not.toBeInTheDocument();
  });

  it("mantém estados textuais e separados no resumo compacto usado nas tabelas", () => {
    mostrar(resultado(), true);
    expect(screen.getByLabelText("Resultado por nota")).toHaveTextContent("Suficiente");
    expect(screen.getByLabelText("Frequência")).toHaveTextContent("Não lançada");
    expect(screen.getByLabelText("Aprovação na disciplina")).toHaveTextContent("Pendente");
    expect(screen.getByLabelText("Corte")).toHaveTextContent("72,00");
  });
});
