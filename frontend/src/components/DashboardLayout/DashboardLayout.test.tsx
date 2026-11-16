import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BookOpen, ClipboardList, GraduationCap, Users } from "lucide-react";
import AssistenteIaCaixa from "./AssistenteIaCaixa";
import BotaoIa from "./BotaoIa";
import DashboardLayout from "./DashboardLayout";
import DashboardPainel from "./DashboardPainel";
import DashboardRodape from "./DashboardRodape";
import type { IndicadorDashboard } from "./IndicadorCard";

const INDICADORES: IndicadorDashboard[] = [
  { id: "a", titulo: "Indicador 1", icone: GraduationCap },
  { id: "b", titulo: "Indicador 2", icone: BookOpen },
  { id: "c", titulo: "Indicador 3", icone: Users, alerta: "atencao" },
  { id: "d", titulo: "Indicador 4", icone: ClipboardList, alerta: "critico", valor: "12", complemento: "5%" },
];

function renderizar(props: Partial<Parameters<typeof DashboardLayout>[0]> = {}) {
  return render(
    <DashboardLayout
      nome="Helena"
      contexto="Contexto do perfil"
      indicadores={INDICADORES}
      painelPrincipal={<DashboardPainel titulo="Painel estratégico principal">a</DashboardPainel>}
      painelComplementar={<DashboardPainel titulo="Painel complementar">b</DashboardPainel>}
      painelEvolucao={<DashboardPainel titulo="Evolução e acompanhamento">c</DashboardPainel>}
      painelAcoes={<DashboardPainel titulo="Ações prioritárias">d</DashboardPainel>}
      {...props}
    />,
  );
}

afterEach(() => cleanup());

describe("DashboardLayout", () => {
  it("exibe a saudação com o nome e o contexto", () => {
    renderizar();
    expect(screen.getByRole("heading", { level: 1, name: "Olá, Helena!" })).toBeInTheDocument();
    expect(screen.getByText("Contexto do perfil")).toBeInTheDocument();
  });

  it("renderiza os 4 indicadores com traço como valor padrão", () => {
    renderizar();
    const secao = screen.getByRole("region", { name: "Indicadores" });
    expect(within(secao).getAllByRole("article")).toHaveLength(4);
    expect(within(screen.getByRole("article", { name: "Indicador 1" })).getByText("—")).toBeInTheDocument();
    const quarto = screen.getByRole("article", { name: "Indicador 4" });
    expect(within(quarto).getByText("12")).toBeInTheDocument();
    expect(within(quarto).getByText("5%")).toBeInTheDocument();
  });

  it("limita a exibição a 4 indicadores", () => {
    renderizar({ indicadores: [...INDICADORES, { id: "e", titulo: "Indicador 5", icone: Users }] });
    expect(screen.queryByRole("article", { name: "Indicador 5" })).not.toBeInTheDocument();
  });

  it("posiciona os quatro painéis", () => {
    renderizar();
    for (const titulo of ["Painel estratégico principal", "Painel complementar", "Evolução e acompanhamento", "Ações prioritárias"]) {
      expect(screen.getByRole("heading", { level: 2, name: titulo })).toBeInTheDocument();
    }
  });

  it("mostra o esqueleto enquanto carrega", () => {
    renderizar({ carregando: true });
    expect(screen.getByLabelText("Carregando dashboard")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
  });

  it("usa a caixa do assistente sem envio por padrão", () => {
    renderizar();
    expect(screen.getByRole("button", { name: "Enviar pergunta" })).toHaveAttribute("aria-disabled", "true");
  });
});

describe("DashboardLayout — slots opcionais", () => {
  it("exibe avisos e extras do cabeçalho quando informados", () => {
    renderizar({ avisos: <p>Aviso importante</p>, extrasCabecalho: <button type="button">Período</button> });
    expect(screen.getByText("Aviso importante")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Período" })).toBeInTheDocument();
  });

  it("não renderiza extras por padrão", () => {
    renderizar();
    expect(screen.queryByRole("button", { name: "Período" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Atualizar dados" })).not.toBeInTheDocument();
  });

  it("o rodapé não mostra nada no canto direito por padrão", () => {
    render(<DashboardRodape status="Status" />);
    const rodape = screen.getByRole("contentinfo");
    expect(rodape).toHaveTextContent("Status");
    expect(rodape).not.toHaveTextContent("UniEduca");
  });

  it("aciona a atualização pelo rodapé", () => {
    const onAtualizar = vi.fn();
    renderizar({ rodape: <DashboardRodape onAtualizar={onAtualizar} /> });
    fireEvent.click(screen.getByRole("button", { name: "Atualizar dados" }));
    expect(onAtualizar).toHaveBeenCalledOnce();
  });
});

describe("AssistenteIaCaixa", () => {
  it("Enter envia, mas não enquanto uma palavra está em composição (IME)", () => {
    const onEnviar = vi.fn();
    render(<AssistenteIaCaixa onEnviar={onEnviar} />);
    const campo = screen.getByLabelText("Pergunta para o assistente de IA");
    fireEvent.change(campo, { target: { value: "Minhas notas" } });
    fireEvent.keyDown(campo, { key: "Enter", isComposing: true });
    expect(onEnviar).not.toHaveBeenCalled();
    fireEvent.keyDown(campo, { key: "Enter" });
    expect(onEnviar).toHaveBeenCalledWith("Minhas notas");
  });

  it("não envia nada quando não há callback", () => {
    render(<AssistenteIaCaixa sugestoes={["Sugestão 1"]} />);
    fireEvent.change(screen.getByLabelText("Pergunta para o assistente de IA"), { target: { value: "Oi" } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));
    expect(screen.getByLabelText("Pergunta para o assistente de IA")).toHaveValue("Oi");
  });

  it("envia a pergunta e as sugestões quando há callback", () => {
    const onEnviar = vi.fn();
    render(<AssistenteIaCaixa sugestoes={["Sugestão 1"]} onEnviar={onEnviar} />);
    const campo = screen.getByLabelText("Pergunta para o assistente de IA");
    fireEvent.change(campo, { target: { value: "  Quem está em atenção?  " } });
    fireEvent.click(screen.getByRole("button", { name: "Enviar pergunta" }));
    expect(onEnviar).toHaveBeenCalledWith("Quem está em atenção?");
    expect(campo).toHaveValue("");
    fireEvent.click(screen.getByText("Sugestão 1"));
    expect(onEnviar).toHaveBeenLastCalledWith("Sugestão 1");
  });
});

describe("BotaoIa", () => {
  it("compacto mostra só o ícone, com o rótulo acessível, e fica inerte sem ação", () => {
    render(<BotaoIa rotulo="Analisar com IA" compacto />);
    const botao = screen.getByRole("button", { name: "Analisar com IA" });
    expect(botao).toHaveAttribute("aria-disabled", "true");
    expect(botao).not.toHaveTextContent("Analisar com IA");
  });

  it("aciona a ação quando informada", () => {
    const onClick = vi.fn();
    render(<BotaoIa rotulo="Entender meu desempenho" compacto onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Entender meu desempenho" }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});

describe("DashboardPainel", () => {
  it("exibe contador e aciona a ação do cabeçalho", () => {
    const acao = vi.fn();
    render(<DashboardPainel titulo="Alunos" contador={8} acao={{ rotulo: "Ver todos", onClick: acao }}>x</DashboardPainel>);
    expect(screen.getByText("8")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver todos" }));
    expect(acao).toHaveBeenCalledOnce();
  });
});
