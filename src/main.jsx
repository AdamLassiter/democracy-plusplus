import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import './main.css';
import Menu from './menu';
import equipmentReducer from './slices/equipmentSlice';
import creditsReducer from './slices/creditsSlice';
import purchasedReducer from './slices/purchasedSlice';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const store = configureStore({
  reducer: {
    equipment: equipmentReducer,
    credits: creditsReducer,
    purchased: purchasedReducer,
  }
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <ThemeProvider theme={darkTheme}>
        <CssBaseline />
        <Menu />
      </ThemeProvider>
    </Provider>
  </StrictMode>,
)
