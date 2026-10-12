import { useCallback, useEffect, useRef, useState } from "react";

export interface ConfiguracaoConfirmacao {
  titulo: string;
  mensagem: string;
  textoConfirmar: string;
  cor?: "primary" | "warning";
}

export function useConfirmacao() {
  const [dialogo, setDialogo] = useState<{ configuracao: ConfiguracaoConfirmacao | null; aberto: boolean }>({
    configuracao: null, aberto: false,
  });
  const pendente = useRef<((aceito: boolean) => void) | null>(null);

  const solicitar = useCallback((opcoes: ConfiguracaoConfirmacao) => {
    // Uma nova solicitação cancela a anterior, sem deixar ações aguardando indefinidamente.
    pendente.current?.(false);
    return new Promise<boolean>((resolve) => {
      pendente.current = resolve;
      setDialogo({ configuracao: opcoes, aberto: true });
    });
  }, []);

  const responder = useCallback((aceito: boolean) => {
    const resolver = pendente.current;
    pendente.current = null;
    setDialogo((atual) => ({ ...atual, aberto: false }));
    resolver?.(aceito);
  }, []);

  useEffect(() => () => {
    pendente.current?.(false);
    pendente.current = null;
  }, []);

  return {
    ...dialogo, solicitar,
    aceitar: () => responder(true),
    cancelar: () => responder(false),
  };
}
