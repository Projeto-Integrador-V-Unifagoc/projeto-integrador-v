import { useEffect, useState } from "react";
import { listarMatriculas } from "../../services/matriculaService";

export default function Matriculas() {
  const [matriculas, setMatriculas] = useState<any[]>([]);

 useEffect(() => {
    listarMatriculas()
      .then((resposta) => {
        setMatriculas(resposta.data);
      })
      .catch((erro) => {
        console.error("Erro ao buscar matrículas:", erro);
      });
  }, []);

  return (
    <div style={{ padding: "20px", fontFamily: "sans-serif" }}>
      <h2>Gerenciar Matrículas</h2>
      <table border={1} cellPadding="10" style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ backgroundColor: "#f0f0f0", textAlign: "left" }}>
            <th>ID da Matrícula</th>
            <th>ID do Aluno</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {matriculas.map((matricula) => (
            <tr key={matricula.id}>
              <td>{matricula.id}</td>
              <td>{matricula.alunoId}</td>
              <td>{matricula.status}</td>
            </tr>
          ))}
          {matriculas.length === 0 && (
            <tr>
              <td colSpan={3} style={{ textAlign: "center" }}>Nenhuma matrícula encontrada.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}