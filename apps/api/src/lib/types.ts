import type { Context } from "hono";

type User = {
  id: string;
  email: string;
  name: string;
  role: string;
};

type Session = {
  id: string;
  userId: string;
};

/** Environment for routes behind auth middleware (user-level routes) */
export type AuthEnv = {
  Variables: {
    requestId: string;
    user: User;
    session: Session;
  };
};

/** Environment for routes behind auth + tenant middleware */
export type AppEnv = {
  Variables: {
    requestId: string;
    user: User;
    session: Session;
    orgId: string;
    orgRole: string;
  };
};

/** Context for tenant-scoped routes (auth + tenant middleware) */
export type AppContext = Context<AppEnv>;

/** Context for tenant-scoped routes with validated JSON body */
export type AppContextWithJson<T> = Context<
  AppEnv,
  string,
  { out: { json: T } }
>;

/** Context for tenant-scoped routes with validated query params */
export type AppContextWithQuery<T> = Context<
  AppEnv,
  string,
  { out: { query: T } }
>;

/** Context for auth-only routes (user-level, no tenant) */
export type AuthContext = Context<AuthEnv>;

/** Context for auth-only routes with validated JSON body */
export type AuthContextWithJson<T> = Context<
  AuthEnv,
  string,
  { out: { json: T } }
>;
