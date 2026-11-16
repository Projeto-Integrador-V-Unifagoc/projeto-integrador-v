/** Só rotas do próprio sistema viram link nas respostas do assistente: nada de endereço externo nem `javascript:`. */
export function ehRotaInterna(href: string): boolean {
    return /^\/(?!\/)[\w\-/.?=&%#]*$/.test(href);
}
