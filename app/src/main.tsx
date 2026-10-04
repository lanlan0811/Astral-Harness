import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { AppStoreProvider } from "./store/AppStore";
import { IntlProvider } from "./i18n";
import { App } from "./App";
import "./styles.css";

const container = document.getElementById("root");
if (!container) throw new Error("#root is missing from index.html");

createRoot(container).render(
  <StrictMode>
    <IntlProvider>
      <AppStoreProvider>
        <App />
      </AppStoreProvider>
    </IntlProvider>
  </StrictMode>,
);