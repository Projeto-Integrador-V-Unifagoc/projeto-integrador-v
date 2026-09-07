import axios from "axios";

const TOKEN_KEY = "@UniEduca:token";

/**
 * Instância usada pelas telas de Matrícula, Vínculos Acadêmicos e Validação de
 * Documentos, cujas rotas exigem perfil de secretaria ou administrador.
 *
 * A instância compartilhada em `lib/axios` não anexa o token: o interceptor de
 * `auth-interceptor.ts` foi escrito mas nunca chegou a ser ligado a ela. Alterar
 * aquele arquivo mudaria o comportamento de todos os módulos do sistema, então o
 * módulo de matrícula declara aqui a sua própria instância autenticada.
 */
export const apiAutenticada = axios.create({
    baseURL: import.meta.env.VITE_API_URL ?? "http://localhost:3000",
});

apiAutenticada.interceptors.request.use((config) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
