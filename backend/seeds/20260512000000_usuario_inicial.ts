import bcrypt from "bcrypt";

export async function seed(knex: any): Promise<void> {
  const emailSecretaria = "suporte@unieduca.com.br";
  const senhaPadrao = "unieduca2026";

  const existente = await knex("usuario")
    .withSchema("piv")
    .where({ email: emailSecretaria })
    .first();

  if (existente) {
    console.log(`Usuário ${emailSecretaria} já existe (${existente.tipo_usuario}); mantido como está.`);
    return;
  }

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
