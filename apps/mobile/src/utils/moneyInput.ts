// Convención colombiana: punto para miles, coma para centavos.
// Nunca se eliminan signos o letras de un importe inválido para convertirlo en otro.
export const parseMoneyInput = (value: string): number => {
    const text = value.trim();
    if (!/^(?:\d+|\d{1,3}(?:\.\d{3})+)(?:,\d{0,2})?$/.test(text)) return NaN;
    const amount = Number(text.replace(/\./g, '').replace(',', '.'));
    return Number.isFinite(amount) && amount <= Number.MAX_SAFE_INTEGER / 100 ? amount : NaN;
};

export const formatMoneyInput = (value: string): string | null => {
    const text = value.trim().replace(/^(?:COP\s*)?\$\s*|^COP\s+/i, '');
    if (!text) return '';
    if (!Number.isFinite(parseMoneyInput(text)) && !/^,\d{0,2}$/.test(text)) return null;
    const [integer, decimals] = text.split(',');
    const digits = integer.replace(/\./g, '').replace(/^0+(?=\d)/, '') || '0';
    const formatted = digits.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
        + (decimals === undefined ? '' : `,${decimals}`);
    return Number.isFinite(parseMoneyInput(formatted)) ? formatted : null;
};

export type MoneySelection = { start: number; end: number };

// Ajusta el cursor por dígitos, no por el largo del texto con separadores.
export const editMoneyInput = (
    previous: string, incoming: string, selection: MoneySelection
): { value: string; selection: MoneySelection } | null => {
    if (incoming === previous) return { value: previous, selection };
    let start = 0;
    while (start < previous.length && start < incoming.length && previous[start] === incoming[start]) start++;
    let suffix = 0;
    while (suffix < previous.length - start && suffix < incoming.length - start &&
        previous[previous.length - 1 - suffix] === incoming[incoming.length - 1 - suffix]) suffix++;
    // La selección nativa desambigua ediciones entre dígitos iguales (p. ej. 50.000).
    const prefixAtSelection = previous.slice(0, selection.start);
    const suffixAtSelection = previous.slice(selection.end);
    if (incoming.startsWith(prefixAtSelection) && incoming.endsWith(suffixAtSelection) &&
        incoming.length >= prefixAtSelection.length + suffixAtSelection.length) {
        start = selection.start;
        suffix = suffixAtSelection.length;
    } else if (selection.start === selection.end && incoming.length < previous.length) {
        const deleted = previous.length - incoming.length;
        const backspaceStart = Math.max(0, selection.start - deleted);
        if (incoming === previous.slice(0, backspaceStart) + previous.slice(selection.end)) {
            start = backspaceStart;
            suffix = previous.length - selection.end;
        } else if (incoming === prefixAtSelection + previous.slice(selection.end + deleted)) {
            start = selection.start;
            suffix = previous.length - selection.end - deleted;
        }
    }
    let caret = incoming.length - suffix;
    const removed = previous.slice(start, previous.length - suffix);
    const inserted = incoming.slice(start, incoming.length - suffix);

    // No reinterpretar un pegado extranjero/ambiguo como otro importe.
    if (inserted.length > 1 && inserted.includes('.') && formatMoneyInput(inserted) === null) return null;
    // Un punto recién escrito en un teclado decimal también permite ingresar centavos.
    // Un importe pegado como 50.000 sigue siendo cincuenta mil.
    if (inserted === '.' && !previous.includes(',') && selection.start === selection.end) {
        incoming = incoming.slice(0, start) + ',' + incoming.slice(start + 1);
    } else if (inserted === '.') {
        return null;
    }
    // Retroceso junto a un separador debe borrar un dígito, no reinsertar el punto.
    if (!inserted && removed === '.' && selection.start === selection.end) {
        const backwards = selection.start > start;
        const digit = backwards ? start - 1 : start;
        if (/\d/.test(incoming[digit] || '')) {
            incoming = incoming.slice(0, digit) + incoming.slice(digit + 1);
            caret = backwards ? Math.max(0, start - 1) : start;
        }
    }
    // Los separadores antiguos pueden estar desagrupados después de insertar/borrar.
    const value = formatMoneyInput(incoming.replace(/\./g, ''));
    if (value === null) return null;
    const meaningfulBeforeCaret = incoming.slice(0, caret).replace(/[^0-9,]/g, '').length;
    let position = 0;
    let seen = 0;
    while (position < value.length && seen < meaningfulBeforeCaret) {
        if (/[\d,]/.test(value[position])) seen++;
        position++;
    }
    if (caret === incoming.length) position = value.length;
    return { value, selection: { start: position, end: position } };
};
