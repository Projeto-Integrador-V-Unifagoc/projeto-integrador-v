import {
  Pagination,
  Stack,
  Typography,
  Select,
  MenuItem,
  FormControl,
  Box
} from "@mui/material";

import {
  useGridApiContext,
  useGridSelector,
  gridPageCountSelector,
  gridPageSelector,
  gridPaginationModelSelector,
  gridRowCountSelector,
} from "@mui/x-data-grid";

export default function CustomPagination() {
  const apiRef = useGridApiContext();

  const page = useGridSelector(apiRef, gridPageSelector);
  const pageCount = useGridSelector(apiRef, gridPageCountSelector);
  const paginationModel = useGridSelector(apiRef, gridPaginationModelSelector);
  const rowCount = useGridSelector(apiRef, gridRowCountSelector);

  const { pageSize } = paginationModel;

  const from = rowCount === 0 ? 0 : page * pageSize + 1;
  const to = Math.min((page + 1) * pageSize, rowCount);

  const handlePageSizeChange = (value: number) => {
    apiRef.current.setPageSize(value);
    apiRef.current.setPage(0); // volta pra primeira página
  };

  return (
    <Stack
      direction="row"
      display='flex'
      justifyContent="space-between"
      alignItems="center"
      p={2}
    >

      {/* LADO ESQUERDO */}
      <Typography variant="body2" fontWeight='bold' color="textDisabled">
        Exibindo {from} – {to} de {rowCount} registros
      </Typography>

      {/* LADO DIREITO */}
      <Stack direction="row" spacing={2} alignItems="center">
        <FormControl size="small">
          <Select
            value={pageSize}
            onChange={(e) => handlePageSizeChange(Number(e.target.value))}
          >
            {[15, 50, 100, 200].map((size) => (
              <MenuItem key={size} value={size}>
                {size}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Pagination
          count={pageCount}
          page={page + 1}
          onChange={(_, value) =>
            apiRef.current.setPage(value - 1)
          }
        />
      </Stack>
    </Stack>
  );
}