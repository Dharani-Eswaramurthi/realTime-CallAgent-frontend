import { promises as fs } from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'backend', 'data');

async function ensureDir(): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
}

function getFilename(payload: any): string {
  const type = payload?.type ?? 'unknown';
  const conversationId = payload?.data?.conversation_id ?? 'no_conversation';
  const eventTs = payload?.event_timestamp ?? Date.now();
  const safeConv = String(conversationId).replace(/[^a-zA-Z0-9_-]/g, '_');
  return `${eventTs}_${type}_${safeConv}.json`;
}

export async function saveConversationPayload({ payload }: { payload: any }): Promise<void> {
  await ensureDir();
  const filename = getFilename(payload);
  const filePath = path.join(DATA_DIR, filename);
  await fs.writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8');
}

export async function getAllConversations(args?: { limit?: number }): Promise<any[]> {
  await ensureDir();
  const entries = await fs.readdir(DATA_DIR);
  const files = entries.filter((f) => f.endsWith('.json')).sort().reverse();
  const limit = args?.limit ?? 100;
  const selected = files.slice(0, limit);
  const items: any[] = [];
  for (const file of selected) {
    const content = await fs.readFile(path.join(DATA_DIR, file), 'utf8');
    try {
      items.push(JSON.parse(content));
    } catch {
      // skip bad file
    }
  }
  return items;
}

export async function getConversationById(conversationId: string): Promise<any | null> {
  await ensureDir();
  const entries = await fs.readdir(DATA_DIR);
  const matched = entries.filter((f) => f.includes(conversationId) && f.endsWith('.json')).sort().reverse();
  if (matched.length === 0) return null;
  const content = await fs.readFile(path.join(DATA_DIR, matched[0]), 'utf8');
  try {
    return JSON.parse(content);
  } catch {
    return null;
  }
}


