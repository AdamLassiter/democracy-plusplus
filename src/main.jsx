import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { createTheme, CssBaseline, ThemeProvider } from '@mui/material';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';

import './main.css';
import Menu from './menu';
import creditsReducer from './slices/creditsSlice';
import equipmentReducer from './slices/equipmentSlice';
import missionReducer from './slices/missionSlice';
import preferencesReducer from './slices/preferencesSlice';
import purchasedReducer from './slices/purchasedSlice';
import shopReducer from './slices/shopSlice';

const darkTheme = createTheme({
  palette: {
    mode: 'dark',
  },
});

const store = configureStore({
  reducer: {
    credits: creditsReducer,
    equipment: equipmentReducer,
    mission: missionReducer,
    preferences: preferencesReducer,
    purchased: purchasedReducer,
    shop: shopReducer,
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
