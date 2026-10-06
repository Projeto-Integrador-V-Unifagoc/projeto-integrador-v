import { useCallback, useState } from 'react';

export function useRecaptcha() {
  const [token, setToken] = useState('');
  const [versao, setVersao] = useState(0);
  const resetar = useCallback(() => {
    setToken('');
    setVersao(atual => atual + 1);
  }, []);
  return { token, setToken, versao, resetar };
}
