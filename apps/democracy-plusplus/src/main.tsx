import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { createTheme, CssBaseline, ThemeProvider } from "@mui/material";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";

import Menu from "./menu";
import { persistor, store } from "./slices";
import LoadingSpinner from "./utils/loadingSpinner";
import AppSnackbar from "./utils/snackbar";

const darkTheme = createTheme({
  palette: {
    mode: "dark",
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        "html, body, #root": {
          maxWidth: "100%",
          minWidth: 0,
          overflowX: "hidden",
        },
        ".mobile-hidden-label": {
          "@media (max-width:600px)": {
            display: "none",
          },
        },
      },
    },
    MuiTabs: {
      defaultProps: {
        allowScrollButtonsMobile: true,
        scrollButtons: "auto",
        variant: "scrollable",
      },
      styleOverrides: {
        root: {
          maxWidth: "100%",
          minWidth: 0,
        },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: {
          "@media (max-width:600px)": {
            minHeight: 44,
            minWidth: 92,
            paddingLeft: 12,
            paddingRight: 12,
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        container: {
          alignItems: "flex-start",
        },
        paper: {
          "@media (max-width:600px)": {
            borderRadius: 0,
            height: "100%",
            margin: 0,
            maxHeight: "100%",
            maxWidth: "100%",
            width: "100%",
          },
        },
      },
    },
    MuiDialogActions: {
      styleOverrides: {
        root: {
          "@media (max-width:600px)": {
            flexWrap: "wrap",
            gap: 4,
          },
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        root: {
          "@media (max-width:600px)": {
            minHeight: 44,
          },
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          "@media (max-width:600px)": {
            minHeight: 44,
            minWidth: 44,
          },
        },
      },
    },
    MuiToggleButton: {
      styleOverrides: {
        root: {
          "@media (max-width:600px)": {
            minHeight: 44,
          },
        },
      },
    },
  },
});

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found");
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
);
