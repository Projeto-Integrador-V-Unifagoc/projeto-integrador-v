import type { GridColDef } from "@mui/x-data-grid";

import Table from "./Table";
import Root from "./Root";

interface DataTableProps {
  rows: any[];
  columns: GridColDef[];
  loading?: boolean
}

export default function DataTable({
  rows,
  columns,
  loading
}: DataTableProps) {
  return (
    <Root>
      <Table rows={rows} columns={columns} loading={loading}/>
    </Root>
  );
}