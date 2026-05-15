import { useEffect, useMemo, useState } from "react";
import { carBrands, carColors, navItems, rubros, sectors, users as defaultUsers } from "./data.js";
import { loadRemoteState, saveRemoteState, subscribeToRemoteState } from "./remoteState.js";
import { isSupabaseConfigured } from "./supabaseClient.js";
import {
  comparePuestos,
  createDemoState,
  endOfDay,
  formatDate,
  formatDateOnly,
  formatMonthYear,
  fullName,
  getPuestoId,
  isBetweenDates,
  isToday,
  loadState,
  makePaymentWhatsappMessage,
  makeRecord,
  normalizePhone,
  percent,
  pesos,
  saveState,
  startOfCurrentSunday,
  startOfDay,
  sumAmounts,
} from "./utils.js";

const titles = {
  dashboard: "Panel general",
  puestos: "Gestion de puestos",
  cobranza: "Cobranza y tickets",
  gastos: "Gastos",
  playa: "Playa de autos",
  estadisticas: "Estadisticas",
  usuarios: "Usuarios y permisos",
};

const sessionKey = "feria-serpa-current-user";

const receiptPrintStyles = `
  @page {
    size: 58mm 68mm;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    width: 58mm;
    min-height: 0;
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: Futura, "Century Gothic", "Trebuchet MS", Arial, sans-serif;
  }

  .ticket-copy {
    width: 58mm;
    margin: 0;
    padding: 2mm 3mm 2mm;
    border: 0;
    background: #fff;
    color: #000;
  }

  h3 {
    margin: 0 0 1mm;
    font-size: 13px;
    line-height: 1.15;
    text-align: center;
  }

  p {
    margin: 0 0 1.5mm;
    color: #000;
    font-size: 10px;
    line-height: 1.2;
    text-align: center;
  }

  .ticket-disclaimer {
    margin: 0 0 1.5mm;
    font-size: 8.5px;
    font-weight: 800;
    line-height: 1.2;
    text-align: center;
    text-transform: uppercase;
  }

  .ticket-line {
    display: flex;
    justify-content: space-between;
    gap: 2mm;
    padding: 0.9mm 0;
    border-bottom: 1px dashed #999;
    color: #000;
    font-size: 9.5px;
    line-height: 1.2;
    overflow-wrap: anywhere;
  }

  .ticket-line span,
  .ticket-line strong {
    min-width: 0;
    color: #000;
  }

  .ticket-line strong {
    text-align: right;
  }

  .ticket-warning {
    margin: 2mm 0 0;
    padding-top: 1.5mm;
    border-top: 1px dashed #999;
    color: #000;
    font-size: 9px;
    font-weight: 700;
    line-height: 1.25;
    text-align: center;
  }
`;

function printReceipt(selector) {
  const ticket = document.querySelector(selector);
  if (!ticket) return;

  const frame = document.createElement("iframe");
  frame.title = "Impresion de comprobante";
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const printDocument = frame.contentDocument;
  printDocument.open();
  printDocument.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Comprobante</title>
        <style>${receiptPrintStyles}</style>
      </head>
      <body>${ticket.outerHTML}</body>
    </html>
  `);
  printDocument.close();

  const cleanup = () => frame.remove();
  frame.contentWindow.addEventListener("afterprint", cleanup, { once: true });
  frame.contentWindow.focus();
  frame.contentWindow.print();
  window.setTimeout(cleanup, 1000);
}

const carReceiptPrintStyles = `
  @page {
    size: 100mm 58mm;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    width: 100mm;
    height: 58mm;
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: Futura, "Century Gothic", "Trebuchet MS", Arial, sans-serif;
  }

  .car-receipt {
    width: 100mm;
    height: 58mm;
    display: grid;
    grid-template-columns: 12mm 1fr;
    gap: 2mm;
    padding: 3mm;
    background: #fff;
    color: #000;
    overflow: hidden;
  }

  .receipt-side {
    display: grid;
    place-items: center;
    border-right: 1px solid #000;
    font-weight: 800;
    font-size: 10px;
    letter-spacing: 0.08em;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    text-transform: uppercase;
  }

  .receipt-main {
    display: grid;
    grid-template-rows: auto auto 1fr auto;
    gap: 2mm;
    min-width: 0;
  }

  .receipt-top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 2mm;
    border-bottom: 1.4px solid #000;
    padding-bottom: 1mm;
  }

  .receipt-date {
    font-size: 24px;
    line-height: 0.9;
    font-weight: 900;
    letter-spacing: 0;
  }

  .receipt-entry {
    font-size: 14px;
    line-height: 1;
    font-weight: 800;
    text-align: right;
    text-transform: uppercase;
  }

  .receipt-note {
    font-size: 8px;
    line-height: 1;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-align: right;
  }

  .receipt-warning {
    margin: 0;
    padding: 2mm 3mm;
    border: 1.5px solid #000;
    font-size: 11px;
    line-height: 1.12;
    font-weight: 900;
    text-align: center;
  }

  .receipt-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: end;
    column-gap: 4mm;
    row-gap: 1.5mm;
    font-size: 10px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .receipt-field {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: end;
    gap: 1.5mm;
    min-width: 0;
  }

  .receipt-value {
    min-height: 5mm;
    border-bottom: 1px dotted #000;
    font-size: 11px;
    line-height: 1;
    text-align: center;
    text-transform: none;
    overflow: hidden;
    white-space: nowrap;
  }

  .receipt-total {
    text-align: right;
    font-size: 11px;
  }
`;

const paymentReceiptPrintStyles = `
  @page {
    size: 100mm 58mm;
    margin: 0;
  }

  * {
    box-sizing: border-box;
  }

  html,
  body {
    width: 100mm;
    min-height: 58mm;
    margin: 0;
    padding: 0;
    background: #fff;
    color: #000;
    font-family: Futura, "Century Gothic", "Trebuchet MS", Arial, sans-serif;
  }

  .payment-receipt {
    width: 100mm;
    height: 58mm;
    display: grid;
    grid-template-columns: 12mm 1fr;
    gap: 2mm;
    padding: 3mm;
    background: #fff;
    color: #000;
    overflow: hidden;
    page-break-after: always;
  }

  .payment-receipt:last-child {
    page-break-after: auto;
  }

  .receipt-side {
    display: grid;
    place-items: center;
    border-right: 1px solid #000;
    font-weight: 800;
    font-size: 10px;
    letter-spacing: 0.08em;
    writing-mode: vertical-rl;
    transform: rotate(180deg);
    text-transform: uppercase;
  }

  .receipt-main {
    display: grid;
    grid-template-rows: auto auto 1fr;
    gap: 2mm;
    min-width: 0;
  }

  .receipt-top {
    display: flex;
    align-items: flex-end;
    justify-content: space-between;
    gap: 2mm;
    border-bottom: 1.4px solid #000;
    padding-bottom: 1mm;
  }

  .receipt-title {
    font-size: 19px;
    line-height: 0.95;
    font-weight: 900;
    letter-spacing: 0;
  }

  .receipt-copy {
    font-size: 12px;
    line-height: 1;
    font-weight: 800;
    text-align: right;
    text-transform: uppercase;
  }

  .receipt-note {
    font-size: 8px;
    line-height: 1;
    font-weight: 700;
    letter-spacing: 0.18em;
    text-align: right;
  }

  .receipt-warning {
    margin: 0;
    padding: 1.6mm 2mm;
    border: 1.5px solid #000;
    font-size: 10px;
    line-height: 1.1;
    font-weight: 900;
    text-align: center;
  }

  .receipt-details {
    display: grid;
    grid-template-columns: 1fr 1fr;
    align-items: end;
    column-gap: 4mm;
    row-gap: 1.2mm;
    font-size: 9.5px;
    font-weight: 900;
    text-transform: uppercase;
  }

  .receipt-field {
    display: grid;
    grid-template-columns: auto 1fr;
    align-items: end;
    gap: 1.5mm;
    min-width: 0;
  }

  .receipt-value {
    min-height: 4.5mm;
    border-bottom: 1px dotted #000;
    font-size: 10px;
    line-height: 1;
    text-align: center;
    text-transform: none;
    overflow: hidden;
    white-space: nowrap;
  }

  .receipt-total {
    text-align: right;
    font-size: 11px;
  }
`;

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function printPaymentReceipt(payment, mode = "single") {
  if (!payment) return;
  const frame = document.createElement("iframe");
  frame.title = "Impresion de comprobante";
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const copies = mode === "split" && payment.sundayDates?.length
    ? payment.sundayDates.map((date) => ({
        title: `Domingo ${formatDateOnly(date)}`,
        copy: "Puestero",
        payment: {
          ...payment,
          id: `${payment.id}-${date}`,
          concept: `Domingo ${formatDateOnly(date)}`,
          amount: Number(payment.perSundayAmount || payment.amount / payment.sundayDates.length || 0),
        },
      }))
    : [
        { title: payment.concept, copy: "Puestero", payment },
        { title: payment.concept, copy: "Administracion", payment },
      ];

  const html = copies.map(({ title, copy, payment: item }) => {
    const ticketNumber = item.id ? item.id.slice(0, 8).toUpperCase() : "";
    const sundayText = item.sundayDates?.length ? item.sundayDates.map((date) => formatDateOnly(date)).join(" | ") : "";
    return `
      <section class="payment-receipt">
        <aside class="receipt-side">
          <span>Cobranza</span>
          <span>Nro. ${escapeHtml(ticketNumber)}</span>
        </aside>
        <main class="receipt-main">
          <header class="receipt-top">
            <strong class="receipt-title">${escapeHtml(title)}</strong>
            <div>
              <div class="receipt-copy">${escapeHtml(copy)}</div>
              <div class="receipt-note">No valido como factura</div>
            </div>
          </header>
          <p class="receipt-warning">${escapeHtml(sundayText || "Comprobante de cobro emitido por Feria Nicolas Serpa.")}</p>
          <div class="receipt-details">
            <div class="receipt-field"><span>Fecha:</span><strong class="receipt-value">${escapeHtml(formatDate(item.date))}</strong></div>
            <div class="receipt-field"><span>Puesto:</span><strong class="receipt-value">${escapeHtml(`${item.sector} ${item.numero}`)}</strong></div>
            <div class="receipt-field"><span>Titular:</span><strong class="receipt-value">${escapeHtml(item.name)}</strong></div>
            <div class="receipt-field"><span>Medio:</span><strong class="receipt-value">${escapeHtml(item.method)}</strong></div>
            <div class="receipt-total">Total: ${escapeHtml(pesos.format(item.amount))}</div>
          </div>
        </main>
      </section>
    `;
  }).join("");

  const printDocument = frame.contentDocument;
  printDocument.open();
  printDocument.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Comprobante</title>
        <style>${paymentReceiptPrintStyles}</style>
      </head>
      <body>${html}</body>
    </html>
  `);
  printDocument.close();

  const cleanup = () => frame.remove();
  frame.contentWindow.addEventListener("afterprint", cleanup, { once: true });
  frame.contentWindow.focus();
  frame.contentWindow.print();
  window.setTimeout(cleanup, 1000);
}

function normalizeEntryLabel(value) {
  const text = String(value || "").trim();
  const match = text.match(/\d+/);
  if (match) return `Cabina ${match[0]}`;
  return text || "Cabina";
}

function printCarReceipt(car) {
  if (!car) return;
  const frame = document.createElement("iframe");
  frame.title = "Impresion de comprobante";
  frame.style.position = "fixed";
  frame.style.right = "0";
  frame.style.bottom = "0";
  frame.style.width = "0";
  frame.style.height = "0";
  frame.style.border = "0";
  document.body.appendChild(frame);

  const date = formatDateOnly(car.date).replace(/\//g, ".");
  const entry = normalizeEntryLabel(car.entryUser);
  const ticketNumber = car.id ? car.id.slice(0, 6).toUpperCase() : "";
  const printDocument = frame.contentDocument;
  printDocument.open();
  printDocument.write(`
    <!doctype html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Comprobante</title>
        <style>${carReceiptPrintStyles}</style>
      </head>
      <body>
        <section class="car-receipt">
          <aside class="receipt-side">
            <span>Estacionamiento</span>
            <span>Nro. ${escapeHtml(ticketNumber)}</span>
          </aside>
          <main class="receipt-main">
            <header class="receipt-top">
              <strong class="receipt-date">${escapeHtml(date)}</strong>
              <div>
                <div class="receipt-entry">${escapeHtml(entry)}</div>
                <div class="receipt-note">No valido como factura</div>
              </div>
            </header>
            <p class="receipt-warning">Por favor, controle que el numero de patente ingresado en su ticket sea correcto y este legible, sin correcciones. De lo contrario, el seguro de esta playa no tendra validez.</p>
            <div class="receipt-details">
              <div class="receipt-field"><span>Patente:</span><strong class="receipt-value">${escapeHtml(car.plate)}</strong></div>
              <div class="receipt-field"><span>Marca:</span><strong class="receipt-value">${escapeHtml(car.brand)}</strong></div>
              <div class="receipt-field"><span>Color:</span><strong class="receipt-value">${escapeHtml(car.color)}</strong></div>
              <div class="receipt-total">Importe: ${escapeHtml(pesos.format(car.amount))}</div>
            </div>
          </main>
        </section>
      </body>
    </html>
  `);
  printDocument.close();

  const cleanup = () => frame.remove();
  frame.contentWindow.addEventListener("afterprint", cleanup, { once: true });
  frame.contentWindow.focus();
  frame.contentWindow.print();
  window.setTimeout(cleanup, 1000);
}

const emptyPuesto = {
  id: "",
  sector: "Calle A",
  numero: 0,
  nombre: "",
  apellido: "",
  telefono: "",
  rubro: "",
  modalidad: "Mensual",
  ocupacion: "libre",
  pago: "pendiente",
  importe: 28000,
};

const emptyUser = {
  username: "",
  password: "",
  role: "entrada",
  allowedViews: ["playa"],
};

export function App() {
  const [state, setState] = useState(loadState);
  const [isHydrated, setIsHydrated] = useState(false);
  const [syncStatus, setSyncStatus] = useState(isSupabaseConfigured ? "Conectando con Supabase..." : "Modo local");
  const [currentUser, setCurrentUser] = useState(() => loadSessionUser());
  const [view, setView] = useState(() => loadSessionUser()?.allowedViews[0] || "dashboard");
  const [selectedMapSector, setSelectedMapSector] = useState("Calle A");
  const [editingPuesto, setEditingPuesto] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [lastPayment, setLastPayment] = useState(null);
  const [carTicket, setCarTicket] = useState(null);
  const appUsers = state.users?.length ? state.users : defaultUsers;
  const isAdmin = currentUser?.role === "admin";
  const canManage = isAdmin || currentUser?.role === "maestro";

  useEffect(() => {
    let isMounted = true;

    loadRemoteState(loadState())
      .then(({ state: remoteState, source }) => {
        if (!isMounted) return;
        setState(remoteState);
        saveState(remoteState);
        setSyncStatus(source === "supabase" ? "Datos cargados desde Supabase" : "Datos locales listos");
      })
      .catch(() => {
        if (!isMounted) return;
        setSyncStatus("Supabase no disponible, usando datos locales");
      })
      .finally(() => {
        if (isMounted) setIsHydrated(true);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!isHydrated) return;
    saveState(state);

    const timeout = window.setTimeout(() => {
      saveRemoteState(state)
        .then(() => setSyncStatus(isSupabaseConfigured ? "Guardado en Supabase" : "Guardado local"))
        .catch(() => setSyncStatus("No se pudo guardar en Supabase, queda respaldo local"));
    }, 500);

    return () => window.clearTimeout(timeout);
  }, [isHydrated, state]);

  useEffect(() => {
    if (!isHydrated) return undefined;

    return subscribeToRemoteState((remoteState) => {
      setState((current) => {
        if (JSON.stringify(current) === JSON.stringify(remoteState)) return current;
        saveState(remoteState);
        setSyncStatus("Actualizado desde otro dispositivo");
        return remoteState;
      });
    });
  }, [isHydrated]);

  useEffect(() => {
    if (!currentUser) return;
    if (!currentUser.allowedViews.includes(view)) setView(currentUser.allowedViews[0]);
  }, [currentUser, view]);

  useEffect(() => {
    if (!currentUser) return;
    const savedUser = appUsers.find((user) => user.username === currentUser.username);
    if (!savedUser) {
      logout();
      return;
    }
    if (JSON.stringify(savedUser.allowedViews) !== JSON.stringify(currentUser.allowedViews) || savedUser.role !== currentUser.role) {
      const sessionUser = {
        username: savedUser.username,
        role: savedUser.role,
        allowedViews: savedUser.role === "admin" ? navItems.map(([id]) => id) : savedUser.allowedViews,
      };
      localStorage.setItem(sessionKey, JSON.stringify(sessionUser));
      setCurrentUser(sessionUser);
    }
  }, [appUsers, currentUser]);

  const login = ({ username, password }) => {
    const normalizedUsername = username.trim().toUpperCase().replace(/\s+/g, " ");
    const user = appUsers.find((item) => item.username === normalizedUsername && item.password === password);
    if (!user) return false;
    const sessionUser = {
      username: user.username,
      role: user.role,
      allowedViews: user.allowedViews,
    };
    localStorage.setItem(sessionKey, JSON.stringify(sessionUser));
    setCurrentUser(sessionUser);
    setView(sessionUser.allowedViews[0]);
    return true;
  };

  const logout = () => {
    localStorage.removeItem(sessionKey);
    setCurrentUser(null);
    setView("dashboard");
    setEditingPuesto(null);
    setLastPayment(null);
    setCarTicket(null);
  };

  const saveUser = (user) => {
    const username = user.username.trim().toUpperCase().replace(/\s+/g, " ");
    const role = user.role || "entrada";
    const allowedViews = role === "admin" ? navItems.map(([id]) => id) : user.allowedViews.filter((viewId) => viewId !== "usuarios");

    if (!username || !user.password.trim()) {
      window.alert("Usuario y contrasena son obligatorios.");
      return;
    }

    updateState((draft) => {
      const next = {
        username,
        password: user.password.trim(),
        role,
        allowedViews: allowedViews.length ? allowedViews : ["playa"],
      };
      const index = draft.users.findIndex((item) => item.username === username);
      if (index >= 0) draft.users[index] = next;
      else draft.users.push(next);
    });
    setEditingUser(null);
  };

  const deleteUser = (username) => {
    if (username === currentUser?.username) {
      window.alert("No podes borrar el usuario con el que estas trabajando.");
      return;
    }
    if (!window.confirm(`Borrar usuario ${username}?`)) return;
    updateState((draft) => {
      draft.users = draft.users.filter((user) => user.username !== username);
    });
  };

  const updateState = (recipe) => {
    setState((current) => {
      const draft = structuredClone(current);
      recipe(draft);
      return draft;
    });
  };

  const resetDemo = () => {
    const demo = createDemoState();
    setState(demo);
    setLastPayment(null);
    setCarTicket(null);
  };

  const savePuesto = (puesto) => {
    updateState((draft) => {
      const id = puesto.id || getPuestoId(puesto.sector, Number(puesto.numero));
      const existing = draft.puestos.find((item) => item.sector === puesto.sector && Number(item.numero) === Number(puesto.numero));
      if (existing && existing.id !== puesto.id && existing.ocupacion === "ocupado") {
        window.alert(`El ${puesto.sector} ${puesto.numero} ya esta OCUPADO por ${fullName(existing) || "un puestero cargado"}.`);
        return;
      }
      const next = { ...puesto, id, numero: Number(puesto.numero), importe: Number(puesto.importe), updatedAt: new Date().toISOString() };
      const index = draft.puestos.findIndex((item) => item.id === id);
      if (index >= 0) draft.puestos[index] = next;
      else draft.puestos.unshift(next);
    });
    setEditingPuesto(null);
  };

  const collectPayment = (form) => {
    const puesto = state.puestos.find((item) => item.id === form.puestoId);
    if (!puesto || puesto.ocupacion !== "ocupado") {
      window.alert("Este puesto esta libre o no tiene titular cargado.");
      return;
    }
    const payment = {
      id: form.id || crypto.randomUUID(),
      puestoId: puesto.id,
      sector: puesto.sector,
      numero: puesto.numero,
      name: fullName(puesto),
      phone: puesto.telefono,
      concept: form.concept,
      method: form.method,
      amount: Number(form.amount),
      date: form.date || new Date().toISOString(),
      paymentType: form.paymentType || "simple",
      sundayDates: form.paymentType === "month-sundays" ? form.sundayDates || [] : [],
      perSundayAmount: form.paymentType === "month-sundays" ? Number(form.perSundayAmount || 0) : 0,
    };
    updateState((draft) => {
      const draftPuesto = draft.puestos.find((item) => item.id === puesto.id);
      draftPuesto.pago = "pagado";
      const index = draft.payments.findIndex((item) => item.id === payment.id);
      if (index >= 0) draft.payments[index] = payment;
      else draft.payments.unshift(payment);
    });
    setLastPayment(payment);
  };

  const deletePayments = (ids) => {
    if (!ids.length) return;
    updateState((draft) => {
      const affected = new Set(draft.payments.filter((payment) => ids.includes(payment.id)).map((payment) => payment.puestoId));
      draft.payments = draft.payments.filter((payment) => !ids.includes(payment.id));
      affected.forEach((puestoId) => {
        const puesto = draft.puestos.find((item) => item.id === puestoId);
        if (puesto) puesto.pago = draft.payments.some((payment) => payment.puestoId === puestoId) ? "pagado" : "pendiente";
      });
    });
    if (lastPayment && ids.includes(lastPayment.id)) setLastPayment(null);
  };

  const saveExpense = (expense) => {
    updateState((draft) => {
      draft.expenses.unshift(makeRecord(expense.category, expense.detail, expense.amount, expense));
    });
  };

  const saveCar = (car) => {
    const next = {
      ...car,
      id: car.id || crypto.randomUUID(),
      plate: car.plate.trim().toUpperCase(),
      amount: Number(car.amount),
      date: car.date || new Date().toISOString(),
      entryUser: car.entryUser || currentUser?.username || "",
    };
    updateState((draft) => {
      const index = draft.cars.findIndex((item) => item.id === next.id);
      if (index >= 0) draft.cars[index] = next;
      else draft.cars.unshift(next);
    });
    setCarTicket(next);
  };

  const deleteCars = (ids) => {
    updateState((draft) => {
      draft.cars = draft.cars.filter((car) => !ids.includes(car.id));
    });
    if (carTicket && ids.includes(carTicket.id)) setCarTicket(null);
  };

  if (!currentUser) return <LoginScreen onLogin={login} syncStatus={syncStatus} />;

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} currentUser={currentUser} onLogout={logout} />
      <main className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operacion diaria</p>
            <h2>{titles[view]}</h2>
          </div>
          {canManage && (
            <div className="top-actions">
              <button className="primary" onClick={() => setEditingPuesto(emptyPuesto)}>Nuevo puesto</button>
            </div>
          )}
        </header>

        <section id={view} className="view active">
          {view === "dashboard" && (
            <Dashboard
              state={state}
              selectedMapSector={selectedMapSector}
              setSelectedMapSector={setSelectedMapSector}
              editPuesto={setEditingPuesto}
            />
          )}
          {view === "puestos" && <Puestos state={state} editPuesto={setEditingPuesto} goCollect={(puesto) => setView("cobranza")} />}
          {view === "cobranza" && (
            <Cobranza state={state} collectPayment={collectPayment} deletePayments={deletePayments} lastPayment={lastPayment} setLastPayment={setLastPayment} />
          )}
          {view === "gastos" && <Gastos state={state} saveExpense={saveExpense} />}
          {view === "playa" && <Playa state={state} saveCar={saveCar} deleteCars={deleteCars} carTicket={carTicket} setCarTicket={setCarTicket} currentUser={currentUser} />}
          {view === "estadisticas" && <Estadisticas state={state} />}
          {view === "usuarios" && isAdmin && <Usuarios users={appUsers} currentUser={currentUser} editUser={setEditingUser} deleteUser={deleteUser} />}
        </section>
      </main>

      {editingPuesto && <PuestoModal puesto={editingPuesto} onClose={() => setEditingPuesto(null)} onSave={savePuesto} />}
      {editingUser && <UserModal user={editingUser} onClose={() => setEditingUser(null)} onSave={saveUser} />}
    </div>
  );
}

function LoginScreen({ onLogin, syncStatus }) {
  const [form, setForm] = useState({ username: "", password: "" });
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    setError("");
    if (!onLogin(form)) setError("Usuario o contraseña incorrectos.");
  };

  return (
    <main className="login-screen">
      <section className="login-card">
        <img className="login-logo" src="/assets/logo-feria-serpa.png" alt="Feria Nicolas Serpa" />
        <div>
          <p className="eyebrow">Acceso al sistema</p>
          <h1>Feria Nicolas Serpa</h1>
          <p className="login-sync">{syncStatus}</p>
        </div>
        <form className="form" onSubmit={submit}>
          <label>Usuario
            <input
              value={form.username}
              onChange={(e) => setForm({ ...form, username: e.target.value })}
              autoComplete="username"
              autoCapitalize="characters"
              required
            />
          </label>
          <label>Contraseña
            <input
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              autoComplete="current-password"
              required
            />
          </label>
          {error && <p className="login-error">{error}</p>}
          <button className="primary">Ingresar</button>
        </form>
      </section>
    </main>
  );
}

function Sidebar({ view, setView, currentUser, onLogout }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const availableNavItems = currentUser.role === "admin" ? navItems : navItems.filter(([id]) => currentUser.allowedViews.includes(id));
  const activeLabel = availableNavItems.find(([id]) => id === view)?.[1] || "Menu";

  const selectView = (id) => {
    setView(id);
    setMenuOpen(false);
  };

  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-logo" src="/assets/logo-feria-serpa.png" alt="Feria Nicolas Serpa" />
        <div>
          <h1>Nicolas Serpa</h1>
          <p>Gestion de feria</p>
        </div>
      </div>
      <button
        className={`menu-toggle ${menuOpen ? "open" : ""}`}
        type="button"
        aria-expanded={menuOpen}
        aria-controls="main-navigation"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span>Menu</span>
        <strong>{activeLabel}</strong>
        <i aria-hidden="true" />
      </button>
      <nav id="main-navigation" className={`nav ${menuOpen ? "open" : ""}`}>
        {availableNavItems.map(([id, label]) => (
          <button key={id} className={`nav-item nav-item-${id} ${view === id ? "active" : ""}`} onClick={() => selectView(id)}>
            {label}
          </button>
        ))}
      </nav>
      <div className="sidebar-user">
        <span>{currentUser.username}</span>
        <button className="nav-item logout-button" onClick={onLogout}>Salir</button>
      </div>
    </aside>
  );
}

function Dashboard({ state, selectedMapSector, setSelectedMapSector, editPuesto }) {
  const occupied = state.puestos.filter((p) => p.ocupacion === "ocupado");
  const pending = occupied.filter((p) => p.pago === "pendiente");
  const monthPayments = state.payments.filter((p) => sameMonth(p.date));
  const monthCars = state.cars.filter((c) => sameMonth(c.date));
  const todayCars = state.cars.filter((c) => isToday(c.date));
  const selected = state.puestos.filter((p) => p.sector === selectedMapSector).sort(comparePuestos);

  return (
    <>
      <div className="metrics">
        <Metric label="Puestos ocupados" value={`${occupied.length}/${state.puestos.length}`} />
        <Metric label="Pagos pendientes" value={pending.length} />
        <Metric label="Ingresos del mes" value={pesos.format(sumAmounts(monthPayments) + sumAmounts(monthCars))} />
        <Metric label="Autos hoy" value={todayCars.length} />
      </div>
      <div className="split dashboard-layout">
        <section className="panel">
          <div className="panel-head">
            <h3>Mapa rapido</h3>
            <span>{state.puestos.length} puestos cargados</span>
          </div>
          <div className="street-grid">
            {sectors.map((sector) => {
              const all = state.puestos.filter((p) => p.sector === sector);
              const used = all.filter((p) => p.ocupacion === "ocupado").length;
              return (
                <button key={sector} className={`street ${selectedMapSector === sector ? "active" : ""}`} onClick={() => setSelectedMapSector(sector)}>
                  <div className="street-top"><span>{sector}</span><span>{percent(used, all.length)}%</span></div>
                  <div className="bar"><span style={{ width: `${percent(used, all.length)}%` }} /></div>
                  <small>{used} ocupados de {all.length}</small>
                </button>
              );
            })}
          </div>
          <div className="street-map-panel">
            <div className="street-map-head">
              <div>
                <h4>{selectedMapSector}</h4>
                <small>{selected.filter((p) => p.ocupacion === "ocupado").length} ocupados | {selected.filter((p) => p.ocupacion !== "ocupado").length} libres</small>
              </div>
              <div className="street-legend">
                <span><i className="map-dot occupied" /> Ocupado</span>
                <span><i className="map-dot free" /> Libre</span>
              </div>
            </div>
            <div className="puesto-map">
              {selected.map((puesto) => (
                <button key={puesto.id} className={`puesto-cell ${puesto.ocupacion === "ocupado" ? "occupied" : "free"}`} onClick={() => editPuesto(puesto)}>
                  {puesto.numero}
                </button>
              ))}
            </div>
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h3>Ultimos movimientos</h3></div>
          <ActivityList payments={state.payments.slice(0, 6)} />
        </section>
      </div>
    </>
  );
}

function Puestos({ state, editPuesto }) {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState("");
  const [status, setStatus] = useState("");
  const rows = state.puestos
    .filter((p) => !sector || p.sector === sector)
    .filter((p) => !status || p.ocupacion === status || p.pago === status)
    .filter((p) => `${p.sector} ${p.numero} ${fullName(p)} ${p.telefono} ${p.rubro}`.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 250);

  return (
    <section>
      <div className="toolbar">
        <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nombre, telefono o puesto" />
        <select value={sector} onChange={(e) => setSector(e.target.value)}>
          <option value="">Todos los sectores</option>
          {sectors.map((item) => <option key={item}>{item}</option>)}
        </select>
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="ocupado">Ocupado</option>
          <option value="libre">Libre</option>
          <option value="pagado">Pagado</option>
          <option value="pendiente">Pendiente</option>
        </select>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Puesto</th><th>Titular</th><th>Telefono</th><th>Rubro</th><th>Modalidad</th><th>Estado</th><th>Pago</th><th>Importe</th><th /></tr>
          </thead>
          <tbody>
            {rows.map((puesto) => (
              <tr key={puesto.id}>
                <td><strong>{puesto.sector} {puesto.numero}</strong></td>
                <td>{fullName(puesto) || "-"}</td>
                <td>{puesto.telefono || "-"}</td>
                <td>{puesto.rubro ? <span className="rubro-chip">{puesto.rubro}</span> : "-"}</td>
                <td>{puesto.modalidad}</td>
                <td><Badge tone={puesto.ocupacion === "ocupado" ? "occupied" : "free"}>{puesto.ocupacion}</Badge></td>
                <td><Badge tone={puesto.pago === "pagado" ? "ok" : "danger"}>{puesto.pago}</Badge></td>
                <td>{pesos.format(puesto.importe)}</td>
                <td className="row-actions"><button className="ghost" onClick={() => editPuesto(puesto)}>Editar</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Cobranza({ state, collectPayment, deletePayments, lastPayment, setLastPayment }) {
  const occupied = state.puestos.filter((p) => p.ocupacion === "ocupado").sort(comparePuestos);
  const monthSundays = getCurrentMonthSundays();
  const [form, setForm] = useState({ puestoId: occupied[0]?.id || "", paymentType: "simple", concept: "Canon mensual", method: "Efectivo", amount: occupied[0]?.importe || 0 });
  const [selected, setSelected] = useState([]);
  const [ticketMode, setTicketMode] = useState("single");
  const puesto = state.puestos.find((p) => p.id === form.puestoId);

  useEffect(() => {
    if (!puesto || form.id) return;
    setForm((current) => ({
      ...current,
      amount: current.paymentType === "month-sundays" ? Number(puesto.importe || 0) * monthSundays.length : puesto.importe,
      perSundayAmount: current.paymentType === "month-sundays" ? Number(puesto.importe || 0) : 0,
    }));
  }, [form.puestoId, form.paymentType]);

  const resetForm = () => {
    setForm({ puestoId: occupied[0]?.id || "", paymentType: "simple", concept: "Canon mensual", method: "Efectivo", amount: occupied[0]?.importe || 0 });
  };

  const changePaymentType = (paymentType) => {
    const sundayDates = monthSundays.map((date) => date.toISOString());
    const perSundayAmount = Number(puesto?.importe || 0);
    setForm({
      ...form,
      paymentType,
      concept: paymentType === "month-sundays" ? `Domingos de ${formatMonthYear(new Date())}` : "Canon mensual",
      amount: paymentType === "month-sundays" ? perSundayAmount * sundayDates.length : perSundayAmount,
      sundayDates: paymentType === "month-sundays" ? sundayDates : [],
      perSundayAmount: paymentType === "month-sundays" ? perSundayAmount : 0,
    });
  };

  const editPayment = (payment) => {
    setForm({
      id: payment.id,
      puestoId: payment.puestoId,
      concept: payment.concept,
      method: payment.method,
      amount: payment.amount,
      date: payment.date,
      paymentType: payment.paymentType || "simple",
      sundayDates: payment.sundayDates || [],
      perSundayAmount: payment.perSundayAmount || 0,
    });
  };

  const printPayment = (payment) => {
    setLastPayment(payment);
    window.setTimeout(() => printPaymentReceipt(payment, "single"), 0);
  };

  const printPaymentTicket = () => {
    setTicketMode("single");
    printPaymentReceipt(lastPayment, "single");
  };

  const printSundayTickets = () => {
    if (!lastPayment?.sundayDates?.length) return;
    setTicketMode("split");
    window.setTimeout(() => printPaymentReceipt(lastPayment, "split"), 0);
  };

  const sendWhatsapp = async () => {
    if (!lastPayment) return;
    const phone = normalizePhone(lastPayment.phone);
    if (!phone) {
      window.alert("Este puestero no tiene telefono cargado.");
      return;
    }
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(makePaymentWhatsappMessage(lastPayment))}`, "_blank");
  };

  return (
    <div className="payment-layout">
      <section className="panel">
        <div className="panel-head">
          <h3>{form.id ? "Editar cobro" : "Emitir cobro"}</h3>
          {form.id && <button className="ghost" onClick={resetForm}>Nuevo cobro</button>}
        </div>
        <form className="form" onSubmit={(event) => { event.preventDefault(); collectPayment(form); resetForm(); }}>
          <label>Puesto
            <select value={form.puestoId} onChange={(e) => setForm({ ...form, puestoId: e.target.value })}>
              {occupied.map((p) => <option key={p.id} value={p.id}>{p.sector} {p.numero} - {fullName(p) || "Sin titular"} ({p.ocupacion})</option>)}
            </select>
          </label>
          <label>Tipo de cobro
            <select value={form.paymentType || "simple"} onChange={(e) => changePaymentType(e.target.value)}>
              <option value="simple">Cobro simple</option>
              <option value="month-sundays">Todos los domingos del mes vigente</option>
            </select>
          </label>
          {form.paymentType === "month-sundays" && (
            <div className="month-sundays-box">
              <strong>{monthSundays.length} domingos incluidos</strong>
              <span>{monthSundays.map((date) => formatDateOnly(date)).join(" | ")}</span>
              <small>Calculado como {pesos.format(Number(puesto?.importe || 0))} x {monthSundays.length}. El importe final se puede editar antes de cobrar.</small>
            </div>
          )}
          <label>Concepto
            <select value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })}>
              <option>Canon mensual</option><option>Fin de semana</option><option>Domingos del mes</option><option>Reserva</option><option>Deuda anterior</option>
            </select>
          </label>
          <label>Importe <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} /></label>
          <label>Medio de pago
            <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}>
              <option>Efectivo</option><option>Transferencia</option><option>Debito</option><option>Credito</option>
            </select>
          </label>
          <button className="primary">{form.id ? "Guardar cambios" : "Cobrar y generar ticket"}</button>
        </form>
        <RegisteredList
          title="Cobros registrados"
          items={state.payments}
          selected={selected}
          setSelected={setSelected}
          renderMain={(p) => `${p.sector} ${p.numero} - ${p.name}`}
          renderDetail={(p) => `${p.concept} | ${p.method} | ${formatDate(p.date)}`}
          onDelete={(ids) => deletePayments(ids)}
          onEdit={editPayment}
          onPrint={printPayment}
        />
      </section>
      <section className="ticket panel">
        <Ticket payment={lastPayment} mode={ticketMode} />
        <div className="ticket-actions print-hide">
          <button className="ghost" onClick={printPaymentTicket}>Imprimir ticket</button>
          {lastPayment?.sundayDates?.length > 1 && <button className="ghost" onClick={printSundayTickets}>Tickets por domingo</button>}
          <button className="primary" disabled={!lastPayment} onClick={sendWhatsapp}>WhatsApp</button>
        </div>
      </section>
    </div>
  );
}

function Gastos({ state, saveExpense }) {
  const [form, setForm] = useState({ category: "Seguridad", detail: "", amount: "", provider: "", method: "Efectivo", receipt: "", notes: "", date: new Date().toISOString() });
  return (
    <div className="split">
      <section className="panel">
        <div className="panel-head"><h3>Cargar gasto</h3></div>
        <form className="form" onSubmit={(e) => { e.preventDefault(); saveExpense(form); setForm({ ...form, detail: "", amount: "", provider: "", receipt: "", notes: "" }); }}>
          <label>Categoria <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>{["Seguridad", "Mantenimiento", "Personal", "Limpieza", "Servicios", "Alquiler", "Impuestos", "Publicidad", "Insumos", "Otros"].map((x) => <option key={x}>{x}</option>)}</select></label>
          <div className="grid-2">
            <label>Proveedor / persona <input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} /></label>
            <label>Medio <select value={form.method} onChange={(e) => setForm({ ...form, method: e.target.value })}><option>Efectivo</option><option>Transferencia</option><option>Debito</option><option>Credito</option></select></label>
          </div>
          <label>Detalle <input value={form.detail} onChange={(e) => setForm({ ...form, detail: e.target.value })} required /></label>
          <label>Importe <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
          <label>Comprobante <input value={form.receipt} onChange={(e) => setForm({ ...form, receipt: e.target.value })} /></label>
          <label>Observaciones <input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></label>
          <button className="primary">Guardar gasto</button>
        </form>
      </section>
      <section className="panel">
        <div className="panel-head"><h3>Gastos registrados</h3><strong>{pesos.format(sumAmounts(state.expenses))}</strong></div>
        <div className="activity">
          {state.expenses.map((expense) => <ActivityItem key={expense.id} title={expense.category} detail={`${expense.detail} | ${expense.method || ""}`} amount={expense.amount} date={expense.date} />)}
        </div>
      </section>
    </div>
  );
}

function Playa({ state, saveCar, deleteCars, carTicket, setCarTicket, currentUser }) {
  const [form, setForm] = useState({ plate: "", brand: "", color: "", amount: 2000 });
  const [selected, setSelected] = useState([]);
  const today = state.cars.filter((c) => isToday(c.date));

  const printCarTicket = () => {
    if (!carTicket) return;
    printCarReceipt({ ...carTicket, entryUser: carTicket.entryUser || currentUser?.username || "" });
  };

  const resetForm = () => {
    setForm({ plate: "", brand: "", color: "", amount: 2000 });
  };

  const editCar = (car) => {
    setForm({
      id: car.id,
      plate: car.plate,
      brand: car.brand,
      color: car.color,
      amount: car.amount,
      date: car.date,
      entryUser: car.entryUser,
    });
  };

  const printRegisteredCar = (car) => {
    setCarTicket({ ...car, entryUser: car.entryUser || currentUser?.username || "" });
    window.setTimeout(printCarTicket, 0);
  };

  return (
    <div className="split">
      <section className="panel">
        <div className="panel-head">
          <h3>{form.id ? "Editar auto" : "Ingreso de auto"}</h3>
          {form.id && <button className="ghost" onClick={resetForm}>Nuevo ingreso</button>}
        </div>
        <form className="form" onSubmit={(e) => { e.preventDefault(); saveCar(form); resetForm(); }}>
          <label>Patente <input value={form.plate} onChange={(e) => setForm({ ...form, plate: e.target.value })} required /></label>
          <div className="grid-2">
            <label>Marca <input list="carBrands" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} required /></label>
            <label>Color <input list="carColors" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} required /></label>
          </div>
          <datalist id="carBrands">{carBrands.map((x) => <option key={x} value={x} />)}</datalist>
          <datalist id="carColors">{carColors.map((x) => <option key={x} value={x} />)}</datalist>
          <label>Tarifa <input type="number" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required /></label>
          <button className="primary">{form.id ? "Guardar cambios" : "Registrar y cobrar"}</button>
        </form>
        <RegisteredList
          title="Cobros registrados"
          items={today}
          selected={selected}
          setSelected={setSelected}
          renderMain={(c) => c.plate}
          renderDetail={(c) => `${c.brand} | ${c.color} | ${c.entryUser || "Sin entrada"} | ${formatDate(c.date)}`}
          onDelete={(ids) => deleteCars(ids)}
          onEdit={editCar}
          onPrint={printRegisteredCar}
        />
      </section>
      <section className="panel">
        <div className="car-ticket">
          <div className="panel-head"><h3>Comprobante de playa</h3><button className="ghost" disabled={!carTicket} onClick={printCarTicket}>Imprimir</button></div>
          <div className="ticket-copy car-ticket-copy">
            {carTicket ? <CarTicket car={{ ...carTicket, entryUser: carTicket.entryUser || currentUser?.username || "" }} /> : <p>Registre un auto para generar el comprobante.</p>}
          </div>
        </div>
      </section>
    </div>
  );
}

function Estadisticas({ state }) {
  const [period, setPeriod] = useState("today");
  const range = getPeriod(period);
  const occupied = state.puestos.filter((p) => p.ocupacion === "ocupado");
  const payments = state.payments.filter((p) => isBetweenDates(p.date, range.start, range.end));
  const cars = state.cars.filter((c) => isBetweenDates(c.date, range.start, range.end));
  const expenses = state.expenses.filter((e) => isBetweenDates(e.date, range.start, range.end));
  const income = sumAmounts(payments) + sumAmounts(cars);
  const balance = income - sumAmounts(expenses);
  const entryStats = ["ENTRADA 1", "ENTRADA 2", "ENTRADA 3", "ENTRADA 4"].map((entry) => ({
    entry,
    count: cars.filter((car) => car.entryUser === entry).length,
  }));
  const unassignedCars = cars.filter((car) => !car.entryUser || !entryStats.some((item) => item.entry === car.entryUser)).length;
  const maxEntryCount = Math.max(1, ...entryStats.map((item) => item.count), unassignedCars);

  return (
    <>
      <div className="metrics stats-metrics">
        <Metric label="Puestos usados" value={`${occupied.length}/${state.puestos.length}`} />
        <Metric label="Autos ingresados hoy" value={state.cars.filter((c) => isToday(c.date)).length} />
        <Metric label="Ingresos" value={pesos.format(income)} />
        <Metric label="Balance neto" value={pesos.format(balance)} />
      </div>
      <div className="split">
        <section className="panel">
          <div className="panel-head">
            <h3>{range.title}</h3>
            <select className="compact-select" value={period} onChange={(e) => setPeriod(e.target.value)}>
              <option value="today">Hoy</option>
              <option value="sunday">Domingo</option>
              <option value="month">Mes</option>
            </select>
          </div>
          <span className="period-label">{range.label}</span>
          <div className="balance-grid">
            <Balance label="Cobranzas" value={sumAmounts(payments)} />
            <Balance label="Playa de autos" value={sumAmounts(cars)} />
            <Balance label="Gastos" value={sumAmounts(expenses)} />
            <Balance label="Resultado" value={balance} total />
          </div>
        </section>
        <section className="panel">
          <div className="panel-head"><h3>Estado de puestos</h3></div>
          <StatRows items={[
            ["Ocupados", occupied.length, state.puestos.length],
            ["Libres", state.puestos.length - occupied.length, state.puestos.length],
            ["Pagados", occupied.filter((p) => p.pago === "pagado").length, occupied.length || 1],
            ["Pendientes", occupied.filter((p) => p.pago === "pendiente").length, occupied.length || 1],
          ]} />
        </section>
      </div>
      <section className="panel stats-lower">
        <div className="panel-head"><h3>Autos por entrada</h3><strong>{cars.length} total</strong></div>
        <span className="period-label">{range.label}</span>
        <StatRows items={[
          ...entryStats.map((item) => [item.entry, item.count, maxEntryCount]),
          ...(unassignedCars ? [["Sin entrada", unassignedCars, maxEntryCount]] : []),
        ]} />
      </section>
    </>
  );
}

function Usuarios({ users, currentUser, editUser, deleteUser }) {
  return (
    <section className="panel users-panel">
      <div className="panel-head">
        <div>
          <h3>Usuarios del sistema</h3>
          <p className="muted-text">El admin puede crear usuarios y definir que secciones puede abrir cada uno.</p>
        </div>
        <button className="primary" onClick={() => editUser(emptyUser)}>Nuevo usuario</button>
      </div>
      <div className="users-list">
        {users.map((user) => (
          <article className="user-card" key={user.username}>
            <div>
              <strong>{user.username}</strong>
              <span>{user.role === "admin" ? "Admin" : user.role}</span>
              <small>{user.role === "admin" ? "Acceso total" : user.allowedViews.map((viewId) => titles[viewId] || viewId).join(" | ")}</small>
            </div>
            <div className="item-actions">
              <button className="ghost" onClick={() => editUser(user)}>Editar</button>
              <button className="ghost danger-action" disabled={user.username === currentUser.username} onClick={() => deleteUser(user.username)}>Borrar</button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function UserModal({ user, onClose, onSave }) {
  const [form, setForm] = useState({ ...emptyUser, ...user });
  const isAdminRole = form.role === "admin";
  const permissionItems = navItems.filter(([id]) => id !== "usuarios");

  const toggleView = (viewId) => {
    const allowedViews = form.allowedViews.includes(viewId)
      ? form.allowedViews.filter((id) => id !== viewId)
      : [...form.allowedViews, viewId];
    setForm({ ...form, allowedViews });
  };

  const changeRole = (role) => {
    setForm({
      ...form,
      role,
      allowedViews: role === "admin" ? navItems.map(([id]) => id) : form.allowedViews.filter((id) => id !== "usuarios"),
    });
  };

  return (
    <dialog className="modal" open>
      <form className="form modal-card" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <div className="panel-head"><h3>{user.username ? "Editar usuario" : "Nuevo usuario"}</h3><button className="icon" type="button" onClick={onClose}>x</button></div>
        <label>Usuario <input value={form.username} onChange={(e) => setForm({ ...form, username: e.target.value })} disabled={Boolean(user.username)} required /></label>
        <label>Contrasena <input value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required /></label>
        <label>Rol
          <select value={form.role} onChange={(e) => changeRole(e.target.value)}>
            <option value="entrada">Entrada</option>
            <option value="maestro">Operador completo</option>
            <option value="admin">Admin</option>
          </select>
        </label>
        <div className="permissions-box">
          <strong>Permisos</strong>
          {isAdminRole ? (
            <p className="muted-text">El admin tiene acceso completo, incluida la gestion de usuarios.</p>
          ) : (
            <div className="permissions-grid">
              {permissionItems.map(([id, label]) => (
                <label className="check-line" key={id}>
                  <input type="checkbox" checked={form.allowedViews.includes(id)} onChange={() => toggleView(id)} />
                  {label}
                </label>
              ))}
            </div>
          )}
        </div>
        <button className="primary">Guardar usuario</button>
      </form>
    </dialog>
  );
}

function RegisteredList({ title, items, selected, setSelected, renderMain, renderDetail, onDelete, onEdit, onPrint }) {
  const toggle = (id) => setSelected(selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  return (
    <div className="subsection">
      <div className="panel-head"><h3>{title}</h3><button className="ghost danger-action" disabled={!selected.length} onClick={() => { onDelete(selected); setSelected([]); }}>Borrar seleccionados ({selected.length})</button></div>
      <div className="activity">
        {items.length ? items.map((item) => (
          <div className="activity-item" key={item.id}>
            <input className="payment-check" type="checkbox" checked={selected.includes(item.id)} onChange={() => toggle(item.id)} />
            <div className="activity-main"><strong>{renderMain(item)}</strong><br /><small>{renderDetail(item)}</small></div>
            <strong>{pesos.format(item.amount)}</strong>
            <div className="item-actions">
              {onEdit && <button className="ghost" onClick={() => onEdit(item)}>Editar</button>}
              {onPrint && <button className="ghost" onClick={() => onPrint(item)}>Imprimir</button>}
              <button className="ghost danger-action" onClick={() => onDelete([item.id])}>Borrar</button>
            </div>
          </div>
        )) : <p className="empty">Todavia no hay registros.</p>}
      </div>
    </div>
  );
}

function PuestoModal({ puesto, onClose, onSave }) {
  const [form, setForm] = useState({ ...puesto });
  return (
    <dialog className="modal" open>
      <form className="form modal-card" onSubmit={(e) => { e.preventDefault(); onSave(form); }}>
        <div className="panel-head"><h3>{form.id ? "Editar puesto" : "Nuevo puesto"}</h3><button className="icon" type="button" onClick={onClose}>x</button></div>
        <div className="grid-2">
          <label>Sector <select value={form.sector} onChange={(e) => setForm({ ...form, sector: e.target.value })}>{sectors.map((s) => <option key={s}>{s}</option>)}</select></label>
          <label>Numero <input type="number" value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></label>
        </div>
        <div className="grid-2">
          <label>Nombre <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} /></label>
          <label>Apellido <input value={form.apellido} onChange={(e) => setForm({ ...form, apellido: e.target.value })} /></label>
        </div>
        <label>Telefono <input value={form.telefono} onChange={(e) => setForm({ ...form, telefono: e.target.value })} /></label>
        <label>Rubro <input list="rubros" value={form.rubro} onChange={(e) => setForm({ ...form, rubro: e.target.value })} /></label>
        <datalist id="rubros">{rubros.map((r) => <option key={r} value={r} />)}</datalist>
        <div className="grid-2">
          <label>Modalidad <select value={form.modalidad} onChange={(e) => setForm({ ...form, modalidad: e.target.value })}><option>Mensual</option><option>Fin de semana</option></select></label>
          <label>Importe <input type="number" value={form.importe} onChange={(e) => setForm({ ...form, importe: e.target.value })} /></label>
        </div>
        <div className="grid-2">
          <label>Estado <select value={form.ocupacion} onChange={(e) => setForm({ ...form, ocupacion: e.target.value })}><option value="libre">Libre</option><option value="ocupado">Ocupado</option></select></label>
          <label>Pago <select value={form.pago} onChange={(e) => setForm({ ...form, pago: e.target.value })}><option value="pendiente">Pendiente</option><option value="pagado">Pagado</option></select></label>
        </div>
        <button className="primary">Guardar puesto</button>
      </form>
    </dialog>
  );
}

function Ticket({ payment, mode = "single" }) {
  if (!payment) {
    return (
      <div className="ticket-empty">
        <div className="ticket-empty-icon">T</div>
        <strong>Sin comprobante generado</strong>
        <span>Cuando registres un cobro, el ticket aparecera listo para imprimir o enviar por WhatsApp.</span>
      </div>
    );
  }
  if (mode === "split" && payment.sundayDates?.length) {
    const amount = Number(payment.perSundayAmount || payment.amount / payment.sundayDates.length || 0);
    return (
      <div className="split-ticket-pages">
        {payment.sundayDates.map((date) => (
          <TicketCopy
            key={date}
            title={`Comprobante domingo ${formatDateOnly(date)}`}
            payment={{
              ...payment,
              id: `${payment.id}-${date}`,
              concept: `Domingo ${formatDateOnly(date)}`,
              amount,
            }}
          />
        ))}
      </div>
    );
  }
  return (
    <>
      <TicketCopy title="Comprobante para puestero" payment={payment} />
      <TicketCopy title="Duplicado administracion" payment={payment} />
    </>
  );
}

function TicketCopy({ title, payment }) {
  const sundayDates = payment.sundayDates || [];
  return (
    <div className="ticket-copy">
      <div className="ticket-copy-head">
        <h3>Feria Nicolas Serpa</h3>
        <p>{title}</p>
        <p className="ticket-disclaimer">Comprobante no valido como factura.</p>
      </div>
      <div className="ticket-copy-body">
        <div className="ticket-lines">
          {[
            ["Ticket", payment.id.slice(0, 8).toUpperCase()],
            ["Fecha", formatDate(payment.date)],
            ["Puesto", `${payment.sector} ${payment.numero}`],
            ["Titular", payment.name],
            ["Concepto", payment.concept],
            ["Medio", payment.method],
            ["Total", pesos.format(payment.amount)],
          ].map(([label, value]) => <div className="ticket-line" key={label}><span>{label}</span><strong>{value}</strong></div>)}
        </div>
        {sundayDates.length > 0 && (
          <div className="ticket-sundays">
            <span>Domingos incluidos</span>
            <strong>{sundayDates.map((date) => formatDateOnly(date)).join(" | ")}</strong>
          </div>
        )}
      </div>
    </div>
  );
}

function CarTicket({ car }) {
  return (
    <>
      <h3>Feria Nicolas Serpa</h3>
      <p>Comprobante de playa</p>
      <p className="ticket-disclaimer">Comprobante no valido como factura.</p>
      {[
        ["Fecha y hora", formatDate(car.date)],
        ["Patente", car.plate],
        ["Marca", car.brand],
        ["Color", car.color],
        ["Entrada", car.entryUser || "-"],
        ["Importe", pesos.format(car.amount)],
      ].map(([label, value]) => <div className="ticket-line" key={label}><span>{label}</span><strong>{value}</strong></div>)}
      <p className="ticket-warning">
        Por favor, controle que el numero de patente ingresado sea correcto y este legible, sin correcciones. De lo contrario, el seguro de esta playa no tendra validez.
      </p>
    </>
  );
}

function ActivityList({ payments }) {
  return <div className="activity">{payments.length ? payments.map((p) => <ActivityItem key={p.id} title={`${p.sector} ${p.numero} - ${p.name}`} detail={`${p.concept} | ${p.method}`} amount={p.amount} date={p.date} />) : <p className="empty">Todavia no hay movimientos.</p>}</div>;
}

function ActivityItem({ title, detail, amount, date }) {
  return <div className="activity-item"><div className="activity-main"><strong>{title}</strong><br /><small>{detail}<br />{formatDate(date)}</small></div><strong>{pesos.format(amount)}</strong></div>;
}

function Metric({ label, value }) {
  return <article className="metric"><span>{label}</span><strong>{value}</strong></article>;
}

function Balance({ label, value, total }) {
  return <article className={total ? "balance-total" : ""}><span>{label}</span><strong>{pesos.format(value)}</strong></article>;
}

function Badge({ tone, children }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

function StatRows({ items }) {
  return <div className="stat-list">{items.map(([label, value, total]) => <article className="stat-row" key={label}><div className="stat-row-top"><strong>{label}</strong><span>{value} de {total}</span></div><div className="stat-bar"><span style={{ width: `${percent(value, total)}%` }} /></div></article>)}</div>;
}

function loadSessionUser() {
  try {
    const stored = localStorage.getItem(sessionKey);
    if (!stored) return null;
    const sessionUser = JSON.parse(stored);
    return {
      username: sessionUser.username,
      role: sessionUser.role,
      allowedViews: sessionUser.allowedViews,
    };
  } catch {
    localStorage.removeItem(sessionKey);
    return null;
  }
}

function sameMonth(date) {
  const value = new Date(date);
  const now = new Date();
  return value.getMonth() === now.getMonth() && value.getFullYear() === now.getFullYear();
}

function getCurrentMonthSundays() {
  const now = new Date();
  const date = new Date(now.getFullYear(), now.getMonth(), 1);
  const sundays = [];

  while (date.getMonth() === now.getMonth()) {
    if (date.getDay() === 0) sundays.push(new Date(date));
    date.setDate(date.getDate() + 1);
  }

  return sundays;
}

function getPeriod(period) {
  const now = new Date();
  if (period === "month") {
    return {
      title: "Balance del mes",
      label: formatMonthYear(now),
      start: new Date(now.getFullYear(), now.getMonth(), 1),
      end: new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999),
    };
  }
  if (period === "sunday") {
    const sunday = startOfCurrentSunday(now);
    return {
      title: "Balance del domingo",
      label: `${formatDateOnly(sunday)} | Mes: ${formatMonthYear(sunday)}`,
      start: sunday,
      end: endOfDay(sunday),
    };
  }
  return {
    title: "Balance de hoy",
    label: `${formatDateOnly(now)} | Mes: ${formatMonthYear(now)}`,
    start: startOfDay(now),
    end: endOfDay(now),
  };
}
