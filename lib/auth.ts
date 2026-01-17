import NextAuth, { NextAuthOptions } from "next-auth";
import KakaoProvider from "next-auth/providers/kakao";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "./prisma";
import { RoleType } from "@prisma/client";

const ensureRoles = async (userId: string, kakaoId?: string | null) => {
  const userRole = await prisma.role.findUnique({ where: { type: RoleType.USER } });
  if (userRole) {
    await prisma.userRole.upsert({
      where: { userId_roleId_isActive: { userId, roleId: userRole.id, isActive: true } },
      update: {},
      create: { userId, roleId: userRole.id },
    });
  }
  if (kakaoId && process.env.SUPER_ADMIN_KAKAO_ID && kakaoId === process.env.SUPER_ADMIN_KAKAO_ID) {
    const superRole = await prisma.role.findUnique({ where: { type: RoleType.SUPER_ADMIN } });
    if (superRole) {
      await prisma.userRole.upsert({
        where: { userId_roleId_isActive: { userId, roleId: superRole.id, isActive: true } },
        update: {},
        create: { userId, roleId: superRole.id },
      });
    }
  }
};

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as any,
  session: { strategy: "database" },
  providers: [
    KakaoProvider({
      clientId: process.env.KAKAO_CLIENT_ID || "",
      clientSecret: process.env.KAKAO_CLIENT_SECRET || "",
    }),
  ],
  pages: {
    signIn: "/login",
  },
  callbacks: {
    async session({ session, user }) {
      const roles = await prisma.userRole.findMany({
        where: {
          userId: user.id,
          isActive: true,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        },
        include: { role: true },
      });
      return {
        ...session,
        user: {
          ...session.user,
          id: user.id,
          kakaoId: (user as any).kakaoId,
          roles: roles.map((r) => r.role.type),
        },
      };
    },
    async signIn({ user, account, profile }) {
      if (account?.provider === "kakao") {
        await prisma.user.update({
          where: { id: user.id },
          data: {
            kakaoId: account.providerAccountId,
            name: user.name || (profile as any)?.properties?.nickname || user.email,
            nickname: user.name || (profile as any)?.properties?.nickname,
          },
        });
        await ensureRoles(user.id, account.providerAccountId);
      }
      return true;
    },
  },
};

export const {
  handlers: { GET, POST },
  auth,
} = NextAuth(authOptions);
