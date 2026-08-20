import { db } from "../../../database/connection";

export class UsuarioRepository {
    async criarUsuario(data: any) {
        const usuario = await db("usuario")
            .insert(data)
            .returning("*");
        return usuario;
    }

    async listarUsuarios() {
        const usuarios = await db("usuario").select("*");
        return usuarios;
    } 

    async buscarUsuarioPorId(id: string) {
        const usuario = await db("usuario")
            .select("*")
            .where("id", id);
        return usuario[0];
    }
}