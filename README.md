# Feria Nicolas Serpa - Version React

Esta carpeta contiene la migracion inicial de la aplicacion a React.

## Estructura

- `src/App.jsx`: componentes principales de la app.
- `src/data.js`: sectores, rubros, marcas, colores y navegacion.
- `src/utils.js`: utilidades de fechas, importes, estado local y formatos.
- `src/styles.css`: estilos adaptados desde la version original.
- `public/assets/logo-feria-serpa.png`: logo definitivo.

## Como ejecutar

Requiere Node.js y dependencias de React/Vite.

```bash
npm install
npm run dev
```

Luego abrir la URL que indique Vite, normalmente:

```txt
http://localhost:5173
```

## Alcance migrado

Incluye componentes para:

- Panel general con mapa visual de puestos.
- Gestion de puestos.
- Cobranzas y comprobante.
- Gastos.
- Playa de autos.
- Estadisticas.
- Sidebar, metricas, listas registradas, modal de puesto y tickets.

## Importante

La version HTML original sigue intacta en la carpeta principal. Esta version React usa otra clave de almacenamiento local:

```txt
feria-nicolas-serpa-react-v1
```

Eso evita pisar los datos cargados en la version anterior.
