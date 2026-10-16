import { useEffect, useState } from "react";
import { EVENTO_LIMITE_REQUISICOES, segundosAteLiberar } from "../services/limite-requisicoes";

/**
 * Segundos que faltam para a rota (ex.: "POST /login") voltar a aceitar
 * requisições depois de um 429. Atualiza a cada segundo enquanto houver espera,
 * para a tela desabilitar o envio e mostrar a contagem regressiva.
 */
export function useEsperaLimite(chave: string): number {
    const [segundos, setSegundos] = useState(() => segundosAteLiberar(chave));

    useEffect(() => {
        const atualizar = () => setSegundos(segundosAteLiberar(chave));
        atualizar();
        window.addEventListener(EVENTO_LIMITE_REQUISICOES, atualizar);
        return () => window.removeEventListener(EVENTO_LIMITE_REQUISICOES, atualizar);
    }, [chave]);

    const aguardando = segundos > 0;

    useEffect(() => {
        if (!aguardando) return;
        const intervalo = window.setInterval(() => setSegundos(segundosAteLiberar(chave)), 1000);
        return () => window.clearInterval(intervalo);
    }, [chave, aguardando]);

    return segundos;
}
