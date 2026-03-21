import type { Context } from "hono";

export type User = {
  email: string;
  id: string;
  name: string;
  role: "admin" | "member" | "viewer";
};

export type Session = {
  id: string;
};

export type AuthEnv = {
  Variables: {
    session: Session;
    user: User;
  };
};

export type AuthContext = Context<AuthEnv>;
export type AuthContextWithJson<T> = Context<
  AuthEnv,
  string,
  { in: { json: T }; out: { json: T } }
>;

export type AuthContextWithQuery<T> = Context<
  AuthEnv,
  string,
  { in: { query: T }; out: { query: T } }
>;

// Backward-compatible aliases (downstream tasks will clean these up)
export type AppEnv = AuthEnv;
export type AppContext = AuthContext;
export type AppContextWithJson<T> = AuthContextWithJson<T>;
export type AppContextWithQuery<T> = AuthContextWithQuery<T>;
