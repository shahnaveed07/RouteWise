import { Router } from 'express';
import { handleSearchLocations } from '../controllers/locationController.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

router.use(requireAuth);

router.get('/search', handleSearchLocations);

export default router;
