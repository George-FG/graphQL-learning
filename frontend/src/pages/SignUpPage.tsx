import { useMutation } from "@apollo/client/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthFormLayout from "../components/AuthFormLayout";
import { SIGN_UP_MUTATION } from "../graphql/mutations";
import { saveUsername } from "../lib/auth";
import { setAccessToken } from "../lib/session";
import type { Mutation, MutationSignUpArgs } from "@generated/generated";

type SignUpResponse = Pick<Mutation, "signUp">;

export default function SignUpPage() {
  const navigate = useNavigate();

  const [username, setUsernameState] = useState("");
  const [password, setPassword] = useState("");
  const [numFish, setNumFish] = useState("");

  const [signUp, { loading, error }] = useMutation<
    SignUpResponse,
    MutationSignUpArgs
  >(SIGN_UP_MUTATION);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const parsedNumFish = Number(numFish);

    if (!Number.isInteger(parsedNumFish) || parsedNumFish < 0) {
      return;
    }

    const result = await signUp({
      variables: {
        username,
        password,
        numFish: parsedNumFish,
      },
    });

    const authResult = result.data?.signUp;
    if (!authResult) return;

    setAccessToken(authResult.accessToken);
    saveUsername(authResult.User.username);
    navigate("/welcome");
  };

  return (
    <AuthFormLayout
      title="Create account"
      subtitle="Sign up with a username, password, and your fish count."
      footerText="Already have an account?"
      footerLinkText="Login"
      footerLinkTo="/login"
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
            autoComplete="new-password"
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </label>

        <label className="field">
          <span>Number of fish owned</span>
          <input
            type="number"
            min="0"
            step="1"
            value={numFish}
            onChange={(e) => setNumFish(e.target.value)}
            required
          />
        </label>

        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        {error ? <p className="error-text">{error.message}</p> : null}
      </form>
    </AuthFormLayout>
  );
}