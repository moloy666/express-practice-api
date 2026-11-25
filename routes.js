import { Router } from 'express';

const router = Router();

router.get('/', (_req, res) => {
  res.send('Hello from Express!');
});

router.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

export default router;
