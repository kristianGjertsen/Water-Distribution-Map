import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const componentPath = '../Subcomponents/MapObject/'
const record = { id: 7, status: 'unknown', is_visible: true, geometry: { type: 'Point', coordinates: [10, 59] }, properties: null, updated_at: null }
const selection = { kind: 'points', feature: { id: 7 } }
const tick = () => new Promise(resolve => setImmediate(resolve))

function harness(file, overrides = {}) {
  const slots = [], effects = [], editingStates = []
  let cursor = 0, confirmed = false
  const react = {
    useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = typeof value === 'function' ? value() : value; return [slots[i], next => { slots[i] = typeof next === 'function' ? next(slots[i]) : next }] },
    useEffect(fn, deps) { const i = cursor++; if (!slots[i] || deps.some((v, j) => slots[i].deps[j] !== v)) effects.push(() => { slots[i]?.cleanup?.(); slots[i] = { deps, cleanup: fn() } }) },
  }
  const jsx = (type, props) => ({ type, props })
  const modules = {
    react,
    'react/jsx-runtime': { jsx, jsxs: jsx },
    './MapObjectEditor': { default: 'Editor' },
    './MapObjectView': { default: 'View' },
    './subcomponents/ObjectMetadata': { default: 'Metadata' },
    '@/pages/main/lib/mapFilters': { pipeCategories: {} },
    '@/pages/main/hooks/useUnsavedChangesWarning': { useUnsavedChangesWarning() {} },
    '@/pages/main/Subcomponents/Drawing/GeometryButton': { default: 'GeometryButton' },
    '@/pages/main/Subcomponents/MapObject/subcomponents/StatusSelect': { default: 'StatusSelect' },
    '@/pages/main/lib/mapPointStyles': { pointTypes: {} },
    '@/pages/main/services/mapObjectService': {
      getWaterObject: async () => record,
      parseObjectProperties: JSON.parse,
      updateWaterObject: async (_kind, original, changes) => ({ ...original, ...changes }),
    },
    ...overrides,
  }
  const exports = {}
  const code = ts.transpileModule(readFileSync(new URL(`${componentPath}${file}.tsx`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  vm.runInNewContext(code, { exports, AbortController, window: { confirm: () => confirmed }, require: id => {
    assert.ok(modules[id], `Unexpected import: ${id}`)
    return 'default' in modules[id] ? { __esModule: true, ...modules[id] } : modules[id]
  } })
  const props = { selection, record, drawing: false, onEditingState: (...state) => editingStates.push(state), onResetGeometry() {}, onCancel() {}, onSaved() {}, onDeleted() {}, onStartDrawing() {} }
  return {
    props, editingStates,
    confirm(value) { confirmed = value },
    render() { cursor = 0; const tree = exports.default(props); while (effects.length) effects.shift()(); return tree },
    unmount() { for (const slot of slots) slot?.cleanup?.() },
  }
}
function nodes(tree) {
  if (!tree || typeof tree !== 'object') return []
  if (Array.isArray(tree)) return tree.flatMap(nodes)
  return [tree, ...nodes(tree.props?.children)]
}
const find = (tree, predicate) => nodes(tree).find(predicate)

test('details starts in view mode, cancels to view, and displays the saved record', async () => {
  const h = harness('MapObjectDetails')
  assert.equal(h.render().props.role, 'status')
  await tick()
  let tree = h.render()
  assert.equal(tree.type, 'View')
  tree.props.onEdit()
  tree = h.render()
  assert.equal(tree.type, 'Editor')
  tree.props.onCancel()
  tree = h.render()
  assert.equal(tree.type, 'View')
  tree.props.onEdit()
  const updated = { ...record, status: 'operational' }
  h.render().props.onSaved(selection, updated)
  tree = h.render()
  assert.equal(tree.type, 'View')
  assert.equal(tree.props.record, updated)
  assert.equal(tree.props.saved, true)
})

test('cancel protects dirty edits and clears drawing and editing guards only after confirmation', () => {
  const h = harness('MapObjectEditor')
  let cancelled = 0, resets = 0
  h.props.onCancel = () => cancelled++
  h.props.onResetGeometry = () => resets++
  let tree = h.render()
  find(tree, node => node.type === 'StatusSelect').props.onChange('operational')
  tree = h.render()
  const cancel = find(tree, node => node.type === 'button' && node.props.onClick?.name === 'cancel')
  cancel.props.onClick()
  assert.equal(cancelled, 0)
  h.confirm(true)
  cancel.props.onClick()
  assert.equal(cancelled, 1)
  assert.equal(resets, 1)
  assert.deepEqual(h.editingStates.at(-1), [false, false])
})

test('save retains the draft on failure and returns the updated record on success', async () => {
  let fail = true, saved
  const h = harness('MapObjectEditor', {
    '@/pages/main/services/mapObjectService': {
      parseObjectProperties: JSON.parse,
      updateWaterObject: async (_kind, original, changes) => {
        if (fail) throw new Error('Network failure')
        return { ...original, ...changes }
      },
    },
  })
  h.props.onSaved = (_selection, updated) => { saved = updated }
  find(h.render(), node => node.type === 'StatusSelect').props.onChange('operational')
  await find(h.render(), node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  let tree = h.render()
  assert.ok(find(tree, node => node.props.role === 'alert'))
  assert.equal(find(tree, node => node.type === 'StatusSelect').props.value, 'operational')
  assert.equal(saved, undefined)
  fail = false
  await find(tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.equal(saved.status, 'operational')
  assert.deepEqual(h.editingStates.at(-1), [false, false])
})

test('late object responses are ignored when the selected panel unmounts', async () => {
  let resolve, signal
  const h = harness('MapObjectDetails', {
    '@/pages/main/services/mapObjectService': { getWaterObject: (_kind, _id, receivedSignal) => {
      signal = receivedSignal
      return new Promise(done => { resolve = done })
    } },
  })
  h.render()
  h.unmount()
  assert.equal(signal.aborted, true)
  resolve(record)
  await tick()
  assert.equal(h.render().props.role, 'status')
})


test('comment edits are saved independently of JSON properties and can be cleared', async () => {
  const h = harness('MapObjectEditor')
  h.props.record = { ...record, comment: 'Existing comment' }
  let saved
  h.props.onSaved = (_selection, updated) => { saved = updated }
  let tree = h.render()
  const commentField = () => find(tree, node => node.props.id === 'water-object-comment')
  assert.equal(commentField().props.value, 'Existing comment')
  commentField().props.onChange({ target: { value: 'New comment' } })
  tree = h.render()
  await find(tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.equal(saved.comment, 'New comment')
  assert.equal(saved.properties, null)
  tree = h.render()
  commentField().props.onChange({ target: { value: '' } })
  tree = h.render()
  await find(tree, node => node.type === 'form').props.onSubmit({ preventDefault() {} })
  assert.equal(saved.comment, null)
  assert.equal(Object.hasOwn(saved, 'pipe_type'), false)
})
