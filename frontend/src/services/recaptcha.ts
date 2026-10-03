interface Recaptcha {
  render(container: HTMLElement, options: Record<string, unknown>): number;
  execute(id: number): void;
  reset(id: number): void;
}
declare global {
  interface Window {
    grecaptcha?: Recaptcha;
    unieducaRecaptchaReady?: () => void;
  }
}

let carregamento: Promise<Recaptcha> | undefined;
let emAndamento = false;

function carregar(): Promise<Recaptcha> {
  if (window.grecaptcha?.render) return Promise.resolve(window.grecaptcha);
  if (carregamento) return carregamento;
  carregamento = new Promise<Recaptcha>((resolve, reject) => {
    const script = document.createElement('script');
    const falhar = () => {
      clearTimeout(timer);
      script.remove();
      delete window.unieducaRecaptchaReady;
      reject(new Error('Não foi possível carregar a verificação de segurança. Tente novamente.'));
    };
    const timer = window.setTimeout(falhar, 15000);
    window.unieducaRecaptchaReady = () => {
      clearTimeout(timer);
      if (window.grecaptcha) resolve(window.grecaptcha);
      else falhar();
    };
    script.src = 'https://www.google.com/recaptcha/api.js?onload=unieducaRecaptchaReady&render=explicit&hl=pt-BR';
    script.async = true;
    script.defer = true;
    script.onerror = falhar;
    document.head.appendChild(script);
  }).catch(error => { carregamento = undefined; throw error; });
  return carregamento;
}

export async function executarRecaptcha(): Promise<string> {
  if (emAndamento) throw new Error('Aguarde a verificação de segurança em andamento.');
  const sitekey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
  if (!sitekey) throw new Error('Verificação de segurança não configurada.');
  emAndamento = true;
  try {
    const api = await carregar();
    return await new Promise<string>((resolve, reject) => {
      const container = document.createElement('div');
      document.body.appendChild(container);
      let id: number | undefined;
      let concluido = false;
      const finalizar = (token?: string) => {
        if (concluido) return;
        concluido = true;
        clearTimeout(timer);
        if (id !== undefined) api.reset(id);
        container.remove();
        if (token) resolve(token);
        else reject(new Error('Verificação de segurança não concluída. Tente novamente.'));
      };
      const timer = window.setTimeout(() => finalizar(), 120000);
      try {
        id = api.render(container, {
          sitekey, size: 'invisible', badge: 'bottomright',
          callback: (token: string) => finalizar(token),
          'expired-callback': () => finalizar(),
          'error-callback': () => finalizar(),
        });
        api.execute(id);
      } catch { finalizar(); }
    });
  } finally { emAndamento = false; }
}
