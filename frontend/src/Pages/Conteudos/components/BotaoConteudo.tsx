import type { ComponentProps } from "react";
import Button from "../../../components/Button";

// O tema fixa a largura dos botões em 75px; aqui a largura acompanha o texto.
export default function BotaoConteudo({ sx, fullWidth, ...props }: ComponentProps<typeof Button>) {
    return (
        <Button
            fullWidth={fullWidth}
            sx={[
                { width: fullWidth ? "100%" : "auto", minHeight: 32, height: "auto", whiteSpace: "nowrap", px: 1.5 },
                ...(Array.isArray(sx) ? sx : sx ? [sx] : []),
            ]}
            {...props}
        />
    );
}
