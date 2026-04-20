import { Request, Response } from 'express';
import * as authService from '../services/authService';
import prisma from '../config/database';

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const result = await authService.registerUser(name, email, password);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    const user = result.user!;
    const token = authService.generateToken(user.id, user.email, user.role);

    res.status(201).json({
      user,
      token
    });
  } catch (error) {
    console.error("Register error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    const result = await authService.loginUser(email, password);

    if (result.error || !result.user) {
      return res.status(401).json({ error: result.error });
    }

    const user = result.user;
    const token = authService.generateToken(user.id, user.email, user.role);

    // Optionally set cookie as well
    res.cookie('islandinvest_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      path: '/',
    });

    res.status(200).json({
      user,
      token
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const getMe = async (req: any, res: Response) => {
  try {
    const jwtUser = req.user; // Set by authMiddleware
    if (!jwtUser || !jwtUser.userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    
    const user = await prisma.user.findUnique({
      where: { id: jwtUser.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        avatarUrl: true,
        createdAt: true
      }
    });

    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json({ user });
  } catch (error) {
    console.error("GetMe error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

export const googleAuth = async (req: Request, res: Response) => {
  try {
    const { credential } = req.body;
    if (!credential) {
      return res.status(400).json({ error: "Missing Google credential" });
    }

    const result = await authService.googleLogin(credential);
    if (result.error || !result.user) {
      return res.status(401).json({ error: result.error });
    }

    const user = result.user;
    const token = authService.generateToken(user.id, user.email, user.role);

    res.cookie('islandinvest_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 30 * 24 * 60 * 60 * 1000,
      path: '/',
    });

    res.status(200).json({ user, token });
  } catch (error) {
    console.error("Google Auth error:", error);
    res.status(500).json({ error: "Internal Server Error" });
  }
};

