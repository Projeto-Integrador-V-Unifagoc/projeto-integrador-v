import { useParams } from "react-router-dom";
import FormCurso from "../../components/FormCurso/FormCurso";

export default function EditCurso() {
  const { id } = useParams()

  return <FormCurso cursoId={id} />
}
