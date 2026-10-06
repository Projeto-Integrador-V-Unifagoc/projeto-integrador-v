interface Recaptcha {
  render(container: HTMLElement, options: Record<string, unknown>): number;
  reset(id: number): void;
}
declare global {
  interface Window {
    grecaptcha?: Recaptcha;
    unieducaRecaptchaReady?: () => void;
  }
}

let carregamento: Promise<Recaptcha> | undefined;

export function carregarRecaptcha(): Promise<Recaptcha> {
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

export function exigirTokenRecaptcha(token: string): string {
  if (!token.trim()) throw new Error('Marque a caixa “Não sou um robô” antes de enviar.');
  return token;
}
