import { useMutation } from "@apollo/client/react";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AuthFormLayout from "../components/AuthFormLayout";
import { SIGN_UP_MUTATION } from "../graphql/mutations";
import { useAuthBootstrap } from "../context/AuthBootstrap";
import type { Mutation, MutationSignUpArgs } from "@generated/generated";

type SignUpResponse = Pick<Mutation, "signUp">;

export default function SignUpPage() {
  const navigate = useNavigate();
  const { setLoggedInUser } = useAuthBootstrap();

  const [username, setUsernameState] = useState("");
  const [password, setPassword] = useState("");

  const [signUp, { loading, error }] = useMutation<
    SignUpResponse,
    MutationSignUpArgs
  >(SIGN_UP_MUTATION);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const result = await signUp({
      variables: {
        username,
        password,
      },
    });

    const authResult = result.data?.signUp;
    if (!authResult) return;

    setLoggedInUser(authResult.accessToken, authResult.User.username);
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


        <button className="primary-button" type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Sign Up"}
        </button>

        {error ? <p className="error-text">{error.message}</p> : null}
      </form>
    </AuthFormLayout>
  );
}