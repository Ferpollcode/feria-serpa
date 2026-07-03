import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { jsPDF } from "jspdf";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const output = path.join(root, "propuesta-comercial-feria-serpa.pdf");
const logoPath = path.join(root, "public", "assets", "logo-feria-serpa.png");

const pesos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

const proposal = {
  appPrice: 5_400_000,
  installments: 6,
  maintenance: 450_000,
  infrastructureUsd: 45,
  validUntil: "15 dias desde la presentacion",
};

const installmentAmount = proposal.appPrice / proposal.installments;

const doc = new jsPDF({ unit: "mm", format: "a4" });
const page = { width: 210, height: 297, margin: 16 };
const colors = {
  ink: [22, 31, 43],
  muted: [90, 103, 119],
  soft: [236, 241, 246],
  line: [213, 222, 232],
  green: [26, 127, 84],
  teal: [18, 104, 120],
  orange: [223, 129, 38],
  dark: [17, 37, 55],
  white: [255, 255, 255],
};

function setColor(color) {
  doc.setTextColor(...color);
}

function fill(color) {
  doc.setFillColor(...color);
}

function stroke(color) {
  doc.setDrawColor(...color);
}

function text(value, x, y, options = {}) {
  const {
    size = 10,
    color = colors.ink,
    style = "normal",
    maxWidth,
    lineHeight = size * 0.45,
    align,
  } = options;

  doc.setFont("helvetica", style);
  doc.setFontSize(size);
  setColor(color);

  if (!maxWidth) {
    doc.text(String(value), x, y, { align });
    return y + lineHeight;
  }

  const lines = doc.splitTextToSize(String(value), maxWidth);
  doc.text(lines, x, y, { align });
  return y + lines.length * lineHeight;
}

function pill(label, x, y, width, color) {
  fill(color);
  doc.roundedRect(x, y, width, 8, 4, 4, "F");
  text(label, x + width / 2, y + 5.4, {
    size: 8,
    color: colors.white,
    style: "bold",
    align: "center",
  });
}

function card(x, y, width, height, title, body, accent = colors.teal) {
  fill(colors.white);
  stroke(colors.line);
  doc.roundedRect(x, y, width, height, 3, 3, "FD");
  fill(accent);
  doc.roundedRect(x, y, 3.5, height, 2, 2, "F");
  text(title, x + 8, y + 10, { size: 11, style: "bold", color: colors.ink });
  text(body, x + 8, y + 18, { size: 8.7, color: colors.muted, maxWidth: width - 14, lineHeight: 4.2 });
}

function sectionTitle(title, subtitle, y) {
  text(title, page.margin, y, { size: 18, style: "bold", color: colors.ink });
  if (subtitle) {
    return text(subtitle, page.margin, y + 8, {
      size: 9.5,
      color: colors.muted,
      maxWidth: page.width - page.margin * 2,
      lineHeight: 4.5,
    }) + 3;
  }
  return y + 12;
}

function addFooter(pageNumber) {
  stroke(colors.line);
  doc.line(page.margin, 284, page.width - page.margin, 284);
  text("Feria Nicolas Serpa - Propuesta comercial", page.margin, 290, {
    size: 8,
    color: colors.muted,
  });
  text(String(pageNumber), page.width - page.margin, 290, {
    size: 8,
    color: colors.muted,
    align: "right",
  });
}

function addLogo(x, y, width) {
  if (!fs.existsSync(logoPath)) return;
  const image = fs.readFileSync(logoPath).toString("base64");
  doc.addImage(`data:image/png;base64,${image}`, "PNG", x, y, width, width);
}

function drawHero() {
  fill(colors.dark);
  doc.rect(0, 0, page.width, 105, "F");
  fill([21, 70, 82]);
  doc.rect(0, 82, page.width, 23, "F");
  addLogo(156, 16, 34);
  pill("Propuesta comercial", page.margin, 17, 43, colors.orange);
  text("Sistema de gestion integral", page.margin, 40, {
    size: 13,
    color: [197, 218, 225],
    style: "bold",
  });
  text("Feria Nicolas Serpa", page.margin, 56, {
    size: 31,
    color: colors.white,
    style: "bold",
  });
  text(
    "Aplicacion web para administrar puestos, cobranzas, tickets con QR, playa de autos, gastos, usuarios, estadisticas y reportes, con almacenamiento online en Supabase.",
    page.margin,
    70,
    { size: 10.5, color: [223, 235, 240], maxWidth: 125, lineHeight: 5 },
  );

  fill(colors.white);
  doc.roundedRect(page.margin, 118, 178, 37, 4, 4, "F");
  stroke(colors.line);
  doc.roundedRect(page.margin, 118, 178, 37, 4, 4, "S");
  text("Inversion inicial", 24, 132, { size: 9, color: colors.muted, style: "bold" });
  text(pesos.format(proposal.appPrice), 24, 145, { size: 24, color: colors.green, style: "bold" });
  text(`6 cuotas de ${pesos.format(installmentAmount)}`, 103, 138, {
    size: 17,
    color: colors.ink,
    style: "bold",
  });
  text("Incluye desarrollo, configuracion inicial, puesta en marcha y capacitacion basica.", 103, 148, {
    size: 8.5,
    color: colors.muted,
    maxWidth: 78,
    lineHeight: 4,
  });
}

function pageOne() {
  drawHero();

  let y = 174;
  y = sectionTitle("Que resuelve", "Una herramienta operativa para reemplazar planillas, tickets manuales y controles dispersos.", y);
  card(16, y, 55, 37, "Cobranza ordenada", "Registro de pagos por puesto, tickets imprimibles, duplicado de administracion, QR de verificacion y PDF para WhatsApp.", colors.green);
  card(77, y, 55, 37, "Control del predio", "Mapa y listado de puestos por sector, busquedas, estados de ocupacion, importes, rubros y modalidades.", colors.teal);
  card(138, y, 55, 37, "Datos disponibles", "Sincronizacion con Supabase, respaldo local y consulta desde distintos equipos segun permisos.", colors.orange);

  y += 52;
  y = sectionTitle("Modulos incluidos", "", y);
  const modules = [
    ["Panel", "metricas del dia, mes, balance e indicadores"],
    ["Puestos", "altas, ediciones, sectores, pagos y reportes"],
    ["Cobranza", "tickets, QR, PDF, WhatsApp y medios de pago"],
    ["Gastos", "categorias, comprobantes, proveedores y notas"],
    ["Playa", "ingreso de autos, ticket, QR y auditoria"],
    ["Usuarios", "roles, permisos y accesos diferenciados"],
  ];
  modules.forEach(([title, body], index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = page.margin + col * 91;
    const itemY = y + row * 15;
    fill(colors.soft);
    doc.roundedRect(x, itemY, 84, 10.5, 2, 2, "F");
    text(title, x + 4, itemY + 6.5, { size: 8.7, style: "bold", color: colors.ink });
    text(body, x + 23, itemY + 6.5, { size: 7.6, color: colors.muted, maxWidth: 56, lineHeight: 3.4 });
  });

  addFooter(1);
}

function pageTwo() {
  doc.addPage();
  fill([248, 250, 252]);
  doc.rect(0, 0, page.width, page.height, "F");

  let y = 22;
  y = sectionTitle("Plan comercial conveniente", "Propuesta pensada para facilitar la contratacion sin bajar el alcance operativo del sistema.", y);

  fill(colors.white);
  stroke(colors.line);
  doc.roundedRect(page.margin, y, 178, 58, 4, 4, "FD");
  text("Desarrollo + implementacion", 26, y + 13, { size: 11, color: colors.muted, style: "bold" });
  text(pesos.format(proposal.appPrice), 26, y + 30, { size: 27, color: colors.green, style: "bold" });
  text("Forma de pago", 122, y + 13, { size: 10, color: colors.muted, style: "bold" });
  text(`${proposal.installments} cuotas fijas`, 122, y + 27, { size: 18, color: colors.ink, style: "bold" });
  text(pesos.format(installmentAmount), 122, y + 42, { size: 18, color: colors.orange, style: "bold" });
  text("por cuota", 168, y + 42, { size: 8.5, color: colors.muted });
  y += 72;

  const included = [
    "Aplicacion web lista para usar en escritorio y celular.",
    "Configuracion de Supabase para almacenamiento online.",
    "Publicacion inicial en hosting web.",
    "Carga inicial o migracion basica de datos disponibles.",
    "Capacitacion inicial para administracion, cobranza y entrada.",
    "Ajustes menores de puesta en marcha durante el periodo de entrega.",
  ];

  text("Incluye", page.margin, y, { size: 14, style: "bold", color: colors.ink });
  y += 7;
  included.forEach((item) => {
    fill(colors.green);
    doc.circle(page.margin + 2, y - 1.4, 1.4, "F");
    text(item, page.margin + 7, y, { size: 9.2, color: colors.ink, maxWidth: 165, lineHeight: 4.2 });
    y += 8;
  });

  y += 6;
  text("Mantenimiento mensual", page.margin, y, { size: 14, style: "bold", color: colors.ink });
  y += 9;
  card(page.margin, y, 84, 42, "Soporte y mejoras", `${pesos.format(proposal.maintenance)} por mes. Incluye soporte operativo, pequenos ajustes, control de funcionamiento, asistencia ante errores y acompanamiento de uso.`, colors.teal);
  card(110, y, 84, 42, "Datos e infraestructura", `Costo base estimado: USD ${proposal.infrastructureUsd}/mes. Incluye Vercel Pro y Supabase Pro como referencia. Se cobra aparte o se ajusta al costo real del proveedor.`, colors.orange);

  y += 58;
  text("Condiciones sugeridas", page.margin, y, { size: 14, style: "bold", color: colors.ink });
  y += 8;
  const terms = [
    `Validez de la propuesta: ${proposal.validUntil}.`,
    "El mantenimiento comienza luego de la puesta en produccion.",
    "Cambios grandes, nuevos modulos o integraciones externas se cotizan aparte.",
    "Los datos quedan almacenados en Supabase y pueden respaldarse periodicamente.",
  ];
  terms.forEach((item) => {
    text(`- ${item}`, page.margin, y, { size: 9, color: colors.muted, maxWidth: 174, lineHeight: 4.3 });
    y += 7;
  });

  addFooter(2);
}

function pageThree() {
  doc.addPage();
  fill(colors.dark);
  doc.rect(0, 0, page.width, page.height, "F");

  addLogo(158, 18, 32);
  text("Resumen de contratacion", page.margin, 34, { size: 26, color: colors.white, style: "bold" });
  text("Una app pensada para ordenar la administracion diaria de la feria y darle trazabilidad a la cobranza, la playa de autos y los datos operativos.", page.margin, 49, {
    size: 10.5,
    color: [219, 233, 238],
    maxWidth: 128,
    lineHeight: 5,
  });

  fill(colors.white);
  doc.roundedRect(page.margin, 79, 178, 82, 4, 4, "F");
  text("Oferta recomendada", 28, 96, { size: 13, color: colors.muted, style: "bold" });
  text(`${proposal.installments} cuotas de ${pesos.format(installmentAmount)}`, 28, 116, {
    size: 25,
    color: colors.green,
    style: "bold",
  });
  text(`Total: ${pesos.format(proposal.appPrice)}`, 28, 131, {
    size: 14,
    color: colors.ink,
    style: "bold",
  });
  text(`Mantenimiento: ${pesos.format(proposal.maintenance)}/mes + infraestructura`, 28, 144, {
    size: 11,
    color: colors.muted,
    style: "bold",
  });

  const rows = [
    ["Aplicacion", "Gestion integral de feria"],
    ["Datos", "Supabase + respaldo local"],
    ["Entrega", "Deploy, configuracion y capacitacion basica"],
    ["Soporte", "Mantenimiento mensual recomendado"],
  ];
  let y = 184;
  rows.forEach(([label, value]) => {
    stroke([66, 95, 112]);
    doc.line(page.margin, y + 7, page.width - page.margin, y + 7);
    text(label, page.margin, y, { size: 9, color: [161, 190, 202], style: "bold" });
    text(value, 70, y, { size: 11, color: colors.white, style: "bold" });
    y += 18;
  });

  fill(colors.orange);
  doc.roundedRect(page.margin, 260, 178, 16, 4, 4, "F");
  text("Propuesta lista para avanzar con implementacion y uso operativo.", page.width / 2, 270, {
    size: 10.5,
    color: colors.white,
    style: "bold",
    align: "center",
  });
}

pageOne();
pageTwo();
pageThree();

fs.writeFileSync(output, Buffer.from(doc.output("arraybuffer")));
console.log(output);
