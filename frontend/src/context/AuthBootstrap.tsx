import { useApolloClient } from "@apollo/client/react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { REFRESH_SESSION_MUTATION } from "../graphql/mutations";
import { clearUsername, saveUsername } from "../lib/auth";
import { clearAccessToken, setAccessToken } from "../lib/session";
import type { Mutation } from "@generated/generated";

type RefreshSessionResponse = Pick<Mutation, "refreshSession">;

type AuthBootstrapContextValue = {
  ready: boolean;
  isLoggedIn: boolean;
  username: string | null;
  setLoggedInUser: (accessToken: string, username: string) => void;
  clearAuthState: () => void;
};

const AuthBootstrapContext = createContext<AuthBootstrapContextValue | null>(null);

export function AuthBootstrapProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const client = useApolloClient();
  const [ready, setReady] = useState(false);
  const [username, setUsernameState] = useState<string | null>(null);
  const hasBootstrappedRef = useRef(false);

  useEffect(() => {
    if (hasBootstrappedRef.current) {
      return;
    }

    hasBootstrappedRef.current = true;

    const bootstrap = async () => {
      try {
        const result = await client.mutate<RefreshSessionResponse>({
          mutation: REFRESH_SESSION_MUTATION,
          fetchPolicy: "no-cache",
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
      } finally {
        setReady(true);
      }
    };

    void bootstrap();
  }, [client]);

  const value = useMemo<AuthBootstrapContextValue>(
    () => ({
      ready,
      isLoggedIn: !!username,
      username,
      setLoggedInUser: (accessToken, nextUsername) => {
        setAccessToken(accessToken);
        saveUsername(nextUsername);
        setUsernameState(nextUsername);
      },
      clearAuthState: () => {
        clearAccessToken();
        clearUsername();
        setUsernameState(null);
      },
    }),
    [ready, username]
  );

  if (!ready) {
    return (
      <div className="app-layout">
        <div className="app-main">
          <div className="form-shell">
            <div className="auth-card landing-card">
              <h1>Loading...</h1>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <AuthBootstrapContext.Provider value={value}>
      {children}
    </AuthBootstrapContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuthBootstrap() {
  const value = useContext(AuthBootstrapContext);
  if (!value) {
    throw new Error("useAuthBootstrap must be used within AuthBootstrapProvider");
  }
  return value;
}