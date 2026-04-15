import { useMediaQuery, useTheme } from "@mui/material"

import EditFormCadastroAlunoDesktop from "../../components/EditFormCadastroAlunoDesktop/EditFormCadastroAlunoDesktop"
import EditFormCadastroAlunoMobile from "../../components/EditFormCadastroAlunoMobile/EditFormCadastroAlunoMobile"

export default function EditFormCadastroAluno() {
    const theme = useTheme()
    const isMobile = useMediaQuery(theme.breakpoints.down("sm"))

    return (
        <>
            {isMobile ? (
                <EditFormCadastroAlunoMobile />
            ) : (
                <EditFormCadastroAlunoDesktop />
            )}
        </>
    )
}