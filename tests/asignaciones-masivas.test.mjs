import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, { exports, require: name => dependencies[name], process: { env: {} } });
  return exports;
}
const verticales = load('../src/lib/verticales.ts');
const p1 = '00000000-0000-0000-0000-000000000001';
const p2 = '00000000-0000-0000-0000-000000000002';
const e1 = '00000000-0000-0000-0000-000000000003';
const e2 = '00000000-0000-0000-0000-000000000004';
const input = { proyectoIds: [p1, p2], evaluadorIds: [e1, e2], etapaId: 7 };

function setup(options = {}) {
  const { rol = 'admin', user = { id: 'admin-verificado' }, writeError = false, readError = false } = options;
  const etapa = options.etapa ?? { id: 7, convocatoria_id: 2, tipo: 'preseleccion' };
  const proyectos = options.proyectos ?? [p1, p2].map(id => ({ id, convocatoria_id: 2, estado_postulacion: 'enviada' }));
  const evaluadores = options.evaluadores ?? [e1, e2].map(id => ({ id, rol: 'comite_tecnico' }));
  const calls = [];
  const existing = new Map([[`${p1}/${e1}/7`, { id: 'existente', estado: 'finalizada' }]]);
  const db = {
    from(table) {
      const result = { data: table === 'etapas' ? etapa : table === 'proyectos' ? proyectos : evaluadores, error: readError ? { message: 'failed' } : null };
      const q = { select: () => q, eq: () => q, in: () => Promise.resolve(result), single: () => Promise.resolve(result),
        upsert(rows, config) {
          calls.push({ kind: 'write', rows, config });
          const inserted = [];
          if (!writeError) for (const row of rows) {
            const key = `${row.proyecto_id}/${row.evaluador_id}/${row.etapa_id}`;
            if (!existing.has(key)) { existing.set(key, row); inserted.push({ id: key }); }
          }
          return { select: async () => ({ data: writeError ? null : inserted, error: writeError ? { message: 'db down' } : null }) };
        },
      };
      return q;
    },
  };
  const authQuery = { select: () => authQuery, eq: () => authQuery, single: async () => ({ data: { rol } }) };
  const actions = load('../src/app/actions/asignaciones.ts', {
    '@/lib/verticales': verticales,
    'next/headers': { cookies: async () => ({ getAll: () => [] }) },
    '@supabase/ssr': { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user } }) }, from: () => authQuery }) },
    '@/lib/supabase/admin': { createAdminClient: () => { calls.push({ kind: 'adminClient' }); return db; } },
    'next/cache': { revalidatePath: (...args) => calls.push({ kind: 'revalidate', args }) },
  });
  return { save: actions.asignarProyectosMasivamente, calls, existing };
}

test('solo admin autenticado llega al cliente privilegiado', async () => {
  for (const options of [{ user: null }, { rol: 'jurado' }, { rol: 'comite_tecnico' }, { rol: 'postulante' }]) {
    const { save, calls } = setup(options);
    assert.equal((await save(input)).ok, false);
    assert.equal(calls.length, 0);
  }
});
test('rechaza entradas manipuladas, vacías y lotes demasiado grandes', async () => {
  const ids = n => Array.from({ length: n }, (_, i) => `00000000-0000-0000-0000-${String(i).padStart(12, '0')}`);
  for (const value of [null, {}, { ...input, etapaId: -1 }, { ...input, proyectoIds: [] }, { ...input, evaluadorIds: ['bad'] }, { proyectoIds: ids(100), evaluadorIds: ids(11), etapaId: 7 }]) {
    const { save, calls } = setup(); assert.equal((await save(value)).ok, false); assert.equal(calls.length, 0);
  }
});
test('verifica etapa, convocatoria, estado, existencia y rol antes de escribir', async () => {
  for (const options of [
    { etapa: { id: 7, tipo: 'postulacion', convocatoria_id: 2 } },
    { proyectos: [{ id: p1, convocatoria_id: 3, estado_postulacion: 'enviada' }, { id: p2, convocatoria_id: 2, estado_postulacion: 'enviada' }] },
    { proyectos: [p1, p2].map(id => ({ id, convocatoria_id: 2, estado_postulacion: 'borrador' })) },
    { proyectos: [] }, { evaluadores: [] }, { evaluadores: [e1, e2].map(id => ({ id, rol: 'postulante' })) }, { readError: true },
  ]) {
    const { save, calls } = setup(options); assert.equal((await save(input)).ok, false); assert.equal(calls.some(c => c.kind === 'write'), false);
  }
});
test('asigna el producto cartesiano con una escritura y preserva las evaluaciones existentes', async () => {
  const { save, calls, existing } = setup();
  const result = await save({ ...input, proyectoIds: [p1, p2, p1], evaluadorIds: [e1, e2, e1] });
  assert.equal(result.ok, true); assert.equal(result.creadas, 3); assert.equal(result.existentes, 1);
  const writes = calls.filter(c => c.kind === 'write'); assert.equal(writes.length, 1);
  assert.equal(writes[0].rows.length, 4); assert.equal(writes[0].config.ignoreDuplicates, true);
  assert.equal(writes[0].config.onConflict, 'proyecto_id,evaluador_id,etapa_id');
  assert.ok(writes[0].rows.every(r => r.asignado_por === 'admin-verificado' && r.etapa_id === 7));
  assert.equal(existing.get(`${p1}/${e1}/7`).estado, 'finalizada');
  const retry = await save(input); assert.equal(retry.creadas, 0); assert.equal(retry.existentes, 4);
  assert.ok(calls.some(c => c.kind === 'revalidate' && c.args[0] === '/app/evaluacion'));
});
test('un error de escritura no se informa como éxito', async () => {
  const { save, calls } = setup({ writeError: true }); assert.equal((await save(input)).ok, false);
  assert.equal(calls.some(c => c.kind === 'revalidate'), false);
});
test('verticales usan número canónico y búsqueda ignora acentos; no habilita borradores ni descartados', () => {
  assert.equal(verticales.coincideVertical(2, 1), false);
  assert.equal(verticales.coincideVertical(null, 0), true);
  assert.equal(verticales.normalizarBusqueda('  Innovación  '), 'innovacion');
  for (const estado of ['borrador', 'inadmisible', 'descalificado', 'no_preseleccionado', 'no_finalista']) assert.equal(verticales.proyectoAsignable(estado), false);
  assert.equal(verticales.proyectoAsignable('enviada'), true);
});
