import express from 'express';
import { register, login, getProfile } from '../controllers/authController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import {
    loginLimiter,
    registerLimiter,
} from '../middlewares/rateLimitMiddleware.js';

const router = express.Router();

// Inicio de sesión público.
router.post('/login', loginLimiter, login);

// Solo un administrador autenticado puede crear usuarios.
router.post(
    '/register',
    authenticate,
    authorize('admin'),
    registerLimiter,
    register
);

// Perfil del usuario autenticado.
router.get('/profile', authenticate, getProfile);

export default router;