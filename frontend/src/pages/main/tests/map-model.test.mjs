import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

function loader(globals = {}, overrides = {}) {
  const cache = new Map()
  function load(name) {
    if (cache.has(name)) return cache.get(name)
    const exports = {}
    const js = ts.transpileModule(readFileSync(new URL(`../../../${name}.ts`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    vm.runInNewContext(js, { exports, ...globals, require: id => overrides[id] ?? load(id.replace('@/', '')) })
    cache.set(name, exports)
    return exports
  }
  return load
}
const plain = value => JSON.parse(JSON.stringify(value))
const fc = features => ({ type: 'FeatureCollection', features })
const feature = (id, properties = {}) => ({ type: 'Feature', id, properties, geometry: { type: 'Point', coordinates: [10, 59] } })
function evaluate(expression, properties) {
  if (!Array.isArray(expression)) return expression
  const [op, ...args] = expression
  if (op === 'get') return properties[args[0]] ?? null
  if (op === '==') return evaluate(args[0], properties) === evaluate(args[1], properties)
  if (op === 'match') {
    const input = evaluate(args[0], properties)
    for (let i = 1; i < args.length - 1; i += 2) if (args[i] === input) return evaluate(args[i + 1], properties)
    return evaluate(args.at(-1), properties)
  }
  if (op === 'case') return evaluate(args[0], properties) ? evaluate(args[1], properties) : evaluate(args[2], properties)
  throw new Error(`Unsupported expression: ${op}`)
}

test('all statuses and legacy/null fallbacks select registered icons with the same color as pipes', () => {
  const colors = new Map(), images = new Map()
  let fill
  const context = { scale() {}, beginPath() {}, rect() {}, arc() {}, fill() {}, stroke() {}, set fillStyle(color) { fill = color }, getImageData() { return { color: fill } } }
  const load = loader({ document: { createElement: () => ({ getContext: () => context }) } })
  const { registerPointIcons } = load('pages/main/lib/mapPointIcons')
  const { setOperationsStyle } = load('pages/main/lib/mapLayers')
  const { operationStatuses, statusAliases, statusFallback } = load('pages/main/lib/operationStatus')
  const { pointTypes, pointTypeAliases } = load('pages/main/lib/mapPointStyles')
  const map = { hasImage: id => images.has(id), addImage: (id, image) => images.set(id, image), setPaintProperty: (id, key, value) => colors.set(key, value), setLayoutProperty: (id, key, value) => colors.set(key, value) }
  registerPointIcons(map)
  setOperationsStyle(map, true)
  assert.equal(colors.get('visibility'), 'none')
  for (const status of [...Object.keys(operationStatuses), ...Object.keys(statusAliases), null, '', 'unexpected']) {
    const expected = operationStatuses[statusAliases[status] ?? status]?.color ?? statusFallback.color
    for (const point_type of [...Object.keys(pointTypes), ...Object.keys(pointTypeAliases), 'unexpected', null]) {
      const properties = { status, point_type }
      assert.equal(evaluate(colors.get('line-color'), properties), expected)
      const id = evaluate(colors.get('icon-image'), properties)
      assert.equal(images.get(id)?.color, expected, `${point_type}/${status}: ${id}`)
    }
  }
  setOperationsStyle(map, false)
  assert.equal(colors.get('visibility'), 'visible')
})

test('visibility is independent of status; all categories can be filtered', () => {
  const load = loader()
  const { filterVisibleFeatures } = load('pages/main/lib/mapOperations')
  const { filterFeatures, defaultFilters } = load('pages/main/lib/mapFilters')
  for (const status of ['unknown', 'operational', 'non-operational', 'maintenance-needed', null]) {
    const data = fc([true, false, null].map((is_visible, id) => feature(id, { is_visible, status })))
    assert.deepEqual(plain(filterVisibleFeatures(data).features.map(f => f.id)), [0])
  }
  const data = fc(['main', 'service', 'unknown', 'legacy', null].map((pipe_category, id) => feature(id, { pipe_category })))
  for (const [category, ids] of [['main', [0]], ['service', [1]], ['unknown', [2, 3, 4]]]) {
    assert.deepEqual(plain(filterFeatures(data, { ...defaultFilters, categories: [category] }, 'pipes').features.map(f => f.id)), ids)
  }
  assert.equal(filterFeatures(data, { ...defaultFilters, showPoints: false }, 'points').features.length, 0)
})

test('create, update and delete preserve other collections and do not mutate source data', () => {
  const { upsertMapObject, removeMapObject } = loader()('pages/main/lib/mapObjectUpdates')
  const original = { pipes: fc([feature(1)]), points: fc([{ ...feature(undefined), properties: { id: 1 } }]) }
  const updated = upsertMapObject(original, 'points', feature(1, { status: 'operational' }))
  assert.equal(updated.points.features.length, 1)
  assert.equal(updated.pipes, original.pipes)
  assert.equal(original.points.features[0].properties.status, undefined)
  const created = upsertMapObject(updated, 'points', feature(2))
  assert.equal(created.points.features.length, 2)
  assert.deepEqual(plain(removeMapObject(created, 'points', '1').points.features.map(f => f.id)), [2])
  assert.equal(upsertMapObject(null, 'points', feature(1)), null)
})

test('unsaved forms and drawings share one listener and release it after the final owner leaves', () => {
  const listeners = new Set(), cleanups = []
  let effect
  const load = loader({ window: {
    addEventListener(name, fn) { assert.equal(name, 'beforeunload'); listeners.add(fn) },
    removeEventListener(name, fn) { listeners.delete(fn) },
  } }, { react: { useEffect(fn) { effect = fn } } })
  const { useUnsavedChangesWarning } = load('pages/main/hooks/useUnsavedChangesWarning')
  // Deterministic lifecycle runner supplies React effects for this hook.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const mount = active => { useUnsavedChangesWarning(active); cleanups.push(effect()) }
  mount(false)
  assert.equal(listeners.size, 0)
  mount(true); mount(true)
  assert.equal(listeners.size, 1)
  let prevented = false
  const event = { preventDefault() { prevented = true } }
  for (const fn of listeners) fn(event)
  assert.equal(prevented, true)
  assert.equal(event.returnValue, '')
  cleanups[1]()
  assert.equal(listeners.size, 1)
  cleanups[2]()
  assert.equal(listeners.size, 0)
  mount(true); cleanups[3]()
  assert.equal(listeners.size, 0)
})

function hookRunner() {
  const slots = [], effects = []
  let cursor = 0
  const changed = (a, b) => !a || a.some((v, i) => v !== b[i])
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value } },
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next }] },
    useCallback(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { fn, deps }; return slots[i].fn },
    useEffect(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() } }) },
  }
  return { react, render(fn) { cursor = 0; const result = fn(); while (effects.length) effects.shift()(); return result }, unmount() { for (const slot of slots) slot?.cleanup?.() } }
}

test('selection guards protect dirty/saving/drawing state, retain canonical geometry, and clean up listeners', () => {
  const runner = hookRunner(), listeners = new Map()
  let confirmed = false, resets = 0
  const load = loader({ window: { confirm: () => confirmed } }, { react: runner.react })
  const { useMapSelection } = load('pages/main/hooks/useMapSelection')
  const canonical = feature(7)
  const map = {
    on(name, fn) { listeners.set(name, fn) }, off(name, fn) { if (listeners.get(name) === fn) listeners.delete(name) },
    getLayer: () => true, getCanvas: () => ({ style: {} }),
    queryRenderedFeatures: () => [{ source: 'water-points', id: 7 }, { source: 'water-points', id: 7 }],
  }
  const mode = { current: 'objects' }, drawing = { current: null }, data = { pipes: fc([]), points: fc([canonical]) }
  const reset = () => { resets++; drawing.current = null }, onMode = () => { mode.current = 'objects' }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const render = () => runner.render(() => useMapSelection(map, data, drawing, reset, mode, onMode))
  let state = render()
  listeners.get('click')({ point: { x: 0, y: 0 } })
  state = render()
  assert.equal(state.selected.feature, canonical)
  assert.equal(state.candidates.length, 1)
  state.updateEditingState(true, false)
  assert.equal(state.selectObject({ kind: 'points', feature: feature(8) }), false)
  confirmed = true
  state.updateEditingState(true, true)
  assert.equal(state.selectObject({ kind: 'points', feature: feature(8) }), false)
  state.updateEditingState(true, false)
  assert.equal(state.selectObject({ kind: 'points', feature: feature(8) }), true)
  state = render()
  assert.equal(state.selected.feature.id, 8)
  drawing.current = {}; confirmed = false
  state.closeEditor()
  assert.equal(render().selected.feature.id, 8)
  confirmed = true
  state.closeEditor()
  assert.equal(render().selected, null)
  assert.ok(resets >= 3)
  runner.unmount()
  assert.equal(listeners.size, 0)
})

test('map lifecycle removes the map and ignores pending data after unmount', async () => {
  const runner = hookRunner(), maps = []
  let resolve
  const pending = new Promise(done => { resolve = done })
  class FakeMap {
    constructor() { maps.push(this); this.handlers = new Map(); this.sources = new Map() }
    addControl() {}
    once(name, fn) { this.handlers.set(name, fn) }
    addSource(id, source) { this.sources.set(id, source) }
    remove() { this.removed = true; this.handlers.clear() }
  }
  const load = loader({ AbortController }, {
    react: runner.react,
    'maplibre-gl': { Map: FakeMap, NavigationControl: class {}, ScaleControl: class {}, setWorkerUrl() {} },
    'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url': { default: 'worker.js' },
    '@/pages/main/services/mapServices': { getWaterPipes: () => pending, getWaterPoints: () => pending },
    '@/pages/main/lib/mapLayers': { addWaterMapLayers() {} },
  })
  const { useWaterMap } = load('pages/main/hooks/useWaterMap')
  // Assign the simulated DOM ref before React's effects run.
  const state = runner.render(() => {
    // eslint-disable-next-line react-hooks/rules-of-hooks
    const result = useWaterMap()
    result.container.current = {}
    return result
  })
  assert.equal(maps.length, 1)
  maps[0].handlers.get('load')()
  runner.unmount()
  assert.equal(state.mapRef.current, null)
  assert.equal(maps[0].removed, true)
  assert.equal(maps[0].handlers.size, 0)
  resolve(fc([]))
  await new Promise(done => setImmediate(done))
  assert.equal(maps[0].sources.size, 0)
})
