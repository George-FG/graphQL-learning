import { useApolloClient } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthBootstrap } from "../context/AuthBootstrap";
import { LOGOUT_MUTATION } from "../graphql/mutations";
import type { Mutation } from "@generated/generated";
import UploadDeckModal from "./UploadDeckModal";

type LogoutResponse = Pick<Mutation, "logout">;

function getInitialTheme(): "dark" | "light" {
  const stored = localStorage.getItem("theme");
  if (stored === "dark" || stored === "light") return stored;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function Header() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { isLoggedIn, username, clearAuthState } = useAuthBootstrap();
  const [showUpload, setShowUpload] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">(getInitialTheme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleLogout = async () => {
    try {
      await client.mutate<LogoutResponse>({ mutation: LOGOUT_MUTATION });
    } catch {
      // ignore network errors on logout
    }
    clearAuthState();
    await client.clearStore();
    navigate("/");
  };

  return (
    <>
      <header className="app-header">
        <Link to="/" className="header-logo">
          Examify
        </Link>

        <nav className="header-nav">
          <button
            className="header-btn-ghost header-btn-icon"
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            title={theme === "dark" ? "Light mode" : "Dark mode"}
          >
            {theme === "dark" ? "☀" : "☾"}
          </button>
          {!isLoggedIn ? (
            <>
              <button
                className="header-btn-ghost"
                onClick={() => navigate("/login")}
              >
                Login
              </button>
              <button
                className="header-btn-primary"
                onClick={() => navigate("/signup")}
              >
                Sign Up
              </button>
            </>
          ) : (
            <>
              <span className="header-username">Hi, {username}</span>
              <button
                className="header-btn-ghost"
                onClick={() => setShowUpload(true)}
              >
                Upload
              </button>
              <button className="header-btn-ghost" onClick={handleLogout}>
                Log Out
              </button>
            </>
          )}
        </nav>
      </header>

      {showUpload && (
        <UploadDeckModal onClose={() => setShowUpload(false)} />
      )}
    </>
  );
}
