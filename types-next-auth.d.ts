import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      kakaoId?: string | null;
      roles?: string[];
    };
  }

  interface User {
    kakaoId?: string | null;
  }
}
