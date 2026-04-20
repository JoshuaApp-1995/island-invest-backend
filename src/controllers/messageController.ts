import { Response } from 'express';
import prisma from '../config/database';
import { AuthRequest } from '../middlewares/authMiddleware';

const db = prisma as any;

export const getConversations = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const conversations = await db.conversation.findMany({
      where: {
        OR: [
          { user1Id: userId },
          { user2Id: userId }
        ]
      },
      include: {
        user1: { select: { id: true, name: true, avatarUrl: true } },
        user2: { select: { id: true, name: true, avatarUrl: true } },
        property: { select: { id: true, title: true, slug: true, media: true } },
        messages: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { updatedAt: 'desc' }
    });

    res.json({ conversations });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    res.status(500).json({ error: "Failed to fetch conversations" });
  }
};

export const getMessages = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params; // conversationId
    const userId = req.user?.userId;
    if (!userId) return res.status(401).json({ error: "Unauthorized" });

    const conversation = await db.conversation.findUnique({
      where: { id },
      include: {
        user1: { select: { id: true, name: true, avatarUrl: true } },
        user2: { select: { id: true, name: true, avatarUrl: true } },
        property: { select: { id: true, title: true, slug: true } }
      }
    });

    if (!conversation) return res.status(404).json({ error: "Conversation not found" });
    if (conversation.user1Id !== userId && conversation.user2Id !== userId) {
      return res.status(403).json({ error: "Unauthorized" });
    }

    const messages = await db.message.findMany({
      where: { conversationId: id },
      orderBy: { createdAt: 'asc' },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } }
      }
    });

    // Mark unread messages as read
    await db.message.updateMany({
      where: {
        conversationId: id,
        receiverId: userId,
        isRead: false
      },
      data: { isRead: true }
    });

    res.json({ conversation, messages });
  } catch (error) {
    console.error("Error fetching messages:", error);
    res.status(500).json({ error: "Failed to fetch messages" });
  }
};

export const sendMessage = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { receiverId, propertyId, content, conversationId } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!content) return res.status(400).json({ error: "Message content is required" });
    if (!receiverId && !conversationId) return res.status(400).json({ error: "Receiver ID or Conversation ID is required" });

    let convId = conversationId;

    // If starting a new conversation, check if one exists or create it
    if (!convId) {
      // Order IDs to prevent duplicate conversations for same users+property
      const user1Id = userId < receiverId ? userId : receiverId;
      const user2Id = userId < receiverId ? receiverId : userId;

      let conversation = await db.conversation.findFirst({
        where: {
          user1Id,
          user2Id,
          propertyId: propertyId || null
        }
      });

      if (!conversation) {
        conversation = await db.conversation.create({
          data: {
            user1Id,
            user2Id,
            propertyId: propertyId || null
          }
        });
      }
      convId = conversation.id;
    } else {
      // Verify conversation exists
      const conv = await db.conversation.findUnique({ where: { id: convId } });
      if (!conv) return res.status(404).json({ error: "Conversation not found" });
    }

    // Identify receiver if only conversationId was provided
    let actualReceiverId = receiverId;
    if (!actualReceiverId) {
       const conv = await db.conversation.findUnique({ where: { id: convId } });
       actualReceiverId = conv.user1Id === userId ? conv.user2Id : conv.user1Id;
    }

    const message = await db.message.create({
      data: {
        content,
        senderId: userId,
        receiverId: actualReceiverId,
        conversationId: convId,
      },
      include: {
        sender: { select: { id: true, name: true, avatarUrl: true } }
      }
    });

    // Update conversation's updatedAt timestamp
    await db.conversation.update({
      where: { id: convId },
      data: { updatedAt: new Date() }
    });

    res.status(201).json({ message });
  } catch (error) {
    console.error("Error sending message:", error);
    res.status(500).json({ error: "Failed to send message" });
  }
};

export const startConversation = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.user?.userId;
    const { receiverId, propertyId } = req.body;

    if (!userId) return res.status(401).json({ error: "Unauthorized" });
    if (!receiverId) return res.status(400).json({ error: "receiverId is required" });
    if (userId === receiverId) return res.status(400).json({ error: "Cannot message yourself" });

    // Canonical ordering to avoid duplicates
    const user1Id = userId < receiverId ? userId : receiverId;
    const user2Id = userId < receiverId ? receiverId : userId;

    let conversation = await db.conversation.findFirst({
      where: { user1Id, user2Id, propertyId: propertyId || null }
    });

    if (!conversation) {
      conversation = await db.conversation.create({
        data: { user1Id, user2Id, propertyId: propertyId || null }
      });
    }

    res.json({ conversationId: conversation.id });
  } catch (error) {
    console.error("Error starting conversation:", error);
    res.status(500).json({ error: "Failed to start conversation" });
  }
};
