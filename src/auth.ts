import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { loginSchema } from "@/schemas/auth";
import {
  clearLoginFailures,
  createLoginAttemptKey,
  isLoginAllowed,
  recordLoginFailure,
} from "@/server/dal/auth-login-attempts";
import {
  findUserForCredentials,
  markLoginSuccessful,
} from "@/server/dal/users";
import { getServerEnv } from "@/server/env";
import { verifyPassword } from "@/server/security/passwords";

const dummyPasswordHash =
  "$argon2id$v=19$m=19456,t=2,p=1$RL7wHgjslelbsrjruvKXqg$LLgqYEJHTnfiCzm0v2TAzZBSdSfPx2EOZr6uD2SeIeI";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret: getServerEnv().AUTH_SECRET,
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: 8 * 60 * 60,
  },
  pages: {
    signIn: "/login",
  },
  providers: [
    Credentials({
      credentials: {
        email: { type: "email" },
        password: { type: "password" },
      },
      authorize: async (credentials, request) => {
        const parsed = loginSchema.safeParse(credentials);
        if (!parsed.success) return null;

        const { email, password } = parsed.data;
        const attemptKey = createLoginAttemptKey(email, request);
        if (!(await isLoginAllowed(attemptKey))) return null;

        const user = await findUserForCredentials(email);
        const passwordMatches = await verifyPassword(
          user?.passwordHash ?? dummyPasswordHash,
          password,
        );
        const userCanSignIn =
          user &&
          passwordMatches &&
          user.status === "ACTIVE" &&
          (user.role === "ADMIN" || user.clientStatus === "ACTIVE");

        if (!userCanSignIn) {
          await recordLoginFailure(attemptKey);
          return null;
        }

        await Promise.all([
          clearLoginFailures(attemptKey),
          markLoginSuccessful(user.id),
        ]);

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          clientId: user.clientId,
          mustChangePassword: user.mustChangePassword,
          sessionVersion: user.sessionVersion,
        };
      },
    }),
  ],
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.clientId = user.clientId;
        token.mustChangePassword = user.mustChangePassword;
        token.sessionVersion = user.sessionVersion;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.role = token.role as "ADMIN" | "CLIENT";
      session.user.clientId = token.clientId as string | null;
      session.user.mustChangePassword = token.mustChangePassword as boolean;
      session.user.sessionVersion = token.sessionVersion as number;
      return session;
    },
  },
});
