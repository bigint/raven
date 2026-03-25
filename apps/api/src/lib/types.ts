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
