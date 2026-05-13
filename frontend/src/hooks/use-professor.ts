import { useState } from "react";
import { professorApi } from "../services/professor-api";

export function useProfessor() {
  const [carregando, setCarregando] = useState(false);

  const listarProfessores = async () => {
    setCarregando(true);

    try {
      return await professorApi.listarProfessores();
    } finally {
      setCarregando(false);
    }
  };

  return {
    carregando,
    listarProfessores,
  };
}
