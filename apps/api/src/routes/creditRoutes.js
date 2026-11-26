import express from 'express';
import {
    createCredit,
    getAllCredits,
    getCreditById,
    getClientCredits
} from '../controllers/creditController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { assignedRoute, clientAccess, creditAccess } from '../middlewares/routeAccessMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(assignedRoute);

router.post('/', createCredit);
router.get('/', getAllCredits);
router.get('/:id', creditAccess, getCreditById);
router.get('/client/:clientId', clientAccess, getClientCredits);

export default router;
