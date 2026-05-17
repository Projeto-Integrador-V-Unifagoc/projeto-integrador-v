import { useParams } from "react-router-dom";
import FormDisciplina from "../../components/FormDisciplina/FormDisciplina";

export default function EditDisciplina() {
  const { id } = useParams()

  return <FormDisciplina disciplinaId={id} />
}
