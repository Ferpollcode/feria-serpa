import { useEffect, useMemo, useState } from "react";
import { carBrands, carColors, navItems, rubros, sectors, users } from "./data.js";
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
};

const sessionKey = "feria-serpa-current-user";

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

export function App() {
  const [state, setState] = useState(loadState);
  const [currentUser, setCurrentUser] = useState(() => loadSessionUser());
  const [view, setView] = useState(() => loadSessionUser()?.allowedViews[0] || "dashboard");
  const [selectedMapSector, setSelectedMapSector] = useState("Calle A");
  const [editingPuesto, setEditingPuesto] = useState(null);
  const [lastPayment, setLastPayment] = useState(null);
  const [carTicket, setCarTicket] = useState(null);

  useEffect(() => saveState(state), [state]);

  useEffect(() => {
    if (!currentUser) return;
    if (!currentUser.allowedViews.includes(view)) setView(currentUser.allowedViews[0]);
  }, [currentUser, view]);

  const login = ({ username, password }) => {
    const normalizedUsername = username.trim().toUpperCase().replace(/\s+/g, " ");
    const user = users.find((item) => item.username === normalizedUsername && item.password === password);
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

  if (!currentUser) return <LoginScreen onLogin={login} />;

  return (
    <div className="app-shell">
      <Sidebar view={view} setView={setView} currentUser={currentUser} onLogout={logout} />
      <main className="shell">
        <header className="topbar">
          <div>
            <p className="eyebrow">Operacion diaria</p>
            <h2>{titles[view]}</h2>
          </div>
          {currentUser.role === "maestro" && (
            <div className="top-actions">
              <button className="ghost" onClick={resetDemo}>Recargar demo</button>
              <button className="primary" onClick={() => setEditingPuesto(emptyPuesto)}>Nuevo puesto</button>
            </div>
          )}
        </header>

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
      </main>

      {editingPuesto && <PuestoModal puesto={editingPuesto} onClose={() => setEditingPuesto(null)} onSave={savePuesto} />}
    </div>
  );
}

function LoginScreen({ onLogin }) {
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
  const availableNavItems = navItems.filter(([id]) => currentUser.allowedViews.includes(id));
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
  const [form, setForm] = useState({ puestoId: occupied[0]?.id || "", concept: "Canon mensual", method: "Efectivo", amount: occupied[0]?.importe || 0 });
  const [selected, setSelected] = useState([]);
  const puesto = state.puestos.find((p) => p.id === form.puestoId);

  useEffect(() => {
    if (puesto && !form.id) setForm((current) => ({ ...current, amount: puesto.importe }));
  }, [form.puestoId]);

  const resetForm = () => {
    setForm({ puestoId: occupied[0]?.id || "", concept: "Canon mensual", method: "Efectivo", amount: occupied[0]?.importe || 0 });
  };

  const editPayment = (payment) => {
    setForm({
      id: payment.id,
      puestoId: payment.puestoId,
      concept: payment.concept,
      method: payment.method,
      amount: payment.amount,
      date: payment.date,
    });
  };

  const printPayment = (payment) => {
    setLastPayment(payment);
    window.setTimeout(printPaymentTicket, 0);
  };

  const printPaymentTicket = () => {
    document.body.classList.add("printing-payment-ticket");
    const cleanup = () => document.body.classList.remove("printing-payment-ticket");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
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
          <label>Concepto
            <select value={form.concept} onChange={(e) => setForm({ ...form, concept: e.target.value })}>
              <option>Canon mensual</option><option>Fin de semana</option><option>Reserva</option><option>Deuda anterior</option>
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
        <Ticket payment={lastPayment} />
        <div className="ticket-actions print-hide">
          <button className="ghost" onClick={printPaymentTicket}>Imprimir ticket</button>
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
    document.body.classList.add("printing-car-ticket");
    const cleanup = () => document.body.classList.remove("printing-car-ticket");
    window.addEventListener("afterprint", cleanup, { once: true });
    window.print();
    window.setTimeout(cleanup, 1000);
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

function Ticket({ payment }) {
  if (!payment) return <div className="ticket-copy"><p>Emita un cobro para generar el comprobante.</p></div>;
  return (
    <>
      <TicketCopy title="Comprobante para puestero" payment={payment} />
      <TicketCopy title="Duplicado administracion" payment={payment} />
    </>
  );
}

function TicketCopy({ title, payment }) {
  return (
    <div className="ticket-copy">
      <h3>Feria Nicolas Serpa</h3>
      <p>{title}</p>
      <p className="ticket-disclaimer">Comprobante no valido como factura.</p>
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
    const user = users.find((item) => item.username === sessionUser.username);
    if (!user) return null;
    return {
      username: user.username,
      role: user.role,
      allowedViews: user.allowedViews,
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
