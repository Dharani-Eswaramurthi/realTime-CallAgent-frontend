import 'dotenv/config';
import express from 'express';
import helmet from 'helmet';
import morgan from 'morgan';

import { webhookRouter } from './routes/webhooks';
import { conversationRouter } from './routes/conversations';

const app = express();

app.use(helmet());
app.use(morgan('dev'));

// Raw body for signature verification route; JSON for others
app.use('/webhooks/elevenlabs', express.raw({ type: '*/*' }));
app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ ok: true });
});

app.use('/webhooks/elevenlabs', webhookRouter);
app.use('/conversations', conversationRouter);

const port = parseInt(process.env.PORT || '4000', 10);
app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Backend listening on http://localhost:${port}`);
});


