import { StrictMode } from 'react';
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import RecaptchaCheckbox from './RecaptchaCheckbox';
import { useRecaptcha } from '../hooks/use-recaptcha';

let opcoes: Record<string, unknown>;
const reset = vi.fn();
const renderWidget = vi.fn((_container: HTMLElement, options: Record<string, unknown>) => {
  opcoes = options;
  return 1;
});

beforeEach(() => {
  vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'publica-checkbox');
  vi.stubGlobal('matchMedia', vi.fn(() => ({
    matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn(),
  })));
  reset.mockClear();
  renderWidget.mockClear();
  window.grecaptcha = { render: renderWidget, reset };
});

afterEach(() => {
  cleanup();
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  delete window.grecaptcha;
});

it('renderiza a caixa no formulário e invalida o token ao expirar ou falhar', async () => {
  const onChange = vi.fn();
  const { unmount } = render(<RecaptchaCheckbox onChange={onChange} />);
  await waitFor(() => expect(renderWidget).toHaveBeenCalledTimes(1));
  expect(opcoes.size).toBe('normal');
  expect(opcoes.sitekey).toBe('publica-checkbox');
  act(() => (opcoes.callback as (token: string) => void)('token'));
  expect(onChange).toHaveBeenLastCalledWith('token');
  act(() => (opcoes['expired-callback'] as () => void)());
  expect(onChange).toHaveBeenLastCalledWith('');
  expect(screen.getByText(/verificação expirou/)).toBeInTheDocument();
  act(() => (opcoes['error-callback'] as () => void)());
  expect(onChange).toHaveBeenLastCalledWith('');
  unmount();
  expect(reset).toHaveBeenCalledWith(1);
  onChange.mockClear();
  act(() => (opcoes.callback as (token: string) => void)('token-antigo'));
  expect(onChange).not.toHaveBeenCalled();
});

it('exige nova verificação depois de enviar, inclusive com StrictMode', async () => {
  function Formulario() {
    const recaptcha = useRecaptcha();
    return <>
      <RecaptchaCheckbox key={recaptcha.versao} onChange={recaptcha.setToken} />
      <button disabled={!recaptcha.token} onClick={recaptcha.resetar}>Enviar</button>
    </>;
  }
  render(<StrictMode><Formulario /></StrictMode>);
  await waitFor(() => expect(renderWidget).toHaveBeenCalledTimes(1));
  expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  act(() => (opcoes.callback as (token: string) => void)('token'));
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
  expect(screen.getByRole('button', { name: 'Enviar' })).toBeDisabled();
  await waitFor(() => expect(renderWidget).toHaveBeenCalledTimes(2));
  expect(reset).toHaveBeenCalledWith(1);
});

it('mostra erro de configuração sem renderizar uma caixa inválida', async () => {
  vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', '');
  render(<RecaptchaCheckbox onChange={vi.fn()} />);
  expect(await screen.findByText('Verificação de segurança não configurada.')).toBeInTheDocument();
  expect(renderWidget).not.toHaveBeenCalled();
});

it('permite recarregar a caixa após falha', async () => {
  render(<RecaptchaCheckbox onChange={vi.fn()} />);
  await waitFor(() => expect(renderWidget).toHaveBeenCalledTimes(1));
  act(() => (opcoes['error-callback'] as () => void)());
  fireEvent.click(screen.getByRole('button', { name: 'Tentar novamente' }));
  await waitFor(() => expect(renderWidget).toHaveBeenCalledTimes(2));
  expect(reset).toHaveBeenCalledWith(1);
});
