import express from 'express';
import { downloadReceipt, downloadReceiptPublic, getReceiptInfo } from '../controllers/receiptController.js';
import { authenticate } from '../middlewares/authMiddleware.js';
import { assignedRoute, paymentAccess, receiptAccess } from '../middlewares/routeAccessMiddleware.js';

const router = express.Router();

// Todos los comprobantes requieren sesión y autorización sobre el cliente.
router.use(authenticate);
router.use(assignedRoute);
// Se conserva la URL antigua, pero ya no permite descargas anónimas.
router.get('/public/:receiptNumber', receiptAccess, downloadReceiptPublic);
router.get('/payment/:paymentId/download', paymentAccess, downloadReceipt);
router.get('/payment/:paymentId', paymentAccess, getReceiptInfo);

export default router;
