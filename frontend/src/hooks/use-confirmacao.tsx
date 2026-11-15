import { useCallback, useEffect, useRef, useState } from "react";
import ConfirmDialog from "../components/ConfirmDialog/ConfirmDialog";

export interface OpcoesConfirmacao {
  titulo: string;
  mensagem: string;
  textoConfirmar?: string;
  textoCancelar?: string;
  cor?: "primary" | "error" | "warning" | "success";
}

export function useConfirmacao() {
  const [opcoes, setOpcoes] = useState<OpcoesConfirmacao | null>(null);
  const resolver = useRef<((confirmado: boolean) => void) | null>(null);

  const responder = useCallback((confirmado: boolean) => {
    resolver.current?.(confirmado);
    resolver.current = null;
    setOpcoes(null);
  }, []);

  const confirmar = useCallback((novasOpcoes: OpcoesConfirmacao) => {
    resolver.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
      setOpcoes(novasOpcoes);
    });
  }, []);

  useEffect(() => () => {
    resolver.current?.(false);
    resolver.current = null;
  }, []);

  return {
    confirmar,
    dialogoConfirmacao: (
      <ConfirmDialog
        open={opcoes !== null}
        titulo={opcoes?.titulo ?? "Confirmar ação"}
        mensagem={opcoes?.mensagem ?? ""}
        textoConfirmar={opcoes?.textoConfirmar}
        textoCancelar={opcoes?.textoCancelar}
        cor={opcoes?.cor}
        onConfirmar={() => responder(true)}
        onCancelar={() => responder(false)}
      />
    ),
  };
}
