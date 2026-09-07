import type { Knex } from 'knex';

import { db } from '../../../database/connection';

export interface RecuperacaoSenha {
  id?: string;
  usuario_id: string;
  token_hash: string;
  expires_at: Date;
  used_at?: Date | null;
  created_at?: Date;
}

export class RecuperacaoSenhaRepository {
  async criar(
    dados: Omit<
      RecuperacaoSenha,
      'id' | 'used_at' | 'created_at'
    >
  ): Promise<RecuperacaoSenha> {
    const resultado = await db('piv.recuperacao_senha')
      .insert(dados)
      .returning('*');

    return resultado[0] as RecuperacaoSenha;
  }

  async consumirTokenValido(
    tokenHash: string,
    transacao: Knex.Transaction
  ): Promise<RecuperacaoSenha | null> {
    const resultado = await transacao(
      'piv.recuperacao_senha'
    )
      .where({ token_hash: tokenHash })
      .whereNull('used_at')
      .where('expires_at', '>', transacao.fn.now())
      .update({
        used_at: transacao.fn.now(),
      })
      .returning('*');

    return (resultado[0] as RecuperacaoSenha) || null;
  }

  async invalidarTokensDoUsuario(
    usuarioId: string
  ): Promise<void> {
    await db('piv.recuperacao_senha')
      .where({ usuario_id: usuarioId })
      .whereNull('used_at')
      .update({
        used_at: db.fn.now(),
      });
  }
}