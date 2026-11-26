import express from 'express';
import {
    getAllUsers,
    getUserById,
    updateUser,
    deleteUser,
    activateUser
} from '../controllers/adminController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';
import { createWorker, getWorkers, getWorkerClients, getWorkerRouteOptions } from '../controllers/workerController.js';

const router = express.Router();

// Todas las rutas requieren autenticación y rol de admin
router.use(authenticate);
router.use(authorize('admin'));

// Gestión de trabajadores, exclusiva del administrador.
router.use('/workers', (_req, res, next) => {
    res.setHeader('Cache-Control', 'no-store');
    next();
});
router.get('/workers', getWorkers);
router.get('/workers/routes', getWorkerRouteOptions);
router.post('/workers', createWorker);
router.get('/workers/:id/clients', getWorkerClients);

// Rutas de administración de usuarios
router.get('/users', getAllUsers);
router.get('/users/:id', getUserById);
router.put('/users/:id', updateUser);
router.delete('/users/:id', deleteUser);
router.patch('/users/:id/activate', activateUser);

export default router;
