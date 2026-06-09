import { Card, type CardProps } from "@mui/material";

export default function Root({ children, ...rest }: CardProps) {
  return (
    <Card
      {...rest}
      sx={{
        width: "100%",
        height: "100%",
        transition: "0.2s",
        cursor: "pointer",
        "&:hover": {
          transform: "translateY(-4px)",
          boxShadow: 4,
        },
      }}
    >
      {children}
    </Card>
  );
}