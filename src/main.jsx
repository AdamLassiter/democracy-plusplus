import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';

import Menu from './menu';
import { store } from './slices';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store()}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Menu />
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
