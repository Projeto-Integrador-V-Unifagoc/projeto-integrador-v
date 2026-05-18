import { useParams } from "react-router-dom";
import FormTurma from "../../components/FormTurma/FormTurma";

export default function DetalheTurma() {
  const { id } = useParams();

  return <FormTurma turmaId={id} />;
}
