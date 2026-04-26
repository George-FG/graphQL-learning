import { useApolloClient } from "@apollo/client/react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthBootstrap } from "../context/AuthBootstrap";
import { LOGOUT_MUTATION } from "../graphql/mutations";
import type { Mutation } from "@generated/generated";
import UploadDeckModal from "./UploadDeckModal";

type LogoutResponse = Pick<Mutation, "logout">;

export default function Header() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { isLoggedIn, username, clearAuthState } = useAuthBootstrap();
  const [showUpload, setShowUpload] = useState(false);

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
          Fish App
        </Link>

        <nav className="header-nav">
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
