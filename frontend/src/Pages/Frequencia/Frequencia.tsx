import VisaoAluno from "./VisaoAluno";
import VisaoOperacional from "./VisaoOperacional";
import { perfilLocal } from "./frequencia-utils";

// Aluno consulta a própria frequência; secretaria, administrador e professor usam a visão operacional.
export default function Frequencia() {
  return perfilLocal() === "aluno" ? <VisaoAluno /> : <VisaoOperacional />;
}
