import bcrypt from "bcrypt";

export async function seed(knex: any): Promise<void> {
  const emailSecretaria = "suporte@unieduca.com.br";
  const senhaPadrao = "unieduca2026";

  await knex("usuario")
    .withSchema("piv")
    .whereIn("email", [
      "suporte@unieduca.com.br",
    ])
    .del();

  const senhaHash = await bcrypt.hash(senhaPadrao, 10);

  await knex("usuario")
    .withSchema("piv")
    .insert({
      nome: "Suporte UniEduca",
      email: emailSecretaria,
      senha: senhaHash,
      tipo_usuario: "secretaria",
    });

  console.log("Usuário Secretaria inicial criado com sucesso.");
}