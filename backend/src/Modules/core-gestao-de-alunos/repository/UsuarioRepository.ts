import { db } from "../../../database/connection";

export class UsuarioRepository {
    async criariUsuario(data: any ){
        const usuario = await db("usuarios")
            .insert(data)
            .returning("*")

        return usuario[0]
    }
}