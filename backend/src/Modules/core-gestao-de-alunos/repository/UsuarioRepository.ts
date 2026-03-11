import { db } from "../../../database/connection";

export class UsuarioRepository {
    async criariUsuario(data: any ){
        const usuario = await db("usuarios")
            .insert(data)
            .returning("*")

        return usuario[0]
    }

    async listarUsuarios(){
        const usuarios = await db("usuarios").select("*")
        return usuarios
    }

    async buscarUsuarioPorEmail(email: string){
        const usuario = await db("usuarios").select("*").where("email", email)
        return usuario[0]
    }

    async buscarUsuarioPorId(id: string){
        const usuario = await db("usuarios").select("*").where("id", id)
        return usuario[0]
    }
}