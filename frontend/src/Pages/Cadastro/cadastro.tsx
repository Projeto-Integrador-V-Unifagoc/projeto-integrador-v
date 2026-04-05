import { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Para redirecionar após o sucesso
import { authService } from '../../services/auth-services';
import { Perfil } from '../../enums/perfil';
import type { Usuario } from '../../models/usuario';

export function Cadastro() {
  const navigate = useNavigate();
  
  // Estado inicial seguindo a sua interface Usuario
  const [formData, setFormData] = useState<Usuario>({
    nome: '',
    email: '',
    senha: '',
    tipo_usuario: Perfil.ALUNO // Valor padrão
  });

  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      // Chama o serviço que criamos no passo anterior
      await authService.cadastrar(formData);
      
      alert('Usuário criado com sucesso! Agora você pode fazer login.');
      navigate('/login'); // Redireciona o usuário
    } catch (error) {
      console.error(error);
      alert('Erro ao cadastrar. Verifique se o e-mail já existe ou se o backend está ligado.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="cadastro-container">
      <form onSubmit={handleSubmit}>
        <h1>Criar Conta - Fire and Blood</h1>
        
        <input 
          type="text" 
          placeholder="Nome Completo"
          required
          onChange={e => setFormData({ ...formData, nome: e.target.value })}
        />

        <input 
          type="email" 
          placeholder="E-mail"
          required
          onChange={e => setFormData({ ...formData, email: e.target.value })}
        />

        <input 
          type="password" 
          placeholder="Senha"
          required
          onChange={e => setFormData({ ...formData, senha: e.target.value })}
        />

        <label>Tipo de Perfil:</label>
        <select 
          value={formData.tipo_usuario}
          onChange={e => setFormData({ ...formData, tipo_usuario: e.target.value as Perfil })}
        >
          <option value={Perfil.ALUNO}>Aluno</option>
          <option value={Perfil.PROFESSOR}>Professor</option>
          <option value={Perfil.SECRETARIA}>Secretaria</option>
        </select>

        <button type="submit" disabled={loading}>
          {loading ? 'Cadastrando...' : 'Finalizar Cadastro'}
        </button>
      </form>
    </div>
  );
}