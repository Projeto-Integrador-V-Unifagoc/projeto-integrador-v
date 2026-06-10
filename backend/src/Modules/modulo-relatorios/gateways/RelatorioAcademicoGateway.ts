import axios from "axios";
import {
  FiltrosRelatorioAcademico,
  RelatorioAcademicoLinha,
} from "../models/RelatorioAcademico";

export class RelatorioAcademicoGateway {
  private readonly baseUrl = process.env.RELATORIO_ACADEMICO_API_URL;
  private readonly token = process.env.RELATORIO_ACADEMICO_API_TOKEN;

  estaConfigurado() {
    return Boolean(this.baseUrl);
  }

  async listarLinhas(filtros: FiltrosRelatorioAcademico) {
    if (!this.baseUrl) {
      return [];
    }

    const response = await axios.get<RelatorioAcademicoLinha[]>(
      `${this.baseUrl.replace(/\/$/, "")}/relatorios/academicos`,
      {
        params: filtros,
        headers: this.token ? { Authorization: `Bearer ${this.token}` } : undefined,
      }
    );

    return response.data;
  }
}
