import { IconButton } from "@mui/material"
import { CircleX } from "lucide-react"

interface ActionCloseProps {
  onClose?: () => void
}

export function ActionClose({ onClose }: ActionCloseProps) {
    return (
        <IconButton
            aria-label="Fechar diálogo"
            size="small"
            onClick={onClose}
        >
            <CircleX size={20} />
        </IconButton>
    )
}
