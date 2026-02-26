import {
  Dialog as MuiDialog,
  type DialogProps as MuiDialogProps
} from "@mui/material"
import type { ReactNode } from "react"

interface DialogProps extends MuiDialogProps {
  children: ReactNode
}

export function Root(props: DialogProps) {
    const {
        children,
        open,
        maxWidth = "md",
        fullWidth = true,
        ...rest
    } = props

    return (
        <MuiDialog
            open={open}
            maxWidth={maxWidth}
            fullWidth={fullWidth}
            PaperProps={{
                sx: (theme) => ({
                    backgroundColor: theme.palette.background.default,
                    position: "relative",
                    overflow: "hidden",
                })
            }}
            {...rest}
        >
            {children}
        </MuiDialog>
    )
}
