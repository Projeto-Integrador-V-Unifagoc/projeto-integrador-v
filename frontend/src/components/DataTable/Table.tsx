import { DataGrid, type DataGridProps } from "@mui/x-data-grid";
import { theme } from "../../theme";
import NoData from "./NoData";
import SkeletonOverlay from "./Skeleton";

export default function Table(props: DataGridProps) {
  return (
    <DataGrid
      {...props}
      rowHeight={34}
      disableRowSelectionOnClick
      //pageSizeOptions={[5, 10, 15]}
      getRowClassName={(params) =>
        params.indexRelativeToCurrentPage % 2 === 0 ? "even" : "odd"
      }
      slots={{
        //pagination: CustomPagination,
        loadingOverlay: SkeletonOverlay,
        noRowsOverlay: NoData,
      }}
      sx={{
        mt: 1,
        backgroundColor: '#F4F4F4',
        overflowX: 'auto',

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
      }}


    />
  );
}
