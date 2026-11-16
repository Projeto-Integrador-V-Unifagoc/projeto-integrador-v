// Perfil do usuário logado, lido do mesmo armazenamento usado pelas rotas e pela sidebar.
export function tipoUsuarioLogado(): string {
    try {
        const usuario = JSON.parse(localStorage.getItem("@UniEduca:user") || "{}");
        return String(usuario?.tipo_usuario || "").trim().toLowerCase();
    } catch {
        return "";
    }
}

export function ehGestorDeConteudo() {
    const tipo = tipoUsuarioLogado();
    return tipo === "secretaria" || tipo === "administrador";
}

export function rotuloPerfilGestor() {
    return tipoUsuarioLogado() === "administrador" ? "Administrador" : "Secretaria";
}
