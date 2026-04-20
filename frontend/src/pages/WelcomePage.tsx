import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { clearUsername, getUsername } from "../lib/auth";

export default function WelcomePage() {
  const navigate = useNavigate();
  const username = getUsername();

  useEffect(() => {
    if (!username) {
      navigate("/");
    }
  }, [navigate, username]);

  const handleLogout = () => {
    clearUsername();
    navigate("/");
  };

  return (
    <div className="page-shell">
      <div className="auth-card landing-card">
        <h1>Welcome, {username}</h1>
        <p>Your login or signup was successful.</p>

        <button className="primary-button" onClick={handleLogout}>
          Log out
        </button>
      </div>
    </div>
  );
}