import * as yup from "yup";

const carga = (rotulo: string) => yup.number()
  .typeError(`Informe ${rotulo}`)
  .integer(`${rotulo} deve ser inteira`)
  .min(0, `${rotulo} não pode ser negativa`)
  .required(`Informe ${rotulo}`);

export const disciplinaSchema = yup.object({
  codigo: yup.string().trim().required("Informe o código da disciplina"),
  nome: yup.string().trim().required("Informe o nome da disciplina"),
  areaConhecimento: yup.string().required("Selecione a área de conhecimento"),
  ementa: yup.string().trim().required("Informe a ementa da disciplina"),
  cargaHoraria: yup.number().typeError("Informe a carga horária").integer().positive().required(),
  cargaHorariaTeorica: carga("a carga teórica"),
  cargaHorariaPratica: carga("a carga prática"),
  cargaHorariaLaboratorio: carga("a carga de laboratório"),
  cargaHorariaExtensao: carga("a carga de extensão"),
  preRequisito: yup.string().optional(),
  observacoes: yup.string().optional(),
}).test("composicao", "A soma das cargas deve ser igual à carga horária total", function (valor) {
  const parcelas = [valor.cargaHorariaTeorica, valor.cargaHorariaPratica, valor.cargaHorariaLaboratorio, valor.cargaHorariaExtensao].map(Number);
  // Deixa as validações dos campos produzirem a mensagem mais específica.
  if (parcelas.some((item) => !Number.isFinite(item) || item < 0)) return true;
  const soma = parcelas.reduce((total, item) => total + item, 0);
  if (soma !== Number(valor.cargaHoraria)) {
    return this.createError({ path: "cargaHoraria", message: `Distribuição atual: ${soma}h. Deve totalizar ${valor.cargaHoraria || 0}h.` });
  }
  return true;
});
