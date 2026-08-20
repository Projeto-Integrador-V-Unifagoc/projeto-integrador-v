import {
  Checkbox as MuiCheckbox,
  FormControlLabel,
  OutlinedInput,
  type CheckboxProps
} from "@mui/material"

interface CheckBoxProps extends CheckboxProps {
  label: string
}

export function CheckBox({ label, ...rest }: CheckBoxProps) {
  return (
    <OutlinedInput
      readOnly
      value=""
      startAdornment={
        <FormControlLabel
          control={<MuiCheckbox {...rest} />}
          label={label}
        />
      }
      sx={{
        height: 36,
        paddingLeft: 1,
      }}
    />
  )
}
