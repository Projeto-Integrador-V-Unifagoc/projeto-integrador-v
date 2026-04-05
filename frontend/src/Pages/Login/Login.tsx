import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authService } from '../../services/auth-services';

export function Login() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const navigate = useNavigate();

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    try {
      const data = await authService.login({
        email: email,
        senha: senha,
      });
      console.log("O que o servidor mandou:", data);
      
      localStorage.setItem('@UniEduca:token', data.token);
      localStorage.setItem('@UniEduca:user', JSON.stringify(data.user));

      alert('Login realizado com sucesso!');
      navigate('/home');
    } catch (error) {
      alert('E-mail ou senha incorretos.');
    }
  }

  return (
    <div className="login-container">
      <form onSubmit={handleLogin}>
        <h1>Login - UniEduca</h1>
        <input type="email" placeholder="E-mail" onChange={e => setEmail(e.target.value)} required />
        <input type="password" placeholder="Senha" onChange={e => setSenha(e.target.value)} required />
        <button type="submit">Entrar</button>
        <p>Não tem conta? <a href="/cadastro">Cadastre-se</a></p>
      </form>
    </div>
  );
}