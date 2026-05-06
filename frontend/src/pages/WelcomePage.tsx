import { useNavigate } from "react-router-dom";
import { useMe } from "../shared/hooks";
import { clearAccessToken } from "../lib/session";
import { clearUsername } from "../lib/auth";

export default function WelcomePage() {
  const navigate = useNavigate();
  const { user, loading, error } = useMe();

  const handleBackHome = () => {
    if (!user) {
      clearAccessToken();
      clearUsername();
    }
    navigate("/");
  };

  if (loading) {
    return (
      <div className="form-shell">
        <div className="auth-card landing-card">
          <h1>Loading...</h1>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="form-shell">
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
    <div className="form-shell">
      <div className="auth-card landing-card">
        <h1>Welcome, {user.username}</h1>
        <p>You are successfully logged in.</p>

        <button className="primary-button" onClick={() => navigate("/")}>
          Back Home
        </button>
      </div>
    </div>
  );
}