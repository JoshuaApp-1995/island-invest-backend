import bcrypt from "bcryptjs";
import prisma from "../config/database";
import { Role } from "@prisma/client";
import { randomUUID } from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key";

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: string, email: string, role: string) {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: '30d' });
}

export async function createSession(userId: string): Promise<{ sessionId: string, expiresAt: Date }> {
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_DURATION_MS);

  await prisma.session.create({
    data: {
      id: sessionId,
      userId,
      expiresAt,
    },
  });

  return { sessionId, expiresAt };
}

export async function registerUser(name: string, email: string, password: string) {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return { error: "An account with this email already exists" };
  }

  const passwordHash = await hashPassword(password);

  try {
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: passwordHash,
        role: Role.USER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
    return { user };
  } catch (error) {
    console.error("Register error:", error);
    return { error: "Failed to create user account" };
  }
}

export async function loginUser(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });

  if (!user) {
    return { error: "Invalid email or password" };
  }

  // Social-login-only accounts have no password
  if (!user.password) {
    return { error: "This account uses Google login. Please sign in with Google." };
  }

  const validPassword = await verifyPassword(password, user.password);
  if (!validPassword) {
    return { error: "Invalid email or password" };
  }

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
    },
  };
}

export async function googleLogin(idToken: string) {
  try {
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload || !payload.email) {
      return { error: "Invalid Google token" };
    }

    const { email, name, picture, sub: providerId } = payload;

    // Upsert user: find by email or providerId
    const user = await prisma.user.upsert({
      where: { email },
      update: {
        // Update name/avatar if changed
        name: name ?? undefined,
        avatarUrl: picture ?? undefined,
      },
      create: {
        email,
        name: name ?? email.split('@')[0],
        avatarUrl: picture ?? null,
        authProvider: 'google',
        providerId,
        role: Role.USER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return { user };
  } catch (error) {
    console.error("Google login error:", error);
    return { error: "Google authentication failed" };
  }
}

export async function facebookLogin(accessToken: string) {
  try {
    const response = await fetch(`https://graph.facebook.com/me?fields=id,name,email,picture&access_token=${accessToken}`);
    const data = await response.json();

    if (data.error) {
      return { error: "Invalid Facebook token" };
    }

    const { email, name, id: providerId, picture } = data;
    const avatarUrl = picture?.data?.url ?? null;

    // Use email if available, otherwise use providerId-based pseudo-email
    const userEmail = email || `${providerId}@facebook.com`;

    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {
        name: name ?? undefined,
        avatarUrl: avatarUrl ?? undefined,
      },
      create: {
        email: userEmail,
        name: name ?? userEmail.split('@')[0],
        avatarUrl: avatarUrl,
        authProvider: 'facebook',
        providerId,
        role: Role.USER,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true,
      },
    });

    return { user };
  } catch (error) {
    console.error("Facebook login error:", error);
    return { error: "Facebook authentication failed" };
  }
}
