import {
    requireAssignedRoute,
    requireClientAccess,
    requireCreditAccess,
    requirePaymentAccess,
    requireReceiptAccess,
} from '../services/routeAccessService.js';

// No revelar si un recurso de otra ruta existe.
const guard = (check) => async (req, res, next) => {
    try {
        await check(req);
    } catch (error) {
        const status = [403, 404, 503].includes(error.status) ? error.status : 503;
        return res.status(status).json({
            success: false,
            message: status === 503
                ? 'No fue posible verificar el acceso. Intenta nuevamente.'
                : error.message,
        });
    }
    return next();
};

export const assignedRoute = guard((req) => requireAssignedRoute(req.user));
export const clientAccess = guard((req) =>
    requireClientAccess(req.user, req.params.clientId));
export const creditAccess = guard((req) =>
    requireCreditAccess(req.user, req.params.creditId || req.params.id));
export const paymentAccess = guard((req) =>
    requirePaymentAccess(req.user, req.params.paymentId));
export const receiptAccess = guard((req) =>
    requireReceiptAccess(req.user, req.params.receiptNumber));
