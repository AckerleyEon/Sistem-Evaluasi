import { Role } from "../generated/prisma/enums";

declare module "next-auth" {
interface User {
  role: Role;
  dosenId: string | null;
}
interface Session {
  user: {
    role: Role;
    dosenId: string | null;
  } & DefaultSession["user"];
}
}

declare module "next-auth/jwt" {
  interface JWT {
    role: Role;
    dosenId: string | null;
  }
}