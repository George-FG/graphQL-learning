import { useMutation } from "@apollo/client/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthFormLayout from "../components/AuthFormLayout";
import { LOGIN_MUTATION } from "../graphql/mutations";
import { useAuthBootstrap } from "../context/AuthBootstrap";
import type { Mutation, MutationLoginArgs } from "@generated/generated";

type LoginResponse = Pick<Mutation, "login">;

export default function LoginPage() {
  const navigate = useNavigate();
  const { setLoggedInUser } = useAuthBootstrap();

  const [username, setUsernameState] = useState("");
  const [password, setPassword] = useState("");

  const [login, { loading, error }] = useMutation<LoginResponse, MutationLoginArgs>(
    LOGIN_MUTATION
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = await login({
      variables: { username, password },
    });

    const authResult = result.data?.login;
    if (!authResult) return;

    setLoggedInUser(authResult.accessToken, authResult.User.username);
    navigate("/welcome");
  };

  return (
    <AuthFormLayout
      title="Welcome back"
      subtitle="Log in with your username and password."
      footerText="Need an account?"
      footerLinkText="Sign Up"
      footerLinkTo="/signup"
    >
      <form className="auth-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Username</span>
          <input
            type="text"
            value={username}
            autoComplete="username"
            onChange={(e) => setUsernameState(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Password</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Logging in..." : "Login"}
        </button>

        {error ? <p className="error-text">{error.message}</p> : null}
      </form>
    </AuthFormLayout>
  );
}