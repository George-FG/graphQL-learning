import { useApolloClient } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { LOGOUT_MUTATION } from "../graphql/mutations";
import { useAuthBootstrap } from "../context/AuthBootstrap";
import type { Mutation } from "@generated/generated";

type LogoutResponse = Pick<Mutation, "logout">;

export default function LandingPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const { isLoggedIn, username, clearAuthState } = useAuthBootstrap();

  const handleClearAuth = async () => {
    try {
      await client.mutate<LogoutResponse>({
        mutation: LOGOUT_MUTATION,
      });
    } catch {
      // ignore
    }

    clearAuthState();
    await client.clearStore();
  };

  return (
    <div className="page-shell">
      <div className="auth-card landing-card">
        <h1>Fish App</h1>
        <p>
          {isLoggedIn ? `Welcome back, ${username}.` : "Welcome. Choose an option to continue."}
        </p>

        <div className="button-stack">
          {!isLoggedIn ? (
            <>
              <button className="primary-button" onClick={() => navigate("/login")}>
                Login
              </button>

              <button
                className="secondary-button"
                onClick={() => navigate("/signup")}
              >
                Sign Up
              </button>
            </>
          ) : (
            <button className="primary-button" onClick={() => navigate("/welcome")}>
              Go to Welcome Page
            </button>
          )}

          <button className="secondary-button" onClick={handleClearAuth}>
            Clear All Tokens / Log Out
          </button>
        </div>
      </div>
    </div>
  );
}