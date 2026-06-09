import { Card, type CardProps } from "@mui/material";

export default function Root({ children, ...rest }: CardProps) {
  return (
    <Card
      {...rest}
      sx={{
        minHeight: 150,
        width: "100%",
        height: "100%",
        transition: "0.2s",
        cursor: "pointer",
        backgroundColor: "#FFF",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 4,
        },
      }}
    >
      {children}
    </Card>
  )
}