import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ConfirmationProvider } from "./components/ui/Confirmation";
import { ToastProvider } from "./components/ui/Toast";
import App from "./App";
import "./styles/global.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmationProvider>
          <BrowserRouter>
            <App />
          </BrowserRouter>
        </ConfirmationProvider>
      </ToastProvider>
    </QueryClientProvider>
  </React.StrictMode>
);
