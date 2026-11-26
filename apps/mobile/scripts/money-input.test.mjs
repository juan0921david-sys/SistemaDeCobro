import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { stripTypeScriptTypes } from 'node:module';
import test from 'node:test';

// Pruebas puras: sin Expo, peticiones HTTP ni acceso a la base de datos.
const sourceURL = (file, replacements = []) => {
    let source = stripTypeScriptTypes(readFileSync(new URL(file, import.meta.url), 'utf8'));
    for (const [from, to] of replacements) source = source.replace(from, to);
    return `data:text/javascript;base64,${Buffer.from(source).toString('base64')}`;
};
const moneyURL = sourceURL('../src/utils/moneyInput.ts');
const { formatMoneyInput, parseMoneyInput, editMoneyInput } = await import(moneyURL);
const { initialForm, parseAmount, toCreditPayload, validateStep, previewPlan } = await import(
    sourceURL('../src/utils/creditForm.ts', [["'./moneyInput'", JSON.stringify(moneyURL)]])
);
const cursor = position => ({ start: position, end: position });

test('agrupa miles y conserva centavos, ceros y la coma mientras se escribe', () => {
    for (const [input, expected] of [
        ['', ''], ['0', '0'], ['00050', '50'], ['50000', '50.000'],
        ['123456789', '123.456.789'], ['50000,', '50.000,'],
        ['50000,05', '50.000,05'], ['0,50', '0,50'], [',', '0,'],
        ['$ 50.000,50', '50.000,50'], ['COP 50.000', '50.000'],
    ]) assert.equal(formatMoneyInput(input), expected, input);
});

test('no convierte importes ambiguos, negativos o texto en otros montos', () => {
    for (const input of ['-50000', '1e6', 'abc500', '50,000.50', '50,000', '1.00', '1..000', '0,123', '999999999999999999']) {
        assert.equal(formatMoneyInput(input), null, input);
    }
    for (const input of ['', '.', 'abc', '-1', '50,000', '5.50']) {
        assert.ok(Number.isNaN(parseMoneyInput(input)), input);
    }
    assert.equal(parseMoneyInput('50.000,05'), 50000.05);
    assert.equal(parseMoneyInput('50000'), 50000);
    assert.equal(parseMoneyInput('50.000,'), 50000);
});

test('escribe 50000 y borra todo sin separadores atascados', () => {
    let value = '';
    for (const digit of '50000') {
        const edit = editMoneyInput(value, value + digit, cursor(value.length));
        assert.ok(edit);
        value = edit.value;
        assert.equal(edit.selection.start, value.length);
    }
    assert.equal(value, '50.000');
    for (const expected of ['5.000', '500', '50', '5', '']) {
        const edit = editMoneyInput(value, value.slice(0, -1), cursor(value.length));
        assert.equal(edit.value, expected);
        value = edit.value;
    }
});

test('mantiene el cursor en ediciones intermedias, incluso entre ceros iguales', () => {
    const edit = editMoneyInput('50.000', '50.0000', cursor(4));
    assert.equal(edit.value, '500.000');
    assert.deepEqual(edit.selection, cursor(5));
    const deletion = editMoneyInput('50.000', '50.00', cursor(4));
    assert.equal(deletion.value, '5.000');
    assert.deepEqual(deletion.selection, cursor(3));
    const replacement = editMoneyInput('50.000', '52.000', { start: 1, end: 2 });
    assert.equal(replacement.value, '52.000');
    assert.deepEqual(replacement.selection, cursor(2));
});

test('retroceso y borrar delante junto al punto eliminan un dígito', () => {
    const backspace = editMoneyInput('50.000', '50000', cursor(3));
    assert.equal(backspace.value, '5.000');
    assert.deepEqual(backspace.selection, cursor(1));
    const forward = editMoneyInput('50.000', '50000', cursor(2));
    assert.equal(forward.value, '5.000');
    assert.deepEqual(forward.selection, cursor(3));
});

test('el teclado decimal con punto y el de coma producen el mismo importe', () => {
    for (const separator of ['.', ',']) {
        let edit = editMoneyInput('50.000', `50.000${separator}`, cursor(6));
        assert.equal(edit.value, '50.000,');
        edit = editMoneyInput(edit.value, edit.value + '5', edit.selection);
        assert.equal(edit.value, '50.000,5');
        assert.equal(parseMoneyInput(edit.value), 50000.5);
    }
});

test('pega miles sin tratarlos como decimales y rechaza pegados ambiguos', () => {
    for (const input of ['50000', '50.000', '$ 50.000']) {
        assert.equal(editMoneyInput('', input, cursor(0)).value, '50.000');
    }
    assert.equal(editMoneyInput('10', '50.000,50', { start: 0, end: 2 }).value, '50.000,50');
    for (const input of ['5.50', '-50000', '50,000.50', 'abc500', '500,123']) {
        assert.equal(editMoneyInput('', input, cursor(0)), null, input);
    }
});

test('porcentajes conservan sus decimales y el payload financiero contiene números', () => {
    const form = {
        ...initialForm(), client_full_name: 'Prueba local', client_identification: '123',
        amount: '500.000,50', interest_rate: '2.5', number_of_installments: '12',
        start_date: '25/11/2026',
    };
    assert.equal(parseAmount('2.5'), 2.5);
    assert.equal(parseAmount('2,5'), 2.5);
    assert.ok(Number.isNaN(parseAmount('2.500')));
    assert.equal(validateStep(2, form, false), null);
    const payload = toCreditPayload(form, false);
    assert.equal(payload.amount, 500000.5);
    assert.equal(payload.interest_rate, 2.5);
    assert.equal(typeof payload.amount, 'number');
    assert.equal(previewPlan(payload).total, 512500.51);
    assert.ok(validateStep(2, { ...form, amount: '0' }, false));
    assert.ok(validateStep(2, { ...form, amount: '50,000.50' }, false));
});

test('insertar o borrar en cualquier posición conserva el importe esperado', () => {
    for (const raw of ['999', '1000', '9999', '10000', '50000', '1000000', '1234567,89']) {
        const previous = formatMoneyInput(raw);
        for (let index = 0; index <= previous.length; index++) {
            const incoming = previous.slice(0, index) + '7' + previous.slice(index);
            const expected = formatMoneyInput(incoming.replace(/\./g, ''));
            const edit = editMoneyInput(previous, incoming, cursor(index));
            assert.equal(edit?.value ?? null, expected, `insertar en ${index} de ${previous}`);
            if (edit) assert.ok(edit.selection.start <= edit.value.length);
            if (index === 0 || previous[index - 1] === '.') continue;
            const deleted = previous.slice(0, index - 1) + previous.slice(index);
            const expectedDeletion = formatMoneyInput(deleted.replace(/\./g, ''));
            assert.equal(editMoneyInput(previous, deleted, cursor(index))?.value ?? null,
                expectedDeletion, `borrar en ${index} de ${previous}`);
        }
    }
});

test('el servicio de abonos recibe el número, nunca los separadores de pantalla', async () => {
    const { registerPartialPayment } = await import(sourceURL('../src/services/paymentService.ts', [
        ["import api from './api';", 'const api = { post: async (url, body) => ({ data: { data: { url, body } } }) };'],
    ]));
    const result = await registerPartialPayment('credito-local', parseMoneyInput('50.000,50'), 'cash', '');
    assert.equal(result.url, '/payments/credit/credito-local/partial');
    assert.equal(result.body.amount, 50000.5);
    assert.equal(typeof result.body.amount, 'number');
});
