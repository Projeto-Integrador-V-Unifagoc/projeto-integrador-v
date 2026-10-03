import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { executarRecaptcha } from './recaptcha';

let opcoes: Record<string, unknown>;
const reset = vi.fn();
const execute = vi.fn();
beforeEach(() => {
  vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', 'publica-teste');
  vi.useFakeTimers();
  reset.mockReset();
  execute.mockReset();
  window.grecaptcha = {
    render: vi.fn((_container, options) => { opcoes = options; return 1; }),
    execute,
    reset,
  };
});
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  delete window.grecaptcha;
});

it('executa invisivelmente e renova o token para cada envio', async () => {
  execute.mockImplementation(() => (opcoes.callback as (token: string) => void)('token-novo'));
  await expect(executarRecaptcha()).resolves.toBe('token-novo');
  await expect(executarRecaptcha()).resolves.toBe('token-novo');
  expect(opcoes.size).toBe('invisible');
  expect(execute).toHaveBeenCalledTimes(2);
  expect(reset).toHaveBeenCalledTimes(2);
});

it('permite tentar novamente após falha do desafio', async () => {
  execute.mockImplementation(() => (opcoes['error-callback'] as () => void)());
  await expect(executarRecaptcha()).rejects.toThrow('não concluída');
  execute.mockImplementation(() => (opcoes.callback as (token: string) => void)('novo'));
  await expect(executarRecaptcha()).resolves.toBe('novo');
});

it('encerra desafio abandonado e não deixa envio pendente indefinidamente', async () => {
  const resultado = expect(executarRecaptcha()).rejects.toThrow('não concluída');
  await vi.advanceTimersByTimeAsync(120000);
  await resultado;
});

it('não executa sem chave pública', async () => {
  vi.stubEnv('VITE_RECAPTCHA_SITE_KEY', '');
  await expect(executarRecaptcha()).rejects.toThrow('não configurada');
  expect(execute).not.toHaveBeenCalled();
});
