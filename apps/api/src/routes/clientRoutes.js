import express from 'express';
import {
    createClient,
    getAllClients,
    getClientById,
    searchClients,
    updateClient,
    deleteClient,
    activateClient,
    deleteClientPermanent
} from '../controllers/clientController.js';
import { authenticate, authorize } from '../middlewares/authMiddleware.js';

const router = express.Router();

// Todas las rutas requieren autenticación
router.use(authenticate);

// Sin ruta asignada, un trabajador no puede acceder a clientes.
router.use((req, res, next) => {
    if (req.user.role === 'worker' && !req.user.route_id) {
        return res.status(403).json({
            success: false,
            message: 'Debes tener una ruta asignada para acceder a clientes'
        });
    }
    return next();
});

// Registro y consulta para trabajadores y administradores autenticados
router.post('/', createClient);
router.get('/', getAllClients);
router.get('/search', searchClients);
router.get('/:id', getClientById);
// El controlador limita al trabajador a los clientes de su propia ruta.
router.put('/:id', updateClient);

// Desactivar y reactivar - SOLO ADMIN
router.delete('/:id', authorize('admin'), deleteClient);
router.patch('/:id/activate', authorize('admin'), activateClient);

// Eliminación permanente - SOLO ADMIN
router.delete('/:id/permanent', authorize('admin'), deleteClientPermanent);

export default router;
