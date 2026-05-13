import { useParams } from "react-router-dom";
import FormPeriodoLetivo from "../../components/FormPeriodoLetivo/FormPeriodoLetivo";

export default function EditPeriodoLetivo() {
  const { id } = useParams();

  return <FormPeriodoLetivo periodoLetivoId={id} />;
}
