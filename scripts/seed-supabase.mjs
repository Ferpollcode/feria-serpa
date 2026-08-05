import "dotenv/config";
import { createClient } from "@supabase/supabase-js";
import { createDemoState, normalizeState } from "../src/utils.js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Faltan VITE_SUPABASE_URL o VITE_SUPABASE_ANON_KEY en .env");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);
const state = normalizeState(createDemoState());

async function tableExists(table) {
  const { error } = await supabase.from(table).select("id").limit(1);
  return !error;
}

async function replaceRows(table, rows) {
  const syncBatch = crypto.randomUUID();
  const nextRows = rows.map((row) => ({ ...row, sync_batch: syncBatch }));
  if (nextRows.length) {
    const { error } = await supabase.from(table).upsert(nextRows);
    if (error) throw error;
  }
  const { error } = await supabase.from(table).delete().neq("sync_batch", syncBatch);
  if (error) throw error;
}

async function seedNormalized() {
  await replaceRows("app_users", state.users.map((user) => ({
    username: user.username,
    role: user.role,
    allowed_views: user.allowedViews || [],
    data: user,
  })));

  await replaceRows("puestos", state.puestos.map((puesto) => ({
    id: puesto.id,
    sector: puesto.sector,
    numero: Number(puesto.numero),
    ocupacion: puesto.ocupacion,
    pago: puesto.pago,
    updated_at: puesto.updatedAt || new Date().toISOString(),
    data: puesto,
  })));

  await replaceRows("payments", state.payments.map((payment) => ({
    id: payment.id,
    puesto_id: payment.puestoId || "",
    sector: payment.sector || "",
    numero: Number(payment.numero || 0),
    amount: Number(payment.amount || 0),
    date: payment.date || new Date().toISOString(),
    data: payment,
  })));

  await replaceRows("expenses", state.expenses.map((expense) => ({
    id: expense.id,
    category: expense.category || "",
    amount: Number(expense.amount || 0),
    date: expense.date || new Date().toISOString(),
    data: expense,
  })));

  await replaceRows("cars", state.cars.map((car) => ({
    id: car.id,
    plate: car.plate || "",
    entry_user: car.entryUser || "",
    amount: Number(car.amount || 0),
    date: car.date || new Date().toISOString(),
    exited_at: car.exitedAt || null,
    data: car,
  })));

  await replaceRows("car_audit", state.carAudit.map((audit) => ({
    id: audit.id,
    action: audit.action || "",
    entity_id: audit.carId || audit.id || "",
    user_name: audit.user || "",
    date: audit.date || new Date().toISOString(),
    data: audit,
  })));

  await replaceRows("audit_logs", state.auditLogs.map((audit) => ({
    id: audit.id,
    action: audit.action || "",
    entity: audit.entity || "",
    entity_id: audit.entityId || "",
    user_name: audit.user || "",
    date: audit.date || new Date().toISOString(),
    data: audit,
  })));
}

async function seedLegacy() {
  const { error } = await supabase.from("app_state").upsert({
    key: "feria-serpa",
    data: state,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

try {
  if (await tableExists("puestos")) {
    await seedNormalized();
    console.log(`Estado normalizado guardado: ${state.users.length} usuarios, ${state.puestos.length} puestos.`);
  } else {
    await seedLegacy();
    console.log(`Estado legacy guardado: ${state.users.length} usuarios, ${state.puestos.length} puestos.`);
  }
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
