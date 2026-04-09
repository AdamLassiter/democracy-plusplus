import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';

import Menu from './menu';
import { persistor, store } from './slices';
import LoadingSpinner from './loadingSpinner';
import AppSnackbar from './snackbar';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found');
}

createRoot(rootElement).render(
  <StrictMode>
    <Provider store={store}>
      <PersistGate loading={<LoadingSpinner />} persistor={persistor}>
        <ThemeProvider theme={darkTheme}>
          <CssBaseline />
          <Menu />
          <AppSnackbar />
        </ThemeProvider>
      </PersistGate>
    </Provider>
  </StrictMode>,
)
