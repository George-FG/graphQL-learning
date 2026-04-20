import { useNavigate } from "react-router-dom";

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="page-shell">
      <div className="auth-card landing-card">
        <h1>Fish App</h1>
        <p>Welcome. Choose an option to continue.</p>

        <div className="button-stack">
          <button className="primary-button" onClick={() => navigate("/login")}>
            Login
          </button>

          <button
            className="secondary-button"
            onClick={() => navigate("/signup")}
          >
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}