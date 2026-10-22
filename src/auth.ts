import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "./lib/prisma";
import { authConfig } from "./auth.config";
import { ambilIp, catatPercobaan, hapusCatatan, sisaBlokirMs } from "./lib/rate-limit";

const JENDELA_LOGIN_MS = 15 * 60 * 1000;
const MAKS_GAGAL_PER_IP_USERNAME = 5;
const MAKS_GAGAL_PER_USERNAME = 20;
const MASA_SESI_DETIK = 12 * 60 * 60; // satu hari kerja

// Dilempar saat terlalu banyak percobaan gagal; kode "terkunci" dibaca halaman login.
class AkunTerkunci extends CredentialsSignin {
  code = "terkunci";
}

// Dipakai agar waktu respons sama baik username-nya ada maupun tidak (mencegah enumerasi akun).
let hashPalsu: string | undefined;
function ambilHashPalsu() {
  hashPalsu ??= bcrypt.hashSync("kata-sandi-palsu", 10);
  return hashPalsu;
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: { strategy: "jwt", maxAge: MASA_SESI_DETIK },
  providers: [
    Credentials({
      credentials: {
        username: {},
        password: {},
      },
      async authorize(credentials, request) {
        const username = typeof credentials?.username === "string" ? credentials.username.trim() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!username || !password) return null;

        const kunciIp = `login:${ambilIp(request.headers)}|${username.toLowerCase()}`;
        const kunciUser = `login:${username.toLowerCase()}`;
        if (
          sisaBlokirMs(kunciIp, MAKS_GAGAL_PER_IP_USERNAME) > 0 ||
          sisaBlokirMs(kunciUser, MAKS_GAGAL_PER_USERNAME) > 0
        ) {
          throw new AkunTerkunci();
        }

        const user = await prisma.user.findUnique({
          where: { username },
          include: { dosen: true },
        });

        const passwordValid = await bcrypt.compare(password, user?.password ?? ambilHashPalsu());
        if (!user || !passwordValid) {
          catatPercobaan(kunciIp, JENDELA_LOGIN_MS);
          catatPercobaan(kunciUser, JENDELA_LOGIN_MS);
          return null;
        }

        hapusCatatan(kunciIp);
        return {
          id: user.id,
          name: user.username,
          role: user.role,
          dosenId: user.dosen?.id ?? null,
        };
      },
    }),
  ],
});
