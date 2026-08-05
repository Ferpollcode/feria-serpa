import { navItems, sectorRanges, sectors, users } from "./data.js";

export const stateKey = "feria-nicolas-serpa-react-v1";
export const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function getPuestoId(sector, numero) {
  return `${sector}-${numero}`;
}

export function fullName(puesto) {
  return `${puesto.nombre || ""} ${puesto.apellido || ""}`.trim();
}

export function comparePuestos(a, b) {
  const sectorDiff = sectors.indexOf(a.sector) - sectors.indexOf(b.sector);
  return sectorDiff || Number(a.numero) - Number(b.numero);
}

export function defaultPuestoAmount(sector) {
  if (sector === "Sector Verdura") return 35000;
  if (sector === "Sector Rojo") return 22000;
  return 28000;
}

export function makeRecord(category, detail, amount, extras = {}) {
  return {
    id: crypto.randomUUID(),
    category,
    detail,
    amount: Number(amount || 0),
    date: new Date().toISOString(),
    provider: "",
    method: "Efectivo",
    receipt: "",
    notes: "",
    ...extras,
  };
}

export function createDemoState() {
  const puestos = [];
  sectorRanges.filter((range) => !range.pending).forEach(({ sector, start, end }) => {
    for (let numero = start; numero <= end; numero += 1) {
      puestos.push({
        id: getPuestoId(sector, numero),
        sector,
        numero,
        nombre: "",
        apellido: "",
        telefono: "",
        rubro: "",
        modalidad: "Mensual",
        ocupacion: "libre",
        pago: "pendiente",
        importe: defaultPuestoAmount(sector),
        updatedAt: new Date().toISOString(),
      });
    }
  });

  [
    ["Calle A Oeste", 1, "Federico", "Fernandez", "2613830142", "Ropa", "Fin de semana", "ocupado", "pagado", 15000],
    ["Calle A Oeste", 3, "Norma", "Silva", "1167804422", "Bazar", "Mensual", "ocupado", "pendiente", 28000],
    ["Calle B Oeste", 108, "Carlos", "Pereyra", "1156789021", "Celulares", "Fin de semana", "ocupado", "pagado", 8000],
    ["Sector Rojo", 1, "Patricia", "Molina", "1177110099", "Moda femenina", "Mensual", "ocupado", "pendiente", 22000],
    ["Sector Verdura", 1, "Miguel", "Sosa", "1144009900", "Comidas rapidas", "Mensual", "ocupado", "pagado", 35000],
  ].forEach(([sector, numero, nombre, apellido, telefono, rubro, modalidad, ocupacion, pago, importe]) => {
    const puesto = puestos.find((item) => item.sector === sector && item.numero === numero);
    if (puesto) Object.assign(puesto, { nombre, apellido, telefono, rubro, modalidad, ocupacion, pago, importe });
  });

  return {
    users,
    puestos,
    payments: [],
    expenses: [
      makeRecord("Seguridad", "Servicio de seguridad del predio", 120000),
      makeRecord("Mantenimiento", "Reparacion de luminarias", 45000),
      makeRecord("Personal", "Jornal administrativo", 35000),
    ],
    cars: [],
    carAudit: [],
  };
}

export function loadState() {
  try {
    const stored = localStorage.getItem(stateKey);
    if (stored) return normalizeState(JSON.parse(stored));
  } catch {
    localStorage.removeItem(stateKey);
  }
  return createDemoState();
}

export function saveState(state) {
  localStorage.setItem(stateKey, JSON.stringify(normalizeState(state)));
}

export function normalizeState(state) {
  const normalizedUsers = normalizeUsers(state?.users);
  const normalizedPuestos = normalizePuestos(state?.puestos);
  const normalizedPayments = normalizePayments(state?.payments, normalizedPuestos);
  return {
    users,
    puestos: [],
    payments: [],
    expenses: [],
    cars: [],
    carAudit: [],
    ...state,
    users: normalizedUsers,
    puestos: normalizedPuestos,
    payments: normalizedPayments,
    expenses: Array.isArray(state?.expenses) ? state.expenses : [],
    cars: Array.isArray(state?.cars) ? state.cars : [],
    carAudit: Array.isArray(state?.carAudit) ? state.carAudit : [],
  };
}

function normalizePuestos(value) {
  const source = Array.isArray(value) ? value : [];
  const byId = new Map();

  source.forEach((puesto) => {
    const normalized = normalizePuestoSector(puesto);
    if (!sectors.includes(normalized.sector) && !hasPuestoData(normalized)) return;
    byId.set(normalized.id, normalized);
  });

  sectorRanges.filter((range) => !range.pending).forEach(({ sector, start, end }) => {
    for (let numero = start; numero <= end; numero += 1) {
      const id = getPuestoId(sector, numero);
      if (!byId.has(id)) {
        byId.set(id, {
          id,
          sector,
          numero,
          nombre: "",
          apellido: "",
          telefono: "",
          rubro: "",
          modalidad: "Mensual",
          ocupacion: "libre",
          pago: "pendiente",
          importe: defaultPuestoAmount(sector),
          updatedAt: new Date().toISOString(),
        });
      }
    }
  });

  return Array.from(byId.values()).sort(comparePuestos);
}

function normalizePayments(value, puestos) {
  if (!Array.isArray(value)) return [];
  const puestosByOldId = new Map();
  puestos.forEach((puesto) => {
    const legacySector = getLegacyStreetSector(puesto.numero);
    if (legacySector && isStreetSector(puesto.sector)) puestosByOldId.set(getPuestoId(legacySector, puesto.numero), puesto);
    puestosByOldId.set(puesto.id, puesto);
  });

  return value.map((payment) => {
    const normalizedPuesto = puestosByOldId.get(payment.puestoId)
      || normalizePuestoSector({ sector: payment.sector, numero: payment.numero });
    return {
      ...payment,
      puestoId: normalizedPuesto.id,
      sector: normalizedPuesto.sector,
      numero: normalizedPuesto.numero,
    };
  });
}

function normalizePuestoSector(puesto) {
  const numero = Number(puesto?.numero || 0);
  const migratedSector = getMigratedSector(puesto?.sector, numero);
  const exactRange = sectorRanges.find((range) => range.sector === migratedSector);
  const legacySector = getLegacyStreetSector(numero) === migratedSector;
  const matchingRange = exactRange
    || (legacySector ? sectorRanges.find((range) => range.street && numero >= range.start && numero <= range.end) : null);
  const sector = matchingRange?.sector || migratedSector || sectorRanges[0].sector;
  return {
    ...puesto,
    id: getPuestoId(sector, numero),
    sector,
    numero,
    importe: Number(puesto?.importe || defaultPuestoAmount(sector)),
  };
}

function getMigratedSector(sector, numero) {
  if (sector === "Sector Comidas" && numero >= 1 && numero <= 68) return "Sector Verdura";
  if (sector === "Sector Usado" && numero >= 69 && numero <= 402) return "Sector Verde";
  return sector;
}

function hasPuestoData(puesto) {
  return Boolean(
    puesto?.ocupacion === "ocupado"
    || puesto?.pago === "pagado"
    || fullName(puesto)
    || puesto?.telefono
    || puesto?.rubro,
  );
}

function getLegacyStreetSector(numero) {
  const oldRanges = [
    { sector: "Calle A", start: 0, end: 107 },
    { sector: "Calle B", start: 108, end: 209 },
    { sector: "Calle C", start: 210, end: 303 },
    { sector: "Calle D", start: 304, end: 389 },
    { sector: "Calle E", start: 390, end: 468 },
    { sector: "Calle F", start: 469, end: 540 },
    { sector: "Calle G", start: 541, end: 603 },
    { sector: "Calle H", start: 604, end: 657 },
    { sector: "Calle I", start: 658, end: 705 },
  ];
  return oldRanges.find((range) => numero >= range.start && numero <= range.end)?.sector;
}

function isStreetSector(sector) {
  return sectorRanges.some((range) => range.street && range.sector === sector);
}

function normalizeUsers(value) {
  const appUsers = Array.isArray(value) && value.length ? value : users;
  const allViews = navItems.map(([id]) => id);
  const fixedViewsByRole = {
    entrada: ["playa"],
    cobrador: ["cobranza"],
  };
  let hasAdmin = appUsers.some((user) => user.role === "admin");
  const requiredUsers = users.filter((user) => user.role === "admin");

  const normalized = appUsers.map((user) => {
    if (!hasAdmin && user.username === "GUSTAVO") {
      hasAdmin = true;
      return { ...user, role: "admin", allowedViews: allViews };
    }
    if (user.role === "admin") return { ...user, allowedViews: allViews };
    if (fixedViewsByRole[user.role]) return { ...user, allowedViews: fixedViewsByRole[user.role] };
    return {
      ...user,
      allowedViews: Array.isArray(user.allowedViews) && user.allowedViews.length ? user.allowedViews : ["playa"],
    };
  });

  requiredUsers.forEach((requiredUser) => {
    if (!normalized.some((user) => user.username === requiredUser.username)) normalized.push(requiredUser);
  });

  return normalized;
}

export function isToday(date) {
  const a = new Date(date);
  const b = new Date();
  return a.getDate() === b.getDate() && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear();
}

export function formatDate(date) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "short", timeStyle: "short" }).format(new Date(date));
}

export function formatDateOnly(date) {
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "full" }).format(new Date(date));
}

export function formatMonthYear(date) {
  return new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric" }).format(new Date(date));
}

export function startOfDay(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  return value;
}

export function endOfDay(date) {
  const value = new Date(date);
  value.setHours(23, 59, 59, 999);
  return value;
}

export function startOfCurrentSunday(date) {
  const start = startOfDay(date);
  start.setDate(start.getDate() - start.getDay());
  return start;
}

export function isBetweenDates(date, start, end) {
  const value = new Date(date);
  return value >= start && value <= end;
}

export function sumAmounts(items) {
  return items.reduce((sum, item) => sum + Number(item.amount || 0), 0);
}

export function percent(value, total) {
  return total ? Math.round((value / total) * 100) : 0;
}

export function normalizePhone(phone) {
  let digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!digits.startsWith("54")) digits = `54${digits}`;
  return digits;
}

export function makePaymentWhatsappMessage(payment) {
  const lines = [
    "Feria Nicolas Serpa",
    "Comprobante de cobro",
    `Ticket: ${payment.id.slice(0, 8).toUpperCase()}`,
    `Fecha: ${formatDate(payment.date)}`,
    `Puesto: ${payment.sector} ${payment.numero}`,
    `Titular: ${payment.name}`,
    `Concepto: ${payment.concept}`,
    `Total: ${pesos.format(payment.amount)}`,
  ];

  if (payment.sundayDates?.length) {
    lines.splice(7, 0, `Domingos: ${payment.sundayDates.map((date) => formatDateOnly(date)).join(" | ")}`);
  }

  return lines.join("\n");
}
