import { Router } from 'express';
import { handleGetWeather } from '../controllers/weatherController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/', handleGetWeather);

export default router;
