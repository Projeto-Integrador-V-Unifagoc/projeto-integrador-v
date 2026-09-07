import { useState } from "react";
import { professorAcademicoApi } from "../services/professor-academico-api";

export function useProfessorAcademico() {
  const [carregando, setCarregando] = useState(false);

  const listarProfessores = async () => {
    setCarregando(true);

    try {
      return await professorAcademicoApi.listar();
    } finally {
      setCarregando(false);
    }
  };

  return {
    carregando,
    listarProfessores,
  };
}
