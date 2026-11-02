// 预算计数器模拟测试（纯计算，不调 API）
// 规则：used + reserved + newReserve > LIMIT 时拒绝；等于时允许但标记边界

const LIMIT = 20;

class Budget {
  constructor(limit) {
    this.limit = limit;
    this.used = 0;
    this.reservations = new Map(); // id -> amount
    this.log = [];
  }

  reservedTotal() {
    let s = 0;
    for (const v of this.reservations.values()) s += v;
    return s;
  }

  canSpend(id, reserve) {
    if (this.reservations.has(id)) return { allowed: false, reason: 'duplicate id' };
    const reserved = this.reservedTotal();
    const total = this.used + reserved + reserve;
    if (total > this.limit) {
      return { allowed: false, reason: `projected ${total} > limit ${this.limit}` };
    }
    return { allowed: true, boundary: total === this.limit, projected: total };
  }

  reserve(id, amount) {
    const check = this.canSpend(id, amount);
    if (!check.allowed) {
      this.log.push({ id, action: 'rejected', reason: check.reason });
      return check;
    }
    this.reservations.set(id, amount);
    this.log.push({ id, action: 'reserved', amount, boundary: check.boundary });
    return check;
  }

  settle(id, actual) {
    const amount = this.reservations.get(id);
    if (amount === undefined) return { ok: false, reason: 'no reservation' };
    this.reservations.delete(id);
    this.used += actual;
    this.log.push({ id, action: 'settled', reserved: amount, actual, released: amount - actual });
    return { ok: true, released: amount - actual, used: this.used };
  }
}

const results = [];
function test(name, fn) {
  try {
    const r = fn();
    results.push({ name, pass: r.pass, detail: r.detail });
    console.log(`${r.pass ? 'PASS' : 'FAIL'}  ${name}  ${r.detail}`);
  } catch (e) {
    results.push({ name, pass: false, detail: e.message });
    console.log(`FAIL  ${name}  ${e.message}`);
  }
}

// 1. 已使用 $5，预留 $2 → 允许
test('used=5, reserve=2 → 允许', () => {
  const b = new Budget(LIMIT);
  b.used = 5;
  const r = b.reserve('r1', 2);
  return { pass: r.allowed === true, detail: `allowed=${r.allowed} projected=${r.projected}` };
});

// 2. 已使用 $19，预留 $2 → 拒绝
test('used=19, reserve=2 → 拒绝', () => {
  const b = new Budget(LIMIT);
  b.used = 19;
  const r = b.reserve('r2', 2);
  return { pass: r.allowed === false, detail: `allowed=${r.allowed} reason=${r.reason}` };
});

// 3. 已使用 $18，预留 $2 → 边界（允许，标记 boundary）
test('used=18, reserve=2 → 边界允许', () => {
  const b = new Budget(LIMIT);
  b.used = 18;
  const r = b.reserve('r3', 2);
  return { pass: r.allowed === true && r.boundary === true, detail: `allowed=${r.allowed} boundary=${r.boundary} projected=${r.projected}` };
});

// 4. 请求结束，实际费用低于预留 → 释放差额
test('settle: reserved=2, actual=0.8 → 释放 1.2', () => {
  const b = new Budget(LIMIT);
  b.reserve('r4', 2);
  const s = b.settle('r4', 0.8);
  return { pass: s.ok && Math.abs(s.released - 1.2) < 1e-9 && Math.abs(b.used - 0.8) < 1e-9,
    detail: `released=${s.released} used=${b.used}` };
});

// 5. 已达到 $20 → 禁止新请求
test('used=20, reserve=0.5 → 拒绝', () => {
  const b = new Budget(LIMIT);
  b.used = 20;
  const r = b.reserve('r5', 0.5);
  return { pass: r.allowed === false, detail: `allowed=${r.allowed} reason=${r.reason}` };
});

// 6. 多次预留累积超限 → 第二次拒绝
test('reserve 10 + reserve 12 → 第二次拒绝', () => {
  const b = new Budget(LIMIT);
  const r1 = b.reserve('a', 10);
  const r2 = b.reserve('b', 12);
  return { pass: r1.allowed === true && r2.allowed === false, detail: `first=${r1.allowed} second=${r2.allowed}` };
});

// 7. 拦截发生在发送前（模拟：canSpend=false 时不调用 API）
test('超预算时 API 未被调用', () => {
  const b = new Budget(LIMIT);
  b.used = 19.5;
  let apiCalled = false;
  const check = b.canSpend('x', 2);
  if (check.allowed) { apiCalled = true; }
  return { pass: apiCalled === false, detail: `allowed=${check.allowed} apiCalled=${apiCalled}` };
});

// 8. 预留后重复同一 id → 拒绝（防止断点恢复重复扣费）
test('重复 id 预留 → 拒绝', () => {
  const b = new Budget(LIMIT);
  b.reserve('dup', 1);
  const r = b.reserve('dup', 1);
  return { pass: r.allowed === false, detail: `allowed=${r.allowed} reason=${r.reason}` };
});

const passed = results.filter(r => r.pass).length;
console.log(`\n${passed}/${results.length} passed`);
