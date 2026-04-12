import {
    CardContent as MuiCardContent,
    Stack,
    Typography,
    type CardProps as MuiCardProps

} from "@mui/material";

import { InfoItem } from "../InfoItem/InfoItem";

import { theme } from "../../theme";


interface CardProps extends MuiCardProps {
    nome: string
    periodo: string | number
    telefone: number | string
    cidade: string
    uf: string
    logradouro: string
    bairro: string
    cep: string
    numero: string | number
    cpf: number | string
}

export default function Content({
    nome, periodo, cidade, telefone, uf, bairro, cpf, cep, logradouro, numero, ...rest
}: CardProps) {

    return (
        <MuiCardContent
            sx={{
                py: 2,
                px: 2
            }}
            {...rest}
        >
            <Stack spacing={1}>

                <Typography fontWeight="bold" fontSize={16}>
                    {nome}
                </Typography>

                <InfoItem label="CPF">{cpf}</InfoItem>
                <InfoItem label="Endereço">{logradouro} - {numero}, {bairro}</InfoItem>
                <InfoItem label="Cidade">{cidade} - {uf} | {cep}</InfoItem>
                <InfoItem label="Telefone">{telefone}</InfoItem>
                <InfoItem label="Período">{periodo}</InfoItem>
            </Stack>
        </MuiCardContent>
    )
}