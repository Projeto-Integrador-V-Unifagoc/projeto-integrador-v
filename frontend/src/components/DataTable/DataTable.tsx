import type { DataGridProps } from "@mui/x-data-grid";

import Table from "./Table";
import Root from "./Root";

// Encaminha todas as props do DataGrid (inclusive edição de célula: processRowUpdate,
// onProcessRowUpdateError, etc.) mantendo o padrão compartilhado de locale pt-BR,
// paginação, estado vazio e carregamento.
interface DataTableProps extends DataGridProps {
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function DataTable({ emptyTitle, emptyDescription, ...props }: DataTableProps) {
  return (
    <Root>
      <Table {...props} emptyTitle={emptyTitle} emptyDescription={emptyDescription} />
    </Root>
  );
}
