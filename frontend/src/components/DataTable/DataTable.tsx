import type { GridColDef } from "@mui/x-data-grid";

import Table from "./Table";
import Root from "./Root";

interface DataTableProps {
  rows: any[];
  columns: GridColDef[];
}

export default function DataTable({
  rows,
  columns,
}: DataTableProps) {
  return (
    <Root>
      <Table rows={rows} columns={columns} />
    </Root>
  );
}