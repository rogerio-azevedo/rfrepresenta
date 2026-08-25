import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: "ADMIN" | "CLIENT";
      clientId: string | null;
      mustChangePassword: boolean;
      sessionVersion: number;
    } & DefaultSession["user"];
  }

  interface User {
    role: "ADMIN" | "CLIENT";
    clientId: string | null;
    mustChangePassword: boolean;
    sessionVersion: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: "ADMIN" | "CLIENT";
    clientId: string | null;
    mustChangePassword: boolean;
    sessionVersion: number;
  }
}
