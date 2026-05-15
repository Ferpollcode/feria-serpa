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
- Persistencia compartida en Supabase con respaldo local en el navegador.
- Diseno responsive con menu mobile desplegable.

## Tecnologias

- React 19
- Vite 7
- JavaScript
- CSS
- Supabase
- LocalStorage como respaldo local

## Requisitos

- Node.js instalado.
- npm instalado.

## Instalacion

```bash
npm install
```

## Uso en desarrollo

Crear un archivo `.env` basado en `.env.example`:

```txt
VITE_SUPABASE_URL=https://TU-PROYECTO.supabase.co
VITE_SUPABASE_ANON_KEY=TU_ANON_KEY
```

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

## Configuracion de Supabase

1. Abrir el SQL Editor del proyecto en Supabase.
2. Ejecutar el contenido de `supabase.sql`.
3. Copiar `Project URL` y `anon public key` desde Supabase.
4. Pegarlos en `.env`.
5. Reiniciar `npm run dev`.

La app guarda el estado completo en la tabla `app_state`, fila `feria-serpa`. Si la tabla esta vacia, la primera carga sube el estado local actual como estado inicial.

Para cargar manualmente el estado base actual en Supabase:

```bash
npm run seed:supabase
```

El estado guardado incluye puestos, cobranzas, gastos, autos y usuarios.

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
    remoteState.js
    supabaseClient.js
    styles.css
    utils.js
  index.html
  package.json
  supabase.sql
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
