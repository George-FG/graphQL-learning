import { useQuery } from "@apollo/client/react";
import { useNavigate } from "react-router-dom";
import { ME_QUERY } from "../graphql/queries";
import { clearAccessToken } from "../lib/session";
import { clearUsername } from "../lib/auth";
import type { Query } from "@generated/generated";

type MeResponse = Pick<Query, "me">;

export default function WelcomePage() {
  const navigate = useNavigate();
  const { data, loading, error } = useQuery<MeResponse>(ME_QUERY, {
    fetchPolicy: "network-only",
  });

  const user = data?.me;
  const isLoggedOut = !user || user.ID === "-1" || user.username === "";

  const handleBackHome = () => {
    if (isLoggedOut) {
      clearAccessToken();
      clearUsername();
    }
    navigate("/");
  };

  if (loading) {
    return (
      <div className="page-shell">
        <div className="auth-card landing-card">
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  if (error || isLoggedOut) {
    return (
      <div className="page-shell">
        <div className="auth-card landing-card">
          <h1>Not logged in</h1>
          <p>Your session is missing or expired.</p>
          <button className="primary-button" onClick={handleBackHome}>
            Back Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <div className="auth-card landing-card">
        <h1>Welcome, {user.username}</h1>
        <p>You are successfully logged in.</p>
        <p>Fish owned: {user.numFish ?? 0}</p>

        <button className="primary-button" onClick={() => navigate("/")}>
          Back Home
        </button>
      </div>
    </div>
  );
}