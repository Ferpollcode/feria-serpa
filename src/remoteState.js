import { supabase } from "./supabaseClient.js";
import { normalizeState } from "./utils.js";

const legacyStateTable = "app_state";
const legacyStateKey = "feria-serpa";

const rowTables = {
  users: "app_users",
  puestos: "puestos",
  payments: "payments",
  expenses: "expenses",
  cars: "cars",
  carAudit: "car_audit",
  auditLogs: "audit_logs",
};

function orderedByDateDesc(items) {
  return [...items].sort((a, b) => new Date(b.date || b.updatedAt || 0) - new Date(a.date || a.updatedAt || 0));
}

function fromRows(rows) {
  return rows.map((row) => row.data || row);
}

function getRowId(item, fallbackPrefix, index) {
  return item.id || item.username || `${fallbackPrefix}-${index}`;
}

async function tableExists(table) {
  const { error } = await supabase.from(table).select("id").limit(1);
  return !error;
}

async function loadNormalizedState() {
  const [
    users,
    puestos,
    payments,
    expenses,
    cars,
    carAudit,
    auditLogs,
  ] = await Promise.all([
    supabase.from(rowTables.users).select("data").order("username"),
    supabase.from(rowTables.puestos).select("data").order("sector").order("numero"),
    supabase.from(rowTables.payments).select("data").order("date", { ascending: false }),
    supabase.from(rowTables.expenses).select("data").order("date", { ascending: false }),
    supabase.from(rowTables.cars).select("data").order("date", { ascending: false }),
    supabase.from(rowTables.carAudit).select("data").order("date", { ascending: false }),
    supabase.from(rowTables.auditLogs).select("data").order("date", { ascending: false }),
  ]);

  const error = [users, puestos, payments, expenses, cars, carAudit, auditLogs].find((result) => result.error)?.error;
  if (error) throw error;

  return normalizeState({
    users: fromRows(users.data || []),
    puestos: fromRows(puestos.data || []),
    payments: fromRows(payments.data || []),
    expenses: fromRows(expenses.data || []),
    cars: fromRows(cars.data || []),
    carAudit: fromRows(carAudit.data || []),
    auditLogs: fromRows(auditLogs.data || []),
  });
}

async function replaceRows(table, items, mapRow) {
  const syncBatch = crypto.randomUUID();
  const rows = items.map((item, index) => ({
    ...mapRow(item, index),
    sync_batch: syncBatch,
  }));

  if (rows.length) {
    const { error } = await supabase.from(table).upsert(rows);
    if (error) throw error;
  }

  const { error } = await supabase.from(table).delete().neq("sync_batch", syncBatch);
  if (error) throw error;
}

async function saveNormalizedState(state) {
  const normalized = normalizeState(state);

  await replaceRows(rowTables.users, normalized.users, (user) => ({
    username: user.username,
    role: user.role,
    allowed_views: user.allowedViews || [],
    data: user,
  }));

  await replaceRows(rowTables.puestos, normalized.puestos, (puesto) => ({
    id: puesto.id,
    sector: puesto.sector,
    numero: Number(puesto.numero),
    ocupacion: puesto.ocupacion,
    pago: puesto.pago,
    updated_at: puesto.updatedAt || new Date().toISOString(),
    data: puesto,
  }));

  await replaceRows(rowTables.payments, orderedByDateDesc(normalized.payments), (payment, index) => ({
    id: getRowId(payment, "payment", index),
    puesto_id: payment.puestoId || "",
    sector: payment.sector || "",
    numero: Number(payment.numero || 0),
    amount: Number(payment.amount || 0),
    date: payment.date || new Date().toISOString(),
    data: payment,
  }));

  await replaceRows(rowTables.expenses, orderedByDateDesc(normalized.expenses), (expense, index) => ({
    id: getRowId(expense, "expense", index),
    category: expense.category || "",
    amount: Number(expense.amount || 0),
    date: expense.date || new Date().toISOString(),
    data: expense,
  }));

  await replaceRows(rowTables.cars, orderedByDateDesc(normalized.cars), (car, index) => ({
    id: getRowId(car, "car", index),
    plate: car.plate || "",
    entry_user: car.entryUser || "",
    amount: Number(car.amount || 0),
    date: car.date || new Date().toISOString(),
    exited_at: car.exitedAt || null,
    data: car,
  }));

  await replaceRows(rowTables.carAudit, orderedByDateDesc(normalized.carAudit), (audit, index) => ({
    id: getRowId(audit, "car-audit", index),
    action: audit.action || "",
    entity_id: audit.carId || audit.id || "",
    user_name: audit.user || "",
    date: audit.date || new Date().toISOString(),
    data: audit,
  }));

  await replaceRows(rowTables.auditLogs, orderedByDateDesc(normalized.auditLogs), (audit, index) => ({
    id: getRowId(audit, "audit", index),
    action: audit.action || "",
    entity: audit.entity || "",
    entity_id: audit.entityId || "",
    user_name: audit.user || "",
    date: audit.date || new Date().toISOString(),
    data: audit,
  }));
}

async function loadLegacyState(localState) {
  const normalizedLocalState = normalizeState(localState);
  const { data, error } = await supabase
    .from(legacyStateTable)
    .select("data")
    .eq("key", legacyStateKey)
    .maybeSingle();

  if (error) throw error;

  if (data?.data) {
    const remoteState = normalizeState(data.data);
    if (JSON.stringify(remoteState) !== JSON.stringify(data.data)) await saveLegacyState(remoteState);
    return { state: remoteState, source: "supabase" };
  }

  await saveLegacyState(normalizedLocalState);
  return { state: normalizedLocalState, source: "local-seeded" };
}

async function saveLegacyState(state) {
  const { error } = await supabase.from(legacyStateTable).upsert({
    key: legacyStateKey,
    data: normalizeState(state),
    updated_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function loadRemoteState(localState) {
  const normalizedLocalState = normalizeState(localState);
  if (!supabase) return { state: normalizedLocalState, source: "local" };

  if (await tableExists(rowTables.puestos)) {
    const normalizedState = await loadNormalizedState();
    const hasRows = normalizedState.puestos.length || normalizedState.payments.length || normalizedState.cars.length;
    if (hasRows) return { state: normalizedState, source: "supabase-normalized" };
    try {
      const legacy = await loadLegacyState(normalizedLocalState);
      await saveNormalizedState(legacy.state);
      return { state: legacy.state, source: "normalized-migrated" };
    } catch {
      // If the legacy table is not available, seed the normalized tables from the local state.
    }
    await saveNormalizedState(normalizedLocalState);
    return { state: normalizedLocalState, source: "normalized-seeded" };
  }

  return loadLegacyState(normalizedLocalState);
}

export async function saveRemoteState(state) {
  if (!supabase) return;

  if (await tableExists(rowTables.puestos)) {
    await saveNormalizedState(state);
    return;
  }

  await saveLegacyState(state);
}

export function subscribeToRemoteState(onState) {
  if (!supabase) return () => {};

  let isUsingNormalizedState = false;
  tableExists(rowTables.puestos).then((exists) => {
    isUsingNormalizedState = exists;
  });

  const normalizedChannel = supabase
    .channel("normalized-app-state")
    .on("postgres_changes", { event: "*", schema: "public", table: rowTables.puestos }, async () => {
      if (!isUsingNormalizedState) return;
      onState(await loadNormalizedState());
    })
    .on("postgres_changes", { event: "*", schema: "public", table: rowTables.payments }, async () => {
      if (!isUsingNormalizedState) return;
      onState(await loadNormalizedState());
    })
    .on("postgres_changes", { event: "*", schema: "public", table: rowTables.cars }, async () => {
      if (!isUsingNormalizedState) return;
      onState(await loadNormalizedState());
    })
    .subscribe();

  const legacyChannel = supabase
    .channel("legacy-app-state")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: legacyStateTable, filter: `key=eq.${legacyStateKey}` },
      (payload) => {
        if (isUsingNormalizedState) return;
        if (payload.new?.data) onState(normalizeState(payload.new.data));
      },
    )
    .subscribe();

  return () => {
    supabase.removeChannel(normalizedChannel);
    supabase.removeChannel(legacyChannel);
  };
}
