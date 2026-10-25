import { useCallback, useState } from 'react';
import { dispensarRecaptchaLocal } from '../services/recaptcha';

export function useRecaptcha() {
  // Apenas libera os formulários locais; o backend decide se dispensa a validação.
  const tokenInicial = dispensarRecaptchaLocal() ? 'desenvolvimento-local' : '';
  const [token, setToken] = useState(tokenInicial);
  const [versao, setVersao] = useState(0);
  const resetar = useCallback(() => {
    setToken(tokenInicial);
    setVersao(atual => atual + 1);
  }, [tokenInicial]);
  return { token, setToken, versao, resetar };
}
