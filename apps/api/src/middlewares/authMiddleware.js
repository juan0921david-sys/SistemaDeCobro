import { verifyToken } from '../utils/jwt.js';
import supabase from '../config/supabase.js';

export const authenticate = async (req, res, next) => {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
        return res.status(401).json({
            success: false,
            message: 'Token no proporcionado',
        });
    }

    const match = /^Bearer\s+(\S+)$/i.exec(authHeader);

    if (!match) {
        return res.status(401).json({
            success: false,
            message: 'Formato de autorización inválido',
        });
    }

    const decoded = verifyToken(match[1]);

    if (!decoded) {
        return res.status(401).json({
            success: false,
            message: 'Token inválido o expirado',
        });
    }

    let user;

    try {
        const result = await supabase
            .from('users')
            .select('id, email, full_name, role, is_active, route_id')
            .eq('id', decoded.userId)
            .maybeSingle();

        if (result.error) {
            console.error('Error verificando sesión:', {
                code: result.error.code,
            });

            return res.status(503).json({
                success: false,
                message: 'No fue posible verificar la sesión. Intenta nuevamente.',
            });
        }

        user = result.data;
    } catch {
        console.error('No fue posible consultar el usuario de la sesión');

        return res.status(503).json({
            success: false,
            message: 'No fue posible verificar la sesión. Intenta nuevamente.',
        });
    }

    if (!user || user.is_active !== true) {
        return res.status(401).json({
            success: false,
            message: 'Sesión no válida. Inicia sesión con una cuenta activa.',
        });
    }

    if (!['admin', 'worker'].includes(user.role)) {
        return res.status(403).json({
            success: false,
            message: 'El usuario no tiene un rol autorizado',
        });
    }

    // Mantener userId para los controladores existentes.
    // El rol y los datos proceden de la base, no del JWT.
    req.user = {
        userId: user.id,
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        route_id: user.route_id,
    };

    return next();
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({
                success: false,
                message: 'Usuario no autenticado',
            });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'No tienes permisos para esta acción',
            });
        }

        return next();
    };
};