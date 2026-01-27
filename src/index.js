import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "App";
import { AuthProvider } from "context/AuthContext";
import { MessagingProvider } from "context/MessagingContext";
import { NotificationsProvider } from "context/NotificationsContext";
import { FavouritesProvider } from "context/FavouritesContext";

// Material Dashboard 3 PRO React Context Provider
import { MaterialUIControllerProvider } from "context";

const container = document.getElementById("app");
const root = createRoot(container);

root.render(
  <AuthProvider>
    <MessagingProvider>
      <NotificationsProvider>
        <FavouritesProvider>
          <BrowserRouter>
            <MaterialUIControllerProvider>
              <App />
            </MaterialUIControllerProvider>
          </BrowserRouter>
        </FavouritesProvider>
      </NotificationsProvider>
    </MessagingProvider>
  </AuthProvider>
);
