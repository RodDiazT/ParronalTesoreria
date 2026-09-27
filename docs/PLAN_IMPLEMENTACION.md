# Plan de Implementación Técnica — Tesorería Parronal

**Fecha:** 2026-09-27  
**Meta de puesta en uso (Núcleo v1.0):** 2026-10-04  
**Fecha del Evento Concurso:** 2026-11-21  
**Responsable:** Rod Díaz (Administrador)  
**Ejecutor:** Antigravity  

---

## 1. Estrategia General de Implementación

Este plan define la hoja de ruta paso a paso para implementar el software del portal de tesorería a partir de los documentos aprobados en `docs/`.

### 1.1 Principios Rectores de la Ejecución
1. **El núcleo primero (Meta 2026-10-04):** Prioridad absoluta al flujo operativo esencial de v1.0: Acceso y Roles → Organización → Movimientos y Respaldos → Participantes → Inscripción de Binomios → Dashboard. Las funcionalidades de v1.1 (Importación Excel asistida por IA, Formulario público sin login, Registro sin señal, Conciliación bancaria y Rendición final) quedan aisladas para su ejecución a partir del 05 de octubre.
2. **Aislamiento por defecto:** Ninguna consulta a datos de negocio se ejecuta sin pasar por el contexto de organización (`db(ctx)`), reforzado por la regla de ESLint `no-restricted-imports`.
3. **Un registro, una verdad:** Los montos e indicadores del dashboard se calculan a partir de los movimientos no anulados de dinero; no existen tablas duplicadas ni saldos estáticos preguardados.
4. **Celular primero:** Cada formulario se diseña para uso con una sola mano en terreno exterior, con teclado numérico, compresión previa de fotos en cliente y reintento idempotente (`claveCliente`).
5. **Cumplimiento normativo estricto:** Ley 19.628 y Ley 21.719 incorporadas desde el código: consentimiento informado al ingresar, datos personales de menores protegidos con alertas no bloqueantes, rol observador con supresión de datos sensibles en servidor, y archivos de respaldo no públicos servidos bajo autenticación.

---

## 2. Mapa de Fases y Progreso

```
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 1: Esqueleto, Base de Datos, Carga Inicial y Núcleo [COMPLETADA]   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 2: Acceso, Privacidad y Gestión de Miembros (docs/acceso)         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 3: UX/UI Base, Configuración y Contrapartes (docs/organizacion)   │
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 4: Movimientos, Respaldos y Validación (docs/movimientos)         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 5: Participantes: Jinetes, Caballos y Clubes (docs/inscripciones) │
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 6: Binomios, Pruebas, Cargos y Pagos (docs/inscripciones)         │
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 7: Dashboard por Rol y Traspasos (docs/dashboard)                 │
└────────────────────────────────────┬───────────────────────────────────┘
                                     ▼
┌────────────────────────────────────────────────────────────────────────┐
│ FASE 8: Pruebas Integrales, Despliegue en Railway y Puesta en Uso      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detalle de Ejecución por Fase

### Fase 1: Esqueleto Técnico, Base de Datos y Aislamiento (Completada el 2026-09-27)
- [x] **1.1 Dependencias e Inicialización:** Configurado `package.json` (Next.js 15, React 19, Auth.js v5 beta, Prisma 6, Zod, Tailwind CSS v4, Lucide, Sonner, Vitest).
- [x] **1.2 Esquema de Prisma (`prisma/schema.prisma`):** Los 24 modelos y enums creados con mapeo `snake_case` a nivel de base de datos.
- [x] **1.3 Migración en Railway Postgres:** Creadas las 24 tablas, índices únicos parciales (`evento_un_abierto`, `binomio_no_anulado`, `inscripcion_no_anulada`) y todas las restricciones `CHECK` de reglas de negocio en la base de datos de producción.
- [x] **1.4 Carga Inicial (`scripts/carga-inicial.ts`):** Creada la organización *Club Ecuestre Parronal Las Marias*, evento *Concurso Ecuestre Parronal* (2026-11-21), administrador `rodrigodiaztapia@gmail.com` y 13 categorías iniciales. Idempotencia verificada.
- [x] **1.5 Aislamiento y Auditoría (`src/lib/contexto.ts`):** `obtenerContexto()` multi-tenant, `db(ctx)` con inyección automática de `organizacionId`, `exigirDeLaOrganizacion()` y `registrarAuditoria()`. Regla de ESLint `no-restricted-imports`.
- [x] **1.6 Matriz de Permisos (`src/lib/permisos.ts`):** Tabla única de roles y acciones con `puede(ctx, accion)`, `exigir()`, `esPropio()`, `exigirNoPropio()`. 16 tests unitarios en Vitest pasando al 100%.
- [x] **1.7 Autenticación (`src/lib/auth/adaptador.ts` y `src/lib/auth.ts`):** Adaptador propio para Auth.js sobre el modelo `Usuario` en español. `src/middleware.ts` para Edge runtime.

---

### Fase 2: Acceso, Privacidad y Gestión de Miembros
**Documento base:** `docs/acceso/acceso-roles.md`

#### Paso 2.1: Pantallas Públicas de Ingreso y Privacidad
- **Archivos:** `src/app/ingresar/page.tsx`, `src/app/privacidad/page.tsx`.
- **Qué hace:**
  - `/ingresar`: Botón de inicio de sesión con Google (`signIn("google")`), sin revelar datos ni nombres del club a extraños (marco §9.4). Muestra mensajes de error claros en español (cuenta no verificada, sesión expirada).
  - `/privacidad`: Texto completo y estático del aviso de privacidad según §3.8 (finalidad, derechos Ley 19.628 y 21.719, conservación hasta 1 año post rendición, encargado Google Gemini).

#### Paso 2.2: Bienvenida y Aceptación de Privacidad
- **Archivos:** `src/app/bienvenida/page.tsx`, `src/dominio/acceso/acciones.ts` (`aceptarAviso`).
- **Qué hace:**
  - Resumen del aviso con casilla obligatoria de consentimiento informado antes de habilitar el botón "Continuar".
  - Registra `avisoVersion: 1`, `avisoAceptadoEn: now()` y auditoría inmutable `aceptar_aviso`.

#### Paso 2.3: Solicitud de Acceso para Nuevos Usuarios
- **Archivos:** `src/app/solicitud/page.tsx`, `src/dominio/acceso/acciones.ts` (`solicitarAcceso`).
- **Qué hace:**
  - Pantalla para usuarios con sesión pero sin membresía activa. Estados visuales: "Solicitud enviada", "Acceso rechazado" (con opción de reintentar si el administrador lo autoriza), "Acceso revocado".
  - Utiliza `obtenerOrganizacionUnica()` para asociar la solicitud sin violar aislamiento.

#### Paso 2.4: Administración de Usuarios y Solicitudes
- **Archivos:** `src/app/usuarios/page.tsx`, `src/dominio/acceso/acciones.ts` (`aprobarSolicitud`, `rechazarSolicitud`, `invitar`, `cambiarRol`, `revocar`, `reactivar`).
- **Qué hace:**
  - Pestañas: *Solicitudes pendientes* (con contador), *Con acceso*, *Sin acceso* y botón *Invitar por correo*.
  - Regla crítica transaccional: Bloqueo `SELECT FOR UPDATE` para garantizar que la organización nunca quede sin al menos un administrador activo (§5.3).
  - Al revocar o reactivar, elimina de inmediato las sesiones activas (`Session`) de ese usuario.

#### Paso 2.5: Comisión y Perfil de Usuario
- **Archivos:** `src/app/comision/page.tsx`, `src/app/mi-cuenta/page.tsx`.
- **Qué hace:**
  - `/comision`: Lista accesible para ayudantes y observadores con nombre, foto y rol de miembros activos (sin correos personales).
  - `/mi-cuenta`: Datos propios, rol, aceptación del aviso y botón "Cerrar sesión en todos mis dispositivos".

**Criterios de verificación de Fase 2:**
- Tests en Vitest de transiciones de estado de `Membresia`.
- Test de concurrencia: intento simultáneo de revocar al último administrador rechazado.
- Login verificado con Google OAuth y redirección automática por middleware.

---

### Fase 3: Sistema Visual, Estructura de Pantalla y Configuración
**Documentos base:** `docs/interfaz/ux-ui.md` y `docs/organizacion/organizacion-evento.md`

#### Paso 3.1: Componentes Base de Interfaz (UX/UI §5.4)
- **Archivos:**
  - `src/components/app/estructura.tsx`: Shell con encabezado, menú (hamburguesa en móvil, lateral en escritorio), botón flotante `+` con espacio inferior de resguardo (safe area).
  - `src/components/app/encabezado.tsx`: Título de sección o botón volver `←`, logo y nombre del evento vigente.
  - `src/components/app/estado.tsx`: Chip con los 4 tonos normados (Verde listo, Ámbar falta, Rojo problema, Gris fuera) y palabra obligatoria.
  - `src/components/app/monto.tsx`: Formateo CLP (`$1.250.000`), números monoespaciados (`tabular-nums`), verde ingreso, rojo gasto.
  - `src/components/app/fecha.tsx`: Formateo America/Santiago ("Hoy", "Ayer", "12 oct").
  - `src/lib/presentacion/formato.ts` y `src/lib/presentacion/estado.ts`: Funciones puras con pruebas unitarias.

#### Paso 3.2: Configuración del Evento y Organización
- **Archivos:** `src/app/configuracion/page.tsx`, `src/app/configuracion/evento/page.tsx`, `src/app/configuracion/organizacion/page.tsx`, `src/app/api/organizacion/logo/route.ts`.
- **Qué hace:**
  - Editar nombre del evento, fechas (inicio, término, referencia edad), lugar. Control por `version` concurrente.
  - Subida de logo del club (PNG, JPEG, WebP hasta 1 MB, no SVG) guardado en volumen `RUTA_RESPALDOS/organizacion/...` y servido solo con sesión activa.

#### Paso 3.3: Configuración de Categorías
- **Archivos:** `src/app/configuracion/categorias/page.tsx`, `src/dominio/organizacion/categorias.ts`.
- **Qué hace:**
  - Listas de ingresos y gastos. Crear, renombrar, desactivar, reactivar y reordenar.
  - Protección de categorías de sistema (`inscripciones`, `devoluciones`, `aporte_inicial` no se desactivan ni cambian de tipo).
  - Marca `exigeContraparte`.

#### Paso 3.4: Gestión de Contrapartes (Auspiciadores y Proveedores)
- **Archivos:** `src/app/contrapartes/page.tsx`, `src/app/contrapartes/[id]/page.tsx`, `src/dominio/organizacion/contrapartes.ts`.
- **Qué hace:**
  - Listado con búsqueda por texto y filtro por tipo. Ficha con movimientos asociados.
  - Creación y edición con aviso de nombres parecidos (`normalizarNombre`) y bloqueo por RUT duplicado.
  - Fusión de duplicados con reasignación de movimientos y auditoría única.
  - Supresión de contacto y RUT para observancia de derechos de privacidad.
  - Componente `<SelectorContraparte>` para integración con formularios.

---

### Fase 4: Movimientos, Respaldos y Validación de Tesorería
**Documento base:** `docs/movimientos/movimientos.md`

#### Paso 4.1: Formulario de Registro Rápido (Celular Primero)
- **Archivos:** `src/components/app/hoja-registrar.tsx`, `src/app/movimientos/nuevo/page.tsx`.
- **Qué hace:**
  - Selección de tipo (Gasto / Ingreso), monto en CLP con teclado numérico, fecha de ocurrencia, medio de pago (transferencia, efectivo, otro).
  - Estado de pago: `pagado` o `pendiente`. Si es gasto pagado por un ayudante de su bolsillo (`pagadoPorId`), nace como por pagar a esa persona.
  - Selectores desplegables de categoría y contraparte (con opción de creación en línea en un toque).
  - Regla de respaldo u observación: subida de comprobante o casilla obligatoria `sinRespaldo` con justificación.

#### Paso 4.2: Compresión y Servidor Seguro de Respaldos
- **Archivos:** `src/lib/archivos/compresion.ts`, `src/app/api/respaldos/[id]/route.ts`.
- **Qué hace:**
  - Compresión en el cliente con HTML5 Canvas (máx. 1600 px, JPEG) para envíos ultrarrápidos con baja señal.
  - Almacenamiento seguro en disco persistente (`/data/respaldos/movimientos/...`).
  - Route handler que valida membresía y rol (oculto para observador) con cabeceras `Cache-Control: private, no-store`.

#### Paso 4.3: Acciones de Servidor de Movimientos
- **Archivos:** `src/dominio/movimientos/acciones.ts`.
- **Qué hace:**
  - `registrarMovimiento`: Idempotencia por `claveCliente`, autovalidación de administradores, aviso de duplicados (±1 día y mismo monto).
  - `editarMovimiento` y `anularMovimiento`: Control por `version`, motivo de anulación obligatorio, nunca borrado físico.

#### Paso 4.4: Bandeja de Validación y Observación
- **Archivos:** `src/app/movimientos/page.tsx` (pestañas *Por validar*, *Observados*, *Todos*).
- **Qué hace:**
  - Validación individual por el administrador revisando el comprobante.
  - Acción de `observarMovimiento`: comentario obligatorio, devuelve el ítem al ayudante para corrección.
  - Aplicación estricta de `exigirNoPropio`: nadie valida sus propios movimientos.

#### Paso 4.5: Cobranzas, Pagos de Pendientes y Abonos
- **Archivos:** `src/dominio/movimientos/abonos.ts`.
- **Qué hace:**
  - Marcar pagado: total o creación de abono parcial enlazado (`abonoDeId`).
  - Bloqueo de fila para evitar condiciones de carrera en pagos simultáneos.
  - Deducción de saldos al validarse el abono.

---

### Fase 5: Participantes (Jinetes, Caballos, Apoderados y Clubes)
**Documento base:** `docs/inscripciones/participantes.md`

#### Paso 5.1: Reglas de Edad, Alertas y Duplicados
- **Archivos:** `src/dominio/inscripciones/participantes/reglas.ts`.
- **Qué hace:**
  - `edadEnEvento`: cálculo exacto de años cumplidos a la fecha de referencia del concurso.
  - `alertasJinete`: menor sin apoderado, menor de 14 sin autorización registrada, jinete sin fecha de nacimiento.
  - `buscarParecidos`: detección de similitudes fonéticas y ortográficas para evitar duplicados.

#### Paso 5.2: Fichas y Creación de Participantes
- **Archivos:**
  - `src/app/participantes/page.tsx`: pestañas Jinetes, Caballos, Clubes, Apoderados (oculto a observador), filtro *Con alertas*.
  - `src/app/participantes/jinetes/nuevo/page.tsx`, `src/app/participantes/jinetes/[id]/page.tsx`.
  - Acciones: crear, vincular apoderado, registrar fecha de autorización, fusión de jinetes/caballos duplicados.
  - Selectores reutilizables: `<SelectorClub>`, `<SelectorJinete>`, `<SelectorCaballo>`, `<SelectorApoderado>`.

---

### Fase 6: Inscripción de Binomios, Pruebas y Pagos
**Documento base:** `docs/inscripciones/inscripcion-binomios.md`

#### Paso 6.1: Configuración de Pruebas y Conceptos
- **Archivos:** `src/app/configuracion/pruebas/page.tsx`, `src/app/configuracion/conceptos/page.tsx`.
- **Qué hace:**
  - Pruebas del concurso con tarifa y límites de edad mínima/máxima.
  - Conceptos adicionales: cuota por binomio (automática al inscribir), alojamiento y pensión.

#### Paso 6.2: Inscripción de Binomios en Terreno
- **Archivos:** `src/app/inscripciones/page.tsx`, `src/app/inscripciones/nueva/page.tsx`, `src/dominio/inscripciones/binomios/acciones.ts`.
- **Qué hace:**
  - Selección de jinete, caballo y pruebas en un solo flujo rápido.
  - Carga automática de la cuota por binomio (`automatico: true`).
  - Avisos de edad por prueba no bloqueantes.
  - Manejo de descuentos o becas con motivo obligatorio.

#### Paso 6.3: Registro y Asignación de Pagos de Inscripción
- **Archivos:** `src/dominio/inscripciones/binomios/pagos.ts`.
- **Qué hace:**
  - El pago crea un movimiento de ingreso en categoría de sistema `inscripciones`.
  - Algoritmo `repartirMonto`: reparte el valor transferido entre las inscripciones y cargos pendientes (de más antiguo a más nuevo).
  - Si sobra dinero, queda registrado como `porAsignar`.
  - Función única de estado `estadoItem` (pendiente, parcial, pagado, becado, retirado).

#### Paso 6.4: Retiros, Devoluciones y Cobranza WhatsApp
- **Archivos:** `src/dominio/inscripciones/binomios/retiros.ts`.
- **Qué hace:**
  - Retiro de prueba o binomio con devolución total, parcial o retención (crea gasto en categoría `devoluciones`).
  - Copiar estado de cuenta formateado para cobro vía WhatsApp (fichas de jinete y club).

---

### Fase 7: Dashboard y Traspasos entre Medios de Pago
**Documento base:** `docs/dashboard/dashboard.md`

#### Paso 7.1: Consultas de Agregación y KPIs
- **Archivos:** `src/dominio/dashboard/calculos.ts`.
- **Qué hace:**
  - Cálculos en SQL optimizados según marco §6.7:
    - Ingresos percibidos (pagados y validados).
    - Gastos pagados.
    - **Saldo de caja** (Ingresos − Gastos).
    - Saldo por medio de pago: Banco (`transferencia`) y `efectivo`.
    - Por cobrar (ingresos pendientes + saldo de inscripciones no anuladas).
    - Por pagar (gastos pendientes + reembolsos a la comisión).
    - Resultado proyectado.
    - Por validar y Por asignar (destacados aparte).

#### Paso 7.2: Traspasos entre Medios de Pago
- **Archivos:** `src/app/traspasos/page.tsx`, `src/dominio/dashboard/traspasos.ts`.
- **Qué hace:**
  - Traspasos Banco ↔ Efectivo (depósito de recaudación en cancha o retiro de caja chica).
  - Obligatoriedad de comprobante de depósito u observación detallada.

#### Paso 7.3: Pantalla de Inicio `/` según Rol
- **Archivos:** `src/app/page.tsx`, `src/components/app/inicio-administrador.tsx`, `src/components/app/inicio-ayudante.tsx`.
- **Qué hace:**
  - Administrador: bloque *Por revisar* (solicitudes, movimientos por validar, por asignar, alertas) + Saldo + Indicadores + Botón *Copiar resumen*.
  - Ayudante: bloque *Lo mío* (mis movimientos por validar, observados con comentario del admin, reembolsos que me deben) + Saldo + Indicadores.
  - Observador: Saldo + Indicadores + Botón *Copiar resumen*.

---

### Fase 8: Pruebas Integrales, Despliegue en Railway y Puesta en Marcha
- [ ] **8.1 Suite de Pruebas Automatizadas:**
  - Tests de aislamiento: verificación de que ninguna consulta pueda acceder a otra organización.
  - Tests de cuadratura de caja y saldo por medio de pago.
  - Tests de integridad de retiros y pagos parciales.
- [ ] **8.2 Configuración de Build y Despliegue en Railway:**
  - Verificación del comando de inicio `prisma generate && next build && next start`.
  - Configuración de dominios públicos de Railway.
- [ ] **8.3 Puesta en Marcha (Meta 2026-10-04):**
  - Validación con los administradores en teléfono móvil.
  - Inicio de registros de gastos previos de preparación del concurso.

---

## 4. Matriz de Trazabilidad entre Documentos y Código

| Documento | Estado | Modelos Prisma | Módulos de Código Principales | Rutas y Pantallas |
|---|---|---|---|---|
| `marco-general-proyecto.md` | Aprobado (v1.7) | `Organizacion`, `RegistroAuditoria` | `src/lib/permisos.ts`, `src/lib/contexto.ts`, `src/lib/db.ts` | Toda la app |
| `acceso-roles.md` | Aprobado (v1.4) | `Usuario`, `Membresia`, `Account`, `Session` | `src/lib/auth.ts`, `src/lib/auth/adaptador.ts`, `src/dominio/acceso/` | `/ingresar`, `/privacidad`, `/bienvenida`, `/solicitud`, `/usuarios`, `/mi-cuenta`, `/comision` |
| `organizacion-evento.md` | Aprobado (v1.3) | `Evento`, `Categoria`, `Contraparte` | `src/dominio/organizacion/`, `src/lib/utilidades.ts` | `/configuracion/*`, `/contrapartes/*` |
| `movimientos.md` | Aprobado (v1.4) | `Movimiento`, `Respaldo` | `src/dominio/movimientos/`, `src/lib/archivos/` | `/movimientos/*`, `/api/respaldos/*` |
| `participantes.md` | Aprobado (v1.0) | `Club`, `Jinete`, `Apoderado`, `JineteApoderado`, `Caballo` | `src/dominio/inscripciones/participantes/` | `/participantes/*` |
| `inscripcion-binomios.md` | Aprobado (v1.4) | `Prueba`, `Concepto`, `Binomio`, `Inscripcion`, `Cargo`, `Pago`, `Devolucion` | `src/dominio/inscripciones/binomios/` | `/inscripciones/*` |
| `dashboard.md` | Aprobado (v1.2) | `Traspaso` | `src/dominio/dashboard/` | `/` (inicio), `/traspasos/*` |
| `ux-ui.md` | Aprobado (v1.0) | — | `src/components/app/`, `src/components/ui/`, `src/lib/presentacion/` | Todos los layouts y componentes visuales |
| `importacion-excel.md` | Aprobado (v1.1) | — (v1.1) | `src/dominio/inscripciones/importacion/` (v1.1) | `/inscripciones/importar` (v1.1) |
| `formulario-inscripcion.md`| Aprobado (v1.0) | — (v1.1) | `src/dominio/inscripciones/formulario/` (v1.1) | `/inscribirse/*` (v1.1) |
