import { Router, Request, Response } from 'express';
import { verifySignature } from '../utils/signature';
import { saveConversationPayload } from '../store/fileStore';

export const webhookRouter = Router();

// POST /webhooks/elevenlabs
webhookRouter.post('/', async (req: Request, res: Response) => {
  try {
    const signature = req.header('ElevenLabs-Signature') || '';
    const timestamp = req.header('ElevenLabs-Timestamp') || '';
    const secret = process.env.WEBHOOK_SECRET || '';

    if (!secret) {
      return res.status(500).json({ error: 'Webhook secret not configured' });
    }

    const rawBody = (req.body as Buffer) ?? Buffer.from('');

    if (!verifySignature({ rawBody, signature, timestamp, secret })) {
      return res.status(401).json({ error: 'Invalid signature' });
    }

    // Parse payload after verification
    const textBody = rawBody.toString('utf8');
    const payload = JSON.parse(textBody);

    const payloadType = payload?.type as string | undefined;

    if (payloadType !== 'post_call_transcription' && payloadType !== 'post_call_audio') {
      // Accept unknown but store for diagnostics
      await saveConversationPayload({ payload });
      return res.status(202).json({ status: 'ignored', reason: 'unknown_type' });
    }

    await saveConversationPayload({ payload });

    // Respond quickly to acknowledge receipt
    return res.status(200).json({ ok: true });
  } catch (error) {
    return res.status(400).json({ error: 'Invalid payload' });
  }
});


