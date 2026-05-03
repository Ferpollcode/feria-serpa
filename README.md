# Feria Nicolas Serpa

Aplicacion web en React para la gestion diaria de la Feria Nicolas Serpa. Permite administrar puestos, registrar cobranzas, cargar gastos, controlar playa de autos y consultar estadisticas operativas desde una interfaz responsive para escritorio y mobile.

## Funcionalidades

- Panel general con metricas del dia y del mes.
- Mapa visual de puestos por sector.
- Alta y edicion de puestos.
- Filtros por sector, estado y busqueda de puesteros.
- Registro de cobranzas con comprobante.
- Acceso a WhatsApp para enviar comprobantes de pago.
- Registro y listado de gastos.
- Control de ingreso de autos con comprobante de playa.
- Estadisticas por dia, domingo actual y mes.
- Persistencia local en el navegador.
- Diseno responsive con menu mobile desplegable.

## Tecnologias

- React 19
- Vite 7
- JavaScript
- CSS
- LocalStorage

## Requisitos

- Node.js instalado.
- npm instalado.

## Instalacion

```bash
npm install
```

## Uso en desarrollo

```bash
npm run dev
```

Luego abrir la URL indicada por Vite. Normalmente:

```txt
http://localhost:5173
```

## Build de produccion

```bash
npm run build
```

El resultado se genera en `dist/`.

## Vista previa del build

```bash
npm run preview
```

## Estructura del proyecto

```txt
react-app/
  public/
    assets/
      logo-feria-serpa.png
  src/
    App.jsx
    data.js
    main.jsx
    styles.css
    utils.js
  index.html
  package.json
  vite.config.js
```

## Archivos principales

- `src/App.jsx`: componentes y flujos principales de la aplicacion.
- `src/data.js`: sectores, rubros, marcas, colores y opciones de navegacion.
- `src/utils.js`: helpers de fechas, importes, persistencia y formatos.
- `src/styles.css`: estilos generales, responsive, menu, tablas, tickets y modal.
- `public/assets/logo-feria-serpa.png`: logo utilizado en la interfaz.

## Datos locales

La aplicacion guarda la informacion en `localStorage`, usando una clave propia para esta version React. Los datos quedan almacenados en el navegador donde se usa la app.

Si se borra la memoria del navegador o se cambia de dispositivo, esos datos locales no se transfieren automaticamente.

## Comandos disponibles

```bash
npm run dev
npm run build
npm run preview
```

## Notas

- `node_modules/` y `dist/` estan excluidos del repositorio mediante `.gitignore`.
- El proyecto no requiere backend para funcionar en esta version.
- El boton "Recargar demo" restaura datos de ejemplo para pruebas.
