import type { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email and password are required");
        }

        const email = credentials.email.trim().toLowerCase();
        const adminEmail = (process.env.ADMIN_EMAIL || "admin@getahead.ai").trim().toLowerCase();
        const adminPassword = process.env.ADMIN_PASSWORD || "adminpassword123";

        let user = await prisma.user.findUnique({
          where: { email },
        });

        if (email === adminEmail && credentials.password === adminPassword) {
          if (!user) {
            const hashedPassword = await bcrypt.hash(adminPassword, 12);
            user = await prisma.user.create({
              data: {
                email,
                name: "Administrator",
                password: hashedPassword,
                role: "ADMIN",
              },
            });
          }
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.role,
            image: user.avatar,
          };
        }

        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isPasswordValid = await bcrypt.compare(credentials.password, user.password);

        if (!isPasswordValid) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          image: user.avatar,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id?: string }).id = token.id as string;
        (session.user as { role?: string }).role = token.role as string;
      }
      return session;
    },
  },
};
