const $ = (id) => document.getElementById(id);
let shipments = [];
let orders = [];
let impacts = null;
let toastTimer;

function actorHeaders() {
  const role = $('roleSelect').value;
  const ids = {
    operations_analyst: 'demo-analyst',
    supply_chain_manager: 'demo-manager',
    warehouse_operator: 'demo-warehouse-operator',
    procurement_approver: 'demo-procurement-approver',
    administrator: 'demo-admin',
    auditor: 'demo-auditor',
  };
  return { 'X-User-Role': role, 'X-User-Id': ids[role] || 'demo-user' };
}

async function api(path, options = {}) {
  const response = await fetch(path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...actorHeaders(), ...(options.headers || {}) },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.detail || `Request failed (${response.status})`);
  return data;
}

function notify(message) {
  const toast = $('toast');
  toast.textContent = message;
  toast.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('show'), 3500);
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}

function dateLabel(value) {
  if (!value) return '—';
  return new Date(value).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function bandClass(band) { return `band band-${String(band || 'low').toLowerCase()}`; }

async function loadDashboard() {
  const data = await api('/api/v1/dashboard');
  $('mDisruptions').textContent = data.active_disruptions;
  $('mAffected').textContent = data.affected_orders;
  $('mCritical').textContent = data.critical_orders;
  $('mOrders').textContent = data.open_orders;
  $('riskRows').innerHTML = data.top_risks.length ? data.top_risks.map(row => `
    <tr>
      <td><span class="customer">${esc(row.customer_name)}</span><span class="subcell">Order #${row.order_id} · ${esc(row.sku)}</span></td>
      <td class="priority">${esc(row.priority.replace('_',' ').toUpperCase())}</td>
      <td>${row.exposed_units} units</td>
      <td class="score">${row.risk.score}</td>
      <td><span class="${bandClass(row.risk.band)}">${esc(row.risk.band)}</span></td>
      <td><button class="text-link" data-order="${row.order_id}">Create plan →</button></td>
    </tr>`).join('') : '<tr><td colspan="6" class="empty">No affected orders currently ranked.</td></tr>';
  document.querySelectorAll('[data-order]').forEach(btn => btn.addEventListener('click', () => {
    $('planOrderSelect').value = btn.dataset.order;
    $('planDescription').focus();
  }));
  $('eventList').innerHTML = data.recent_events.length ? data.recent_events.map(event => `
    <div class="event-item"><div class="event-dot"></div><div><div class="event-title">${esc(event.event_type)} · Shipment #${event.shipment_id}</div><div class="event-detail">${esc(event.source)} / ${esc(event.event_id)} · ${event.delay_days} day delay</div><div class="event-detail">${esc(event.processing_status)}</div></div><div class="event-time">${dateLabel(event.received_at)}</div></div>`).join('') : '<div class="empty">No carrier events received.</div>';
}

async function loadReferenceData() {
  [shipments, orders] = await Promise.all([api('/api/v1/shipments'), api('/api/v1/orders')]);
  $('shipmentSelect').innerHTML = shipments.map(s => `<option value="${s.id}">#${s.id} · ${esc(s.sku)} · ${esc(s.status)}</option>`).join('');
  $('planOrderSelect').innerHTML = orders.map(o => `<option value="${o.id}">#${o.id} · ${esc(o.customer_name)}</option>`).join('');
  const inventory = await api('/api/v1/inventory');
  $('inventoryRows').innerHTML = inventory.map(row => `<tr><td>${esc(row.sku)}</td><td>${esc(row.warehouse)}</td><td><strong>${row.usable}</strong></td></tr>`).join('');
}

async function loadPlans() {
  const plans = await api('/api/v1/plans');
  $('planRows').innerHTML = plans.length ? plans.map(plan => {
    const role = $('roleSelect').value;
    const canSubmit = role === 'operations_analyst' && plan.status === 'draft' && plan.created_by === 'demo-analyst';
    const canApprove = (plan.action === 'alternative_supplier' ? role === 'procurement_approver' : role === 'supply_chain_manager') && plan.status === 'submitted' && plan.created_by !== actorHeaders()['X-User-Id'];
    const canExecute = role === 'warehouse_operator' && plan.status === 'approved';
    return `<tr>
      <td><strong>#${plan.id}</strong></td><td>#${plan.order_id}</td><td>${esc(plan.action.replaceAll('_',' '))}</td>
      <td>${esc(plan.created_by)}</td><td><span class="status">${esc(plan.status)}</span></td><td>v${plan.version}</td>
      <td>${canSubmit ? `<button class="workflow-btn" data-submit="${plan.id}">Submit</button>` : ''}
          ${canApprove ? `<button class="workflow-btn" data-approve="${plan.id}" data-version="${plan.version}">Approve</button>` : ''}
          ${canExecute ? `<button class="workflow-btn" data-execute="${plan.id}">Execute</button>` : ''}
          ${!canSubmit && !canApprove && !canExecute ? '<span class="analysis-muted">—</span>' : ''}</td>
    </tr>`;
  }).join('') : '<tr><td colspan="7" class="empty">No recovery plans yet. Create a draft from an impacted order.</td></tr>';
  document.querySelectorAll('[data-submit]').forEach(btn => btn.addEventListener('click', () => submitPlan(btn.dataset.submit)));
  document.querySelectorAll('[data-approve]').forEach(btn => btn.addEventListener('click', () => approvePlan(btn.dataset.approve, Number(btn.dataset.version))));
  document.querySelectorAll('[data-execute]').forEach(btn => btn.addEventListener('click', () => executePlan(btn.dataset.execute)));
}

async function refreshAll() {
  try {
    await Promise.all([loadDashboard(), loadReferenceData(), loadPlans()]);
  } catch (error) { notify(error.message); }
}

async function simulateDelay() {
  try {
    if (!shipments.length) await loadReferenceData();
    const shipment = shipments.find(s => s.id === Number($('shipmentSelect').value)) || shipments[0];
    const result = await fetch('/api/v1/webhooks/carriers/simulated', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Webhook-Token': 'dev-webhook-token' },
      body: JSON.stringify({ source: 'demo-carrier', event_id: `ui-event-${Date.now()}`,
        shipment_id: shipment.id, event_type: 'DELAY', delay_days: 3, sequence_no: shipment.event_sequence + 1 })
    });
    const data = await result.json();
    if (!result.ok) throw new Error(data.detail || 'Could not ingest event');
    notify(data.ignored ? 'Event received but ignored as out of order.' : 'Carrier event processed. Shipment status updated.');
    await refreshAll();
    await runAnalysis();
  } catch (error) { notify(error.message); }
}

async function runAnalysis() {
  try {
    const id = $('shipmentSelect').value;
    if (!id) return notify('No shipment selected.');
    impacts = await api(`/api/v1/analysis/shipments/${id}`, { method: 'POST' });
    $('analysisResult').innerHTML = `
      <div class="analysis-summary">
        <span class="summary-pill">Shipment #${impacts.shipment_id} · ${esc(impacts.shipment_status)}</span>
        <span class="summary-pill">SKU ${esc(impacts.sku)}</span>
        <span class="summary-pill">Usable inventory ${impacts.usable_inventory_units}</span>
        <span class="summary-pill">Exposed units ${impacts.total_exposed_units}</span>
      </div>
      ${impacts.orders.length ? impacts.orders.map(row => `<div class="analysis-row">
        <div><div class="analysis-name">${esc(row.customer_name)} · #${row.order_id}</div><div class="analysis-muted">${esc(row.sku)} · SLA ${dateLabel(row.sla_deadline)}</div></div>
        <div><strong>${row.exposed_units} exposed</strong><div class="analysis-muted">${row.usable_stock_allocated} stock allocated</div></div>
        <div class="score">${row.risk.score}</div>
        <div><span class="${bandClass(row.risk.band)}">${esc(row.risk.band)}</span></div>
      </div>`).join('') : '<div class="analysis-placeholder">No order-line exposure found for this shipment with current demo data.</div>'}
      <div class="note">${esc(impacts.method)} This is an indicative prototype calculation, not an optimizer result.</div>`;
    if (impacts.orders.length) $('planOrderSelect').value = impacts.orders[0].order_id;
  } catch (error) { notify(error.message); }
}

async function createPlan() {
  try {
    const plan = await api('/api/v1/plans', { method: 'POST', body: JSON.stringify({
      order_id: Number($('planOrderSelect').value), action: $('planActionSelect').value,
      description: $('planDescription').value.trim()
    }) });
    notify(`Draft recovery plan #${plan.id} created.`);
    await loadPlans();
  } catch (error) { notify(error.message); }
}

async function submitPlan(id) {
  try { await api(`/api/v1/plans/${id}/submit`, { method: 'POST' }); notify(`Plan #${id} submitted for approval.`); await loadPlans(); }
  catch (error) { notify(error.message); }
}
async function approvePlan(id, version) {
  try { await api(`/api/v1/plans/${id}/approve`, { method: 'POST', body: JSON.stringify({ expected_version: version, comment: 'Approved in demo control tower.' }) }); notify(`Plan #${id} approved.`); await loadPlans(); }
  catch (error) { notify(error.message); }
}
async function executePlan(id) {
  try { await api(`/api/v1/plans/${id}/execute`, { method: 'POST' }); notify(`Plan #${id} marked executed.`); await loadPlans(); }
  catch (error) { notify(error.message); }
}

$('refreshBtn').addEventListener('click', refreshAll);
$('simulateBtn').addEventListener('click', simulateDelay);
$('analyzeBtn').addEventListener('click', runAnalysis);
$('createPlanBtn').addEventListener('click', createPlan);
$('roleSelect').addEventListener('change', loadPlans);
refreshAll().then(runAnalysis);
