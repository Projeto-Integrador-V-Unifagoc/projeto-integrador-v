import { 
  Box, 
  type BoxProps 
} from "@mui/material";

export default function Root(props: BoxProps) {
  return (
    <Box
      sx={{
        width: "100%",
        height: 'calc(100% - 60px)',
        backgroundColor: "#fff",
        borderRadius: 2,
        //overflow: "hidden",
      }}
      {...props}
    />
  );
}