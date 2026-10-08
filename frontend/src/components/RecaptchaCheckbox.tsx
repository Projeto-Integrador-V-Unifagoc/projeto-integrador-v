import { useEffect, useRef, useState } from 'react';
import { Alert, Box, Button, Typography, useMediaQuery } from '@mui/material';
import { carregarRecaptcha } from '../services/recaptcha';

interface Props {
  onChange: (token: string) => void;
}

export default function RecaptchaCheckbox({ onChange }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [erro, setErro] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [tentativa, setTentativa] = useState(0);
  const compacto = useMediaQuery('(max-width:599px)');

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let ativo = true;
    let limpar: (() => void) | undefined;
    onChange('');
    const sitekey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    // Cada montagem precisa de um elemento novo, inclusive no StrictMode.
    const widget = document.createElement('div');
    container.appendChild(widget);

    async function montar() {
      try {
        if (!sitekey) throw new Error('Verificação de segurança não configurada.');
        const api = await carregarRecaptcha();
        if (!ativo) return;
        const id = api.render(widget, {
          sitekey,
          size: compacto ? 'compact' : 'normal',
          callback: (token: string) => {
            if (!ativo) return;
            setErro('');
            onChange(token);
          },
          'expired-callback': () => {
            if (!ativo) return;
            onChange('');
            setErro('A verificação expirou. Marque a caixa novamente.');
          },
          'error-callback': () => {
            if (!ativo) return;
            onChange('');
            setErro('Não foi possível verificar a segurança. Tente novamente.');
          },
        });
        limpar = () => api.reset(id);
        setCarregando(false);
      } catch (error) {
        if (!ativo) return;
        onChange('');
        setCarregando(false);
        setErro(error instanceof Error ? error.message : 'Não foi possível carregar a verificação de segurança.');
      }
    }
    void montar();
    return () => {
      ativo = false;
      limpar?.();
      widget.remove();
      onChange('');
    };
  }, [onChange, compacto, tentativa]);

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
      {carregando && <Typography role="status" variant="body2">Carregando verificação de segurança...</Typography>}
      <div ref={containerRef} />
      {erro && (
        <Alert severity="warning" sx={{ width: '100%', boxSizing: 'border-box' }}>
          {erro}
          <Button type="button" size="small" onClick={() => {
            setErro('');
            setCarregando(true);
            setTentativa(atual => atual + 1);
          }}>Tentar novamente</Button>
        </Alert>
      )}
    </Box>
  );
}
