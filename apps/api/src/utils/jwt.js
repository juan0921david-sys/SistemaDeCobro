import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

if (
    !JWT_SECRET ||
    JWT_SECRET.trim().length < 32 ||
    JWT_SECRET === 'fallback-secret-no-produccion'
) {
    throw new Error(
        'JWT_SECRET debe contener un secreto privado de al menos 32 caracteres'
    );
}

export const generateToken = (userId, email, role) => {
    return jwt.sign(
        { userId, email, role },
        JWT_SECRET,
        {
            algorithm: 'HS256',
            expiresIn: JWT_EXPIRES_IN,
        }
    );
};

export const verifyToken = (token) => {
    try {
        const decoded = jwt.verify(token, JWT_SECRET, {
            algorithms: ['HS256'],
        });

        if (
            typeof decoded !== 'object' ||
            decoded === null ||
            typeof decoded.userId !== 'string' ||
            !decoded.userId ||
            typeof decoded.exp !== 'number'
        ) {
            return null;
        }

        return decoded;
    } catch {
        return null;
    }
};