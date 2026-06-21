import { DataGrid, type DataGridProps } from "@mui/x-data-grid";
import { ptBR } from "@mui/x-data-grid/locales";
import { theme } from "../../theme";
import NoData from "./NoData";
import SkeletonOverlay from "./Skeleton";
import CustomPagination from "./Pagination";

interface TableProps extends DataGridProps {
  emptyTitle?: string;
  emptyDescription?: string;
}

export default function Table({ emptyTitle, emptyDescription, ...props }: TableProps) {
  const EmptyOverlay = () => <NoData title={emptyTitle} description={emptyDescription} />;

  return (
    <DataGrid
      {...props}
      rowHeight={34}
      disableRowSelectionOnClick
      pageSizeOptions={[15, 50, 100, 200]}
      initialState={{
        ...props.initialState,
        pagination: {
          ...props.initialState?.pagination,
          paginationModel: props.initialState?.pagination?.paginationModel ?? { page: 0, pageSize: 15 },
        },
      }}
      localeText={ptBR.components.MuiDataGrid.defaultProps.localeText}
      getRowClassName={(params) =>
        params.indexRelativeToCurrentPage % 2 === 0 ? "even" : "odd"
      }
      slots={{
        pagination: CustomPagination,
        loadingOverlay: SkeletonOverlay,
        noRowsOverlay: EmptyOverlay,
        noResultsOverlay: EmptyOverlay,
        ...props.slots,
      }}
      sx={{
        mt: 1,
        backgroundColor: '#F4F4F4',
        overflowX: 'auto',
        minHeight: { xs: 420, sm: 480 },

        "& .MuiDataGrid-columnHeaders": {
          minHeight: 36,
          maxHeight: 36,
        },

        "& .MuiDataGrid-columnHeader": {
          backgroundColor: "#F1F5F9",
        },

        "& .MuiDataGrid-columnHeaderTitle": {
          fontWeight: 'bold',
          color: 'black'
        },

        "& .even": {
          backgroundColor: "#FFF",
        },

        "& .odd": {
          backgroundColor: "#F1F5F9",
        },

        "& .MuiDataGrid-row:hover": {
          backgroundColor: `${theme.palette.grey[100]}`
        },

        "& .MuiDataGrid-footerContainer": {
          backgroundColor: `${theme.palette.background.default}`,
        },
        ...props.sx,
      }}


    />
  );
}
