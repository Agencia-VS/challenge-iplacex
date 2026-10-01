import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

// Ejecuta la acción real con el límite de Supabase controlado: no usa cuentas reales.
function loadModule(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: (name) => dependencies[name] });
  return exports;
}
const perfil = loadModule('../src/lib/perfil.ts');
function setup({ user = { id: 'usuario-a' }, authError = null, update = { data: { condicion_academica: 'estudiante' }, error: null }, read = { data: null, error: null } } = {}) {
  const calls = [];
  const query = {
    update: (value) => { calls.push(['update', value]); return query; },
    eq: (...args) => { calls.push(['eq', ...args]); return query; },
    is: (...args) => { calls.push(['is', ...args]); return query; },
    select: () => query,
    maybeSingle: async () => update,
    single: async () => read,
  };
  const { guardarCondicionAcademica: save } = loadModule('../src/app/actions/perfil.ts', {
    '@/lib/perfil': perfil,
    '@/lib/supabase/server': { createClient: async () => ({
      auth: { getUser: async () => ({ data: { user }, error: authError }) },
      from: (table) => { calls.push(['from', table]); return query; },
    }) },
    'next/cache': { revalidatePath: (path) => calls.push(['revalidate', path]) },
  });
  return { save, calls };
}

test('rechaza valores vacíos, múltiples o fuera del catálogo sin consultar la base', async () => {
  const { save, calls } = setup();
  for (const value of [null, '', 'egresado', ['titulado', 'estudiante'], { rol: 'admin' }]) {
    assert.equal((await save(value, 'usuario-a')).ok, false);
  }
  assert.equal(calls.length, 0);
});
test('sin sesión o con otra cuenta no modifica ningún perfil', async () => {
  for (const options of [{ user: null }, { authError: new Error('expired') }, { user: { id: 'usuario-b' } }]) {
    const { save, calls } = setup(options);
    assert.equal((await save('titulado', 'usuario-a')).ok, false);
    assert.equal(calls.length, 0);
  }
});
test('guarda ambas alternativas solo para el ID autenticado y pendiente', async () => {
  for (const condicion of ['titulado', 'estudiante']) {
    const { save, calls } = setup({ update: { data: { condicion_academica: condicion }, error: null } });
    const result = await save(condicion, 'usuario-a');
    assert.equal(result.ok, true);
    assert.equal(result.condicion, condicion);
    assert.ok(calls.some(([kind, column, value]) => kind === 'eq' && column === 'id' && value === 'usuario-a'));
    assert.ok(calls.some(([kind, column, value]) => kind === 'is' && column === 'condicion_academica' && value === null));
    assert.ok(calls.some(([kind, path]) => kind === 'revalidate' && path === '/app/perfil'));
  }
});
test('un fallo de escritura no se anuncia como éxito ni revalida', async () => {
  const { save, calls } = setup({ update: { data: null, error: { message: 'RLS or offline' } } });
  assert.equal((await save('titulado', 'usuario-a')).ok, false);
  assert.equal(calls.some(([kind]) => kind === 'revalidate'), false);
});
test('si otra pestaña respondió, conserva la primera respuesta persistida', async () => {
  const { save } = setup({ update: { data: null, error: null }, read: { data: { condicion_academica: 'estudiante' }, error: null } });
  const result = await save('titulado', 'usuario-a');
  assert.equal(result.ok, true);
  assert.equal(result.condicion, 'estudiante');
});
test('un perfil inexistente, invisible o todavía vacío nunca confirma guardado', async () => {
  for (const read of [{ data: null, error: { message: 'not found' } }, { data: { condicion_academica: null }, error: null }]) {
    const { save } = setup({ update: { data: null, error: null }, read });
    assert.equal((await save('titulado', 'usuario-a')).ok, false);
  }
});
