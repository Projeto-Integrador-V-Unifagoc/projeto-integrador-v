import type { GridColDef, GridValidRowModel } from "@mui/x-data-grid";

import Table from "./Table";
import Root from "./Root";

interface DataTableProps {
  rows: GridValidRowModel[];
  columns: GridColDef[];
  loading?: boolean;
  emptyDescription?: string;
}

export default function DataTable({
  rows,
  columns,
  loading,
  emptyDescription,
}: DataTableProps) {
  return (
    <Root>
      <Table rows={rows} columns={columns} loading={loading} emptyDescription={emptyDescription} />
    </Root>
  );
}
