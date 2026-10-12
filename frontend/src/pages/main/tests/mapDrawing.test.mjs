import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

// Exercise the real hook's event handlers with deterministic map/terrain results.
function harness() {
  const slots = [], effects = [], markers = []
  let cursor = 0
  const changed = (a, b) => !a || a.some((value, i) => value !== b[i])
  const react = {
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value } },
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], next => { slots[i] = next }] },
    useCallback(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) slots[i] = { fn, deps }; return slots[i].fn },
    useEffect(fn, deps) { const i = cursor++; if (changed(slots[i]?.deps, deps)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() } }) },
  }
  class Element {
    dataset = {}; style = {}; hidden = false
    classList = { toggle() {} }
    setAttribute() {} addEventListener() {} removeEventListener() {} closest() { return null }
  }
  class Marker {
    handlers = {}
    constructor(options) { this.options = options; markers.push(this) }
    setLngLat(position) { this.position = [...position]; return this }
    getLngLat() { return { wrap: () => ({ lng: this.position[0], lat: this.position[1] }) } }
    getElement() { return this.options.element }
    addTo() { return this } remove() { this.removed = true }
    on(event, fn) { this.handlers[event] = fn; return this }
    fire(event) { this.handlers[event]?.() }
  }
  const loaded = new Map()
  function load(name) {
    if (loaded.has(name)) return loaded.get(name)
    const exports = {}
    const js = ts.transpileModule(readFileSync(new URL(`../../../${name}.ts`, import.meta.url), 'utf8'), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    }).outputText
    vm.runInNewContext(js, { exports, Element, document: { createElement: () => new Element() }, window: new Element(),
      require: id => id === 'react' ? react : id === 'maplibre-gl' ? { Marker } : load(id.replace('@/', '')),
    })
    loaded.set(name, exports)
    return exports
  }
  const { useMapDrawing } = load('pages/main/hooks/useMapDrawing')
  const listeners = new Map(), canvas = new Element()
  const map = {
    hits: [], project: ([x, y]) => ({ x: x * 10, y: y * 10 }),
    on(event, fn) { if (!listeners.has(event)) listeners.set(event, new Set()); listeners.get(event).add(fn) },
    off(event, fn) { listeners.get(event)?.delete(fn) },
    emit(event, args) { for (const fn of listeners.get(event) ?? []) fn(args) },
    getLayer: () => true, queryRenderedFeatures() { return this.hits },
    getSource: () => ({ setData() {} }), getCanvas: () => canvas,
    doubleClickZoom: { isEnabled: () => true, disable() {}, enable() {} },
  }
  const collection = features => ({ type: 'FeatureCollection', features })
  const coordinate = [10.123456789, 59.123456789]
  const data = { current: { points: collection([{ type: 'Feature', id: 7, properties: {}, geometry: { type: 'Point', coordinates: coordinate } }]), pipes: collection([]) } }
  // The deterministic hook runner above supplies React's lifecycle for this test.
  // eslint-disable-next-line react-hooks/rules-of-hooks
  const render = () => { cursor = 0; const tools = useMapDrawing(map, data); while (effects.length) effects.shift()(); return tools }
  const click = point => map.emit('click', { point, lngLat: { wrap: () => ({ lng: 9, lat: 58 }) }, originalEvent: { detail: 1, target: new Element() } })
  return { render, map, data, markers, coordinate, click }
}
const plain = value => JSON.parse(JSON.stringify(value))

test('hover previews the exact snap target and clicking preserves its coordinates', () => {
  const h = harness()
  h.render().start('points', null, () => {})
  h.render()
  const point = h.map.project(h.coordinate); point.x += 20
  h.map.emit('mousemove', { point })
  assert.equal(h.render().snapped, true)
  h.click(point)
  assert.deepEqual(plain(h.render().drawing.vertices), [h.coordinate])
})

test('drag uses cursor position, not terrain round-trip position, and commits exact coordinates', () => {
  const h = harness()
  h.render().start('pipes', { type: 'LineString', coordinates: [[1, 2], [3, 4]] }, () => {})
  h.render()
  const marker = h.markers.find(m => m.options.draggable)
  marker.fire('dragstart')
  h.map.emit('mousemove', { point: h.map.project(h.coordinate) })
  // Simulate an unproject/project offset from terrain or grabbing the marker edge.
  marker.setLngLat([9, 50])
  marker.fire('drag')
  assert.deepEqual(marker.position, h.coordinate)
  marker.fire('dragend')
  assert.deepEqual(plain(h.render().drawing.vertices[0]), h.coordinate)
})

test('rendered point hit recovers a target when terrain projection differs', () => {
  const h = harness()
  h.map.project = () => ({ x: 800, y: 800 })
  h.map.hits = [{ id: 7, geometry: { coordinates: [10, 59] } }]
  h.render().start('points', null, () => {})
  h.render()
  h.click({ x: 100, y: 100 })
  assert.deepEqual(plain(h.render().drawing.vertices[0]), h.coordinate)
})

test('edited point cannot snap back to itself through rendered hits', () => {
  const h = harness()
  h.map.hits = [{ id: 7 }]
  h.render().start('points', { type: 'Point', coordinates: h.coordinate }, () => {}, { kind: 'points', id: 7 })
  h.render()
  h.click(h.map.project(h.coordinate))
  assert.deepEqual(plain(h.render().drawing.vertices[0]), [9, 58])
})

test('outside the snap radius, a new point keeps the clicked coordinates', () => {
  const h = harness()
  h.render().start('points', null, () => {})
  h.render()
  h.click({ x: 0, y: 0 })
  assert.deepEqual(plain(h.render().drawing.vertices[0]), [9, 58])
})
