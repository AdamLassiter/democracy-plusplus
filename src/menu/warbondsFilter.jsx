import { Autocomplete, Checkbox, TextField } from "@mui/material";
import { WARBONDS } from "../constants/warbonds";
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import CheckBoxIcon from '@mui/icons-material/CheckBox';
import { useDispatch, useSelector } from "react-redux";
import { selectShop, setWarbonds } from "../slices/shopSlice";

const icon = <CheckBoxOutlineBlankIcon fontSize="small" />;
const checkedIcon = <CheckBoxIcon fontSize="small" />;

export default function WarbondsFilter() {
  const dispatch = useDispatch();
  const { warbonds } = useSelector(selectShop);

  function handleWarbonds(_event, value) {
    dispatch(setWarbonds({ value }));
  }

  return (
    <Autocomplete
      multiple
      disableCloseOnSelect
      limitTags={0}
      options={WARBONDS}
      getOptionLabel={(option) => option.displayName}
      defaultValue={warbonds}
      onChange={handleWarbonds}
      renderOption={(props, option, { selected }) => {
        const { key, ...optionProps } = props;
        return (
          <li key={key} {...optionProps}>
            <Checkbox
              icon={icon}
              checkedIcon={checkedIcon}
              style={{ marginRight: 8 }}
              checked={selected}
            />
            {option.displayName}
          </li>
        );
      }}
      renderInput={(params) => {
        params.InputProps.startAdornment = <span>{warbonds.length} Warbonds</span>;
        return (
          <TextField readOnly {...params} />
        );
      }}
      sx={{ width: '210px' }}
    />
  );
}