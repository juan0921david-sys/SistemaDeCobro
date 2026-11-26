import supabase from '../config/supabase.js';

const accessError = (status, message) => Object.assign(new Error(message), { status });

export const requireAssignedRoute = (user) => {
    if (user.role === 'worker' && !user.route_id) {
        throw accessError(403, 'Debes tener una ruta asignada');
    }
};

const findOne = async (query, message) => {
    const { data, error } = await query.maybeSingle();
    if (error) {
        throw accessError(503, 'No fue posible verificar el acceso. Intenta nuevamente.');
    }
    if (!data) throw accessError(404, message);
    return data;
};

export const requireClientAccess = async (user, clientId) => {
    requireAssignedRoute(user);
    let query = supabase.from('clients').select('id, route_id').eq('id', clientId);
    if (user.role === 'worker') query = query.eq('route_id', user.route_id);
    return findOne(query, 'Cliente no encontrado');
};

export const requireCreditAccess = async (user, creditId) => {
    requireAssignedRoute(user);
    const credit = await findOne(
        supabase.from('credits').select('id, client_id').eq('id', creditId),
        'Crédito no encontrado'
    );
    await requireClientAccess(user, credit.client_id);
    return credit;
};

export const requirePaymentAccess = async (user, paymentId) => {
    requireAssignedRoute(user);
    const payment = await findOne(
        supabase.from('payments').select('id, client_id, credit_id').eq('id', paymentId),
        'Pago no encontrado'
    );
    await requireClientAccess(user, payment.client_id);
    await requireCreditAccess(user, payment.credit_id);
    return payment;
};

export const requireReceiptAccess = async (user, receiptNumber) => {
    requireAssignedRoute(user);
    const receipt = await findOne(
        supabase.from('receipts').select('id, payment_id')
            .eq('receipt_number', receiptNumber),
        'Comprobante no encontrado'
    );
    await requirePaymentAccess(user, receipt.payment_id);
    return receipt;
};
