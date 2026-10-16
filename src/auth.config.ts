import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isOnAdmin = nextUrl.pathname.startsWith("/admin");
      const isOnDosen = nextUrl.pathname.startsWith("/dosen");

      if (isOnAdmin) return isLoggedIn && auth.user.role === "ADMIN";
      if (isOnDosen) return isLoggedIn && auth.user.role === "DOSEN";
      return true;
    },
async jwt({ token, user }) {
  if (user) {
    token.role = user.role;
    token.dosenId = user.dosenId;
  }
  return token;
},
async session({ session, token }) {
  if (session.user) {
    session.user.role = token.role as "ADMIN" | "DOSEN";
    session.user.dosenId = token.dosenId as string | null;
  }
  return session;
},
  },
  providers: [],
} satisfies NextAuthConfig;