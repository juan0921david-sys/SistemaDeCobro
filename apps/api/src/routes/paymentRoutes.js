import express from 'express';
import {
    payInstallment,
    registerPartialPayment,
    getCreditPayments,
    getClientPayments
} from '../controllers/paymentController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { assignedRoute, clientAccess, creditAccess } from '../middlewares/routeAccessMiddleware.js';

const router = express.Router();

router.use(authenticate);
router.use(assignedRoute);

// Rutas de pagos
router.post('/credit/:creditId/installment/:installmentId', creditAccess, payInstallment);
router.post('/credit/:creditId/partial', creditAccess, registerPartialPayment);
router.get('/credit/:creditId', creditAccess, getCreditPayments);
router.get('/client/:clientId', clientAccess, getClientPayments);

export default router;
