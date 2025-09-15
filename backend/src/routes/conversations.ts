import { Router, Request, Response } from 'express';
import { getAllConversations, getConversationById } from '../store/fileStore';

export const conversationRouter = Router();

// GET /conversations
conversationRouter.get('/', async (_req: Request, res: Response) => {
  const items = await getAllConversations({ limit: 50 });
  res.json({ items });
});

// GET /conversations/:conversationId
conversationRouter.get('/:conversationId', async (req: Request, res: Response) => {
  const { conversationId } = req.params;
  const item = await getConversationById(conversationId);
  if (!item) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.json(item);
});


