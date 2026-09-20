import { db } from "../../../database/connection";

export interface EmailRemetente {
    id: string;
    email: string;
    nome: string;
}

export class EmailRemetenteRepository {
    listar(): Promise<EmailRemetente[]> {
        return db("email_remetente").select("id", "email", "nome").orderBy("email");
    }

    async criar(email: string, nome: string): Promise<EmailRemetente> {
        const [linha] = await db("email_remetente").insert({ email, nome }).returning(["id", "email", "nome"]);
        return linha;
    }

    async remover(id: string): Promise<boolean> {
        return (await db("email_remetente").where({ id }).delete()) > 0;
    }

    async emUso(email: string): Promise<boolean> {
        return Boolean(await db("configuracao_email").where({ remetente_email: email }).first());
    }
}
