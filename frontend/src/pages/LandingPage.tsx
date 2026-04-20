import { useApolloClient } from "@apollo/client/react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { REFRESH_SESSION_MUTATION, LOGOUT_MUTATION } from "../graphql/mutations";
import { clearAccessToken, setAccessToken } from "../lib/session";
import { clearUsername, getUsername, saveUsername } from "../lib/auth";
import type { Mutation } from "@generated/generated";

type RefreshSessionResponse = Pick<Mutation, "refreshSession" | "logout">;

export default function LandingPage() {
  const navigate = useNavigate();
  const client = useApolloClient();
  const [username, setUsernameState] = useState<string | null>(getUsername());

  useEffect(() => {
    const tryRefresh = async () => {
      try {
        const result = await client.mutate<RefreshSessionResponse>({
          mutation: REFRESH_SESSION_MUTATION,
        });

        const refreshed = result.data?.refreshSession;
        if (!refreshed) {
          clearAccessToken();
          clearUsername();
          setUsernameState(null);
          return;
        }

        setAccessToken(refreshed.accessToken);
        saveUsername(refreshed.User.username);
        setUsernameState(refreshed.User.username);
      } catch {
        clearAccessToken();
        clearUsername();
        setUsernameState(null);
      }
    };

    void tryRefresh();
  }, [client]);

  const handleClearAuth = async () => {
    try {
      await client.mutate<RefreshSessionResponse>({
        mutation: LOGOUT_MUTATION,
      });
    } catch {
      // ignore
    }

    clearAccessToken();
    clearUsername();
    setUsernameState(null);
    await client.clearStore();
  };

  return (
    <div className="page-shell">
      <div className="auth-card landing-card">
        <h1>Fish App</h1>
        <p>
          {username ? `Welcome back, ${username}.` : "Welcome. Choose an option to continue."}
        </p>

        <div className="button-stack">
          {!username ? (
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