const assert = require('node:assert/strict')
const { readFileSync } = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const { test } = require('node:test')

const headers = [
  'Timestamp', 'Supplier', 'Product Name', 'Product Code', 'Quantity', 'Price',
  'Category', 'Buy Unit', 'Buy Unit Size', 'Total', 'Account', 'Outlet',
  'Username', 'Purchase ID', 'Payment', 'Expiry Date', 'Mode', '', 'PSTATUS', 'RQUANTITY',
]

function row(patch = {}) {
  const values = {
    Timestamp: new Date('2026-11-16T03:00:00Z'), Supplier: 'Supplier',
    'Product Name': 'Rice', 'Product Code': 'RICE', Quantity: 2, Price: 100,
    'Buy Unit': 'kg', Total: 200, Account: 'Ingredients', Outlet: 'Main',
    Username: 'operator', 'Purchase ID': 'purchase-1', Payment: 'Cash',
    PSTATUS: 'ORDERED', RQUANTITY: 0, ...patch,
  }
  return headers.map((header) => values[header] ?? '')
}

function backend(rows, options = {}) {
  let reads = 0
  const logs = []
  const session = options.session ?? { username: 'operator', outlet: 'Main', allowedTabs: ['purchasing'] }
  const context = vm.createContext({
    Date, Map,
    SHEETS: { PURCHASES: 'Purchases' },
    Logger: { log: (message) => logs.push(message) },
    Session: { getScriptTimeZone: () => 'Asia/Jakarta' },
    getUserSessionEnhanced: (deviceId, username) =>
      deviceId === 'test-device' && username === 'operator' ? session : null,
    Utilities: {
      getUuid: () => 'test-request',
      formatDate(date, timeZone, format) {
        const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', {
          timeZone, year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
        }).formatToParts(date).map((part) => [part.type, part.value]))
        if (format === 'yyyy-MM-dd') return `${parts.year}-${parts.month}-${parts.day}`
        if (format === 'dd/MM/yyyy') return `${parts.day}/${parts.month}/${parts.year}`
        if (format === 'MM/dd/yyyy') return `${parts.month}/${parts.day}/${parts.year}`
        if (format === 'HH:mm') return `${parts.hour}:${parts.minute}`
        throw new Error(`Unexpected date format: ${format}`)
      },
      parseDate(value, timeZone, format) {
        assert.equal(timeZone, 'Asia/Jakarta')
        if (format === 'dd-MM-yyyy HH:mm:ss' && /^\d{2}-\d{2}-\d{4} \d{2}:\d{2}:\d{2}$/.test(value)) {
          const [date, time] = value.split(' ')
          const [day, month, year] = date.split('-')
          return new Date(`${year}-${month}-${day}T${time}+07:00`)
        }
        throw new Error('Unsupported date format in test')
      },
    },
    ContentService: {
      MimeType: { JSON: 'application/json' },
      createTextOutput: (text) => ({ setMimeType: () => JSON.parse(text) }),
    },
  })
  for (const file of ['utils.js', 'accessControl.js', 'repo.gs', 'reportingWorker.gs', 'orchestrator.gs', 'apiRouter.gs']) {
    vm.runInContext(readFileSync(path.join(__dirname, '..', 'apps-script-source', file), 'utf8'), context, { filename: file })
  }
  context.Repo.adapter = {
    getValues(name) {
      reads++
      assert.equal(name, 'Purchases')
      if (options.readError) throw new Error('Database unavailable')
      return options.missing ? [] : [options.headers ?? headers, ...rows]
    },
  }
  context.WorkflowLog.record = () => {}
  context.ErrorHandler = {
    wrap(step, run) {
      try { return run() } catch (error) {
        logs.push(`${step}: ${error.message}`)
        return context.apiFail(error.message, 'TEST_ERROR')
      }
    },
  }
  function request(payload = {}, auth = { username: 'operator', deviceId: 'test-device', outlet: 'Forged' }) {
    return context.doPost({ postData: { contents: JSON.stringify({
      eventType: 'purchase.history.requested', payload: { ...payload, _authContext: auth },
    }) } })
  }
  return { request, reads: () => reads, logs, context }
}

function data(result) {
  assert.equal(result.success, true, result.error)
  const step = result.data.steps.purchaseHistory
  assert.equal(step.success, true, step.error)
  return step.data
}

test('JSON endpoint returns all historical statuses and local lines for the authenticated outlet only', () => {
  const app = backend([
    row({ Timestamp: new Date('2020-01-01T00:00:00Z') }),
    row({ PSTATUS: 'RECEIVED', RQUANTITY: 1 }),
    row({ Mode: 'L', 'Product Name': 'Local item', 'Product Code': '' }),
    row({ Outlet: 'Other' }),
    row({ Outlet: '' }),
    headers.map(() => ''),
  ])
  const result = data(app.request({ outlet: 'Other' }))
  assert.equal(result.count, 3)
  assert.equal(result.total, 600)
  assert.equal(result.groups.length, 1)
  assert.deepEqual(result.groups[0].rows.map((r) => r.rowIndex), [4, 3, 2])
  assert.equal(result.groups[0].rows[1].pstatus, 'RECEIVED')
  assert.equal(result.groups[0].rows[1].rquantity, 1)
  assert.equal(result.groups[0].rows[0].outlet, 'Main')
  assert.equal(result.groups[0].rows[0].account, 'Ingredients')
  assert.equal(app.reads(), 1)
})

test('product groups retain every line and separate codes and buying units', () => {
  const app = backend([
    row(),
    row({ Total: -20, Price: -10 }),
    row({ 'Product Code': 'RICE-2' }),
    row({ 'Buy Unit': 'bag' }),
    row({ 'Product Name': 'Apple', 'Product Code': 'APPLE' }),
  ])
  const result = data(app.request({ groupBy: 'product' }))
  assert.equal(result.count, 5)
  assert.equal(result.total, 780)
  assert.equal(result.groups.length, 4)
  assert.equal(result.groups[0].product, 'Apple')
  const rice = result.groups.find((g) => g.code === 'RICE' && g.unit === 'kg')
  assert.equal(rice.rows.length, 2)
  assert.equal(rice.total, 180)
})

test('weekly groups use Monday in Jakarta, not the UTC or device weekday', () => {
  const result = data(backend([
    row({ Timestamp: new Date('2026-11-15T16:59:59Z') }),
    row({ Timestamp: new Date('2026-11-15T17:00:00Z') }),
    row({ Timestamp: new Date('2026-11-22T16:59:59Z') }),
  ]).request({ groupBy: 'week' }))
  assert.deepEqual(result.groups.map((g) => [g.weekStart, g.rows.length, g.total]), [
    ['2026-11-16', 2, 400], ['2026-11-09', 1, 200],
  ])
})

test('weekly grouping handles year boundaries and legacy text timestamps', () => {
  const result = data(backend([
    row({ Timestamp: new Date('2027-01-01T00:00:00Z') }),
    row({ Timestamp: '28-12-2026 10:00:00' }),
  ]).request({ groupBy: 'week' }))
  assert.equal(result.groups.length, 1)
  assert.equal(result.groups[0].weekStart, '2026-12-28')
  assert.equal(result.count, 2)
})

test('undated purchases remain visible in an unknown-week group', () => {
  const result = data(backend([row({ Timestamp: '' }), row({ Timestamp: 'invalid' })]).request({ groupBy: 'week' }))
  assert.equal(result.count, 2)
  assert.equal(result.groups[0].weekStart, '')
})

test('empty history returns a valid empty result', () => {
  assert.deepEqual(data(backend([]).request()), { groups: [], count: 0, total: 0 })
})

test('reads selectingPayment and falls back to Payment when empty or absent', () => {
  const paymentHeaders = [...headers, '_selectingPayment']
  const result = data(backend([
    [...row({ Payment: 'Cash' }), 'Bank Transfer'],
    [...row({ Payment: 'Cash' }), ''],
  ], { headers: paymentHeaders }).request())
  assert.deepEqual(result.groups[0].rows.map((r) => r.payment), ['Cash', 'Bank Transfer'])
  assert.equal(data(backend([row()]).request()).groups[0].rows[0].payment, 'Cash')
  const legacyHeaders = headers.map((h) => h === 'Payment' ? '_selectingPayment' : h)
  assert.equal(data(backend([row()], { headers: legacyHeaders }).request()).groups[0].rows[0].payment, 'Cash')
})

test('column filters combine across groups and totals include matching purchases only', () => {
  const app = backend([
    row({ Payment: 'Cash', Total: 200, PSTATUS: 'RECEIVED' }),
    row({ Payment: 'Card', Total: 400, Timestamp: new Date('2026-11-23T03:00:00Z') }),
    row({ Payment: 'Cash', Total: -50, Timestamp: new Date('2026-11-23T03:00:00Z'), PSTATUS: 'RECEIVED' }),
    row({ Payment: 'Cash', Total: 999, Outlet: 'Other', PSTATUS: 'RECEIVED' }),
  ])
  const result = data(app.request({ groupBy: 'week', filters: { payment: ' caSH ', pstatus: 'diterima' } }))
  assert.equal(result.count, 2)
  assert.equal(result.total, 150)
  assert.deepEqual(result.groups.map((g) => [g.weekStart, g.total]), [['2026-11-23', -50], ['2026-11-16', 200]])
  assert.deepEqual(data(app.request({ filters: { product: 'no match' } })), { groups: [], count: 0, total: 0 })
  assert.equal(data(app.request({ filters: {} })).count, 3)
})

test('date filters use Jakarta calendar dates and numeric filters match raw values', () => {
  const app = backend([
    row({ Timestamp: new Date('2026-11-15T17:00:00Z'), Quantity: 12.5 }),
    row({ Timestamp: new Date('2026-11-15T16:59:59Z'), Quantity: 2 }),
  ])
  for (const date of ['2026-11-16', '16/11/2026', '11/16/2026', '00:00']) {
    assert.equal(data(app.request({ filters: { date, qty: '12.5' } })).count, 1)
  }
})

test('rejects invalid filters before reading data', () => {
  const app = backend([row()])
  assert.match(app.request({ filters: { outlet: 'Other' } }).error, /Invalid purchasing history filter/)
  assert.match(app.request({ filters: { qty: 123 } }).error, /Invalid purchasing history filter/)
  assert.equal(app.reads(), 0)
})

test('requires a valid authenticated session before reading data', () => {
  const app = backend([row()])
  assert.equal(app.request({}, {}).success, false)
  assert.equal(app.request({}, { username: 'operator', deviceId: 'wrong' }).success, false)
  assert.equal(app.reads(), 0)
})

test('enforces purchasing permissions, including the Local Buy screen', () => {
  const denied = backend([row()], { session: { username: 'operator', outlet: 'Main', allowedTabs: ['orders'] } })
  assert.equal(denied.request().success, false)
  assert.equal(denied.request({ local: true }).success, false)
  assert.equal(denied.reads(), 0)
  const local = backend([row()], { session: { username: 'operator', outlet: 'Main', allowedTabs: ['purchasingLocal'] } })
  assert.equal(local.request().success, false)
  assert.equal(data(local.request({ local: true })).count, 1)
})

test('rejects missing outlet and invalid grouping without reading purchases', () => {
  const noOutlet = backend([row()], { session: { username: 'operator', allowedTabs: ['purchasing'] } })
  assert.match(noOutlet.request().error, /Outlet is required/)
  assert.equal(noOutlet.reads(), 0)
  const invalid = backend([row()])
  assert.match(invalid.request({ groupBy: 'invalid' }).error, /Invalid.*grouping/)
  assert.equal(invalid.reads(), 0)
})

test('missing sheet and database failures surface errors, not empty success', () => {
  assert.match(backend([], { missing: true }).request().error, /missing or has no headers/)
  assert.match(backend([], { readError: true }).request().error, /Database unavailable/)
})
