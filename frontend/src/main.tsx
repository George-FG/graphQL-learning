import React from "react";
import ReactDOM from "react-dom/client";
import { ApolloProvider } from "@apollo/client/react";
import { BrowserRouter } from "react-router-dom";
import { Analytics } from "@vercel/analytics/react";
import App from "./App";
import { apolloClient } from "./lib/apollo";
import { AuthBootstrapProvider } from "./context/AuthBootstrap";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ApolloProvider client={apolloClient}>
      <BrowserRouter>
        <AuthBootstrapProvider>
          <App />
        </AuthBootstrapProvider>
      </BrowserRouter>
    </ApolloProvider>
    <Analytics />
  </React.StrictMode>
);