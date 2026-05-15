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
  if (sector === "Sector Comidas") return 35000;
  if (sector === "Sector Rojo") return 22000;
  if (sector === "Peluquerias") return 18000;
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
  sectorRanges.forEach(({ sector, start, end }) => {
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
    ["Calle A", 1, "Federico", "Fernandez", "2613830142", "Ropa", "Fin de semana", "ocupado", "pagado", 15000],
    ["Calle A", 3, "Norma", "Silva", "1167804422", "Bazar", "Mensual", "ocupado", "pendiente", 28000],
    ["Calle B", 108, "Carlos", "Pereyra", "1156789021", "Celulares", "Fin de semana", "ocupado", "pagado", 8000],
    ["Sector Rojo", 1, "Patricia", "Molina", "1177110099", "Moda femenina", "Mensual", "ocupado", "pendiente", 22000],
    ["Sector Comidas", 1, "Miguel", "Sosa", "1144009900", "Comidas rapidas", "Mensual", "ocupado", "pagado", 35000],
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
  return {
    users,
    puestos: [],
    payments: [],
    expenses: [],
    cars: [],
    ...state,
    users: normalizedUsers,
    puestos: Array.isArray(state?.puestos) ? state.puestos : [],
    payments: Array.isArray(state?.payments) ? state.payments : [],
    expenses: Array.isArray(state?.expenses) ? state.expenses : [],
    cars: Array.isArray(state?.cars) ? state.cars : [],
  };
}

function normalizeUsers(value) {
  const appUsers = Array.isArray(value) && value.length ? value : users;
  const allViews = navItems.map(([id]) => id);
  let hasAdmin = appUsers.some((user) => user.role === "admin");
  const requiredUsers = users.filter((user) => user.role === "admin");

  const normalized = appUsers.map((user) => {
    if (!hasAdmin && user.username === "GUSTAVO") {
      hasAdmin = true;
      return { ...user, role: "admin", allowedViews: allViews };
    }
    if (user.role === "admin") return { ...user, allowedViews: allViews };
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
