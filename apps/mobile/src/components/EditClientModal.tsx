import { useRef, useState } from 'react';
import { Alert, Text } from 'react-native';
import axios from 'axios';
import { RetroButton } from './RetroButton';
import { FormField, Notice, RetroFormModal, formStyles as s } from './RetroFormModal';
import { updateClient, type Client } from '@/services/clientService';
import { errorMessage } from '@/utils/display';

export const EditClientModal = ({ client, onClose, onSaved }: {
    client: Client; onClose: () => void; onSaved: () => void;
}) => {
    const [form, setForm] = useState({ full_name: client.full_name, phone: client.phone || '', email: client.email || '', address: client.address || '' });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const locked = useRef(false);
    const change = (key: keyof typeof form, value: string) => setForm(previous => ({ ...previous, [key]: value }));
    const save = async () => {
        if (locked.current) return;
        if (!form.full_name.trim()) { setError('El nombre es obligatorio.'); return; }
        if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) { setError('Revisa el correo electrónico.'); return; }
        locked.current = true;
        setSaving(true);
        try {
            await updateClient(client.id, {
                full_name: form.full_name.trim(), phone: form.phone.trim() || null,
                email: form.email.trim() || null, address: form.address.trim() || null,
            });
            onSaved();
        } catch (err) {
            setError(axios.isAxiosError(err) && (!err.response || err.response.status >= 500)
                ? 'No se pudo confirmar la actualización. Cierra y consulta el perfil antes de reintentar.'
                : errorMessage(err, 'No fue posible guardar.'));
        } finally {
            locked.current = false; setSaving(false);
        }
    };
    return (
        <RetroFormModal title="Editar cliente" busy={saving} onClose={() => Alert.alert('Cerrar edición', 'Los cambios no guardados se perderán.', [
            { text: 'Continuar', style: 'cancel' }, { text: 'Cerrar', onPress: onClose },
        ])} footer={<RetroButton title="Guardar cambios" onPress={save} loading={saving} />}>
            <Text style={s.muted}>Cédula: {client.identification}. La cédula y la ruta no se modifican desde este formulario.</Text>
            {!!error && <Notice>{error}</Notice>}
            <FormField label="Nombre completo *" value={form.full_name} onChangeText={value => change('full_name', value)} />
            <FormField label="Teléfono" value={form.phone} onChangeText={value => change('phone', value)} keyboardType="phone-pad" />
            <FormField label="Dirección" value={form.address} onChangeText={value => change('address', value)} />
            <FormField label="Correo electrónico" value={form.email} onChangeText={value => change('email', value)} keyboardType="email-address" autoCapitalize="none" />
        </RetroFormModal>
    );
};
