import type { SyntheticEvent } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Alert from '@mui/material/Alert';
import Snackbar from '@mui/material/Snackbar';

import { setSnackbar } from '../slices/snackbarSlice';
import { selectSnackbar } from '../slices/snackbarSlice';

export function AppSnackbar() {
  const dispatch = useDispatch();
  const { open, message, severity } = useSelector(selectSnackbar);

  function handleClose(_event: SyntheticEvent | Event, reason?: string) {
    if (reason === 'clickaway') { return; }
    dispatch(setSnackbar({ message: '', open: false, severity }));
  }

  return (
    <Snackbar
      open={open}
      autoHideDuration={5000}
      onClose={handleClose}
      anchorOrigin={{ horizontal: 'center', vertical: 'bottom' }}
    >
      <Alert onClose={handleClose} severity={severity} sx={{ width: '100%' }}>
        {message}
      </Alert>
    </Snackbar>
  );
};

export default AppSnackbar;
