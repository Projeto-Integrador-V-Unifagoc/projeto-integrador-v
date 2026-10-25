import { StrictMode } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { dispensarRecaptchaLocal } from './recaptcha';
import RecaptchaCheckbox from '../components/RecaptchaCheckbox';
import { useRecaptcha } from '../hooks/use-recaptcha';

afterEach(() => { cleanup(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

it.each([
  [true, 'localhost', true],
  [true, '127.0.0.1', true],
  [true, '[::1]', true],
  [true, 'unieduca.net.br', false],
  [true, 'localhost.example.com', false],
  [false, 'localhost', false],
  [false, '127.0.0.1', false],
])('dispensa local em DEV=%s e host=%s: %s', (dev, hostname, esperado) => {
  vi.stubEnv('DEV', dev);
  vi.stubGlobal('location', { hostname });
  expect(dispensarRecaptchaLocal()).toBe(esperado);
});

it('libera o formulário local após envios repetidos sem carregar o Google', () => {
  vi.stubEnv('DEV', true);
  vi.stubGlobal('location', { hostname: 'localhost' });
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
  const renderWidget = vi.fn();
  window.grecaptcha = { render: renderWidget, reset: vi.fn() };
  function Formulario() {
    const recaptcha = useRecaptcha();
    return <>
      <RecaptchaCheckbox key={recaptcha.versao} onChange={recaptcha.setToken} />
      <button disabled={!recaptcha.token} onClick={recaptcha.resetar}>Enviar</button>
    </>;
  }
  try {
    render(<StrictMode><Formulario /></StrictMode>);
    const botao = screen.getByRole('button', { name: 'Enviar' });
    expect(botao).toBeEnabled();
    fireEvent.click(botao);
    fireEvent.click(botao);
    expect(botao).toBeEnabled();
    expect(renderWidget).not.toHaveBeenCalled();
    expect(screen.queryByRole('status')).not.toBeInTheDocument();
    expect(document.querySelector('script[src*="recaptcha"]')).toBeNull();
  } finally { delete window.grecaptcha; }
});
