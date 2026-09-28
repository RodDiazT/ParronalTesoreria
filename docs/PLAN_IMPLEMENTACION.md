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
│ FASE 2: Acceso, Privacidad y Gestión de Miembros [COMPLETADA]          │
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

### Fase 2: Acceso, Privacidad y Gestión de Miembros (Completada el 2026-09-27)
**Documento base:** `docs/acceso/acceso-roles.md`

- [x] **2.1 Pantallas Públicas de Ingreso y Privacidad:**
  - `src/app/ingresar/page.tsx`: Botón de inicio de sesión con Google (`signIn("google")`), sin revelar datos ni nombres del club a extraños (marco §9.4). Mensajes de error en español para fallas de autenticación.
  - `src/app/privacidad/page.tsx`: Texto completo y estático del aviso de privacidad según §3.8 (finalidad única, derechos Ley 19.628 y 21.719, conservación hasta 1 año post rendición, encargado Google Gemini de pago sin uso para entrenamiento).
- [x] **2.2 Bienvenida y Aceptación de Privacidad:**
  - `src/app/bienvenida/page.tsx` y `src/app/bienvenida/formulario-bienvenida.tsx`: Resumen del aviso con casilla obligatoria de consentimiento informado antes de habilitar el botón "Continuar".
  - `src/dominio/acceso/acciones.ts` (`aceptarAviso` y `ejecutarAceptarAviso`): Registra `avisoVersion: 1`, `avisoAceptadoEn: now()` y auditoría inmutable `aceptar_aviso`.
- [x] **2.3 Solicitud de Acceso para Nuevos Usuarios:**
  - `src/app/solicitud/page.tsx` y `src/app/solicitud/formulario-solicitud.tsx`: Pantalla para usuarios con sesión pero sin membresía activa. Los tres estados normados: "Aún no tienes acceso" (con campo opcional de mensaje hasta 200 caracteres), "Solicitud pendiente" (con fecha y mensaje) y "No tienes acceso" (con opción de reintentar solicitud).
  - `src/dominio/acceso/acciones.ts` (`solicitarAcceso` y `ejecutarSolicitarAcceso`): Asocia la solicitud a la única organización vía `obtenerOrganizacionUnica()`, previene duplicados y audita la acción.
- [x] **2.4 Administración de Usuarios y Solicitudes:**
  - `src/app/usuarios/page.tsx` y `src/app/usuarios/gestor-usuarios.tsx`: Pestañas *Solicitudes pendientes* (con contador), *Con acceso* (con distintivo "Invitado, sin ingreso") y *Sin acceso*.
  - Botón *Invitar por correo* (`invitar`), cambio de rol (`cambiarRol`), rechazo (`rechazarSolicitud`), revocación con motivo y advertencia de pendientes (`revocar`), reactivación (`reactivar`) y supresión de datos conforme a ley (`suprimirDatosUsuario`).
  - Regla crítica transaccional: Bloqueo `SELECT FOR UPDATE` en PostgreSQL para garantizar que la organización nunca quede sin al menos un administrador activo (§5.3). Cierre inmediato de sesiones activas en revocación.
- [x] **2.5 Comisión y Perfil de Usuario:**
  - `src/app/comision/page.tsx`: Lista de solo lectura para ayudantes y observadores con nombre, foto y rol de miembros activos (oculta correos personales, invitados sin ingreso, solicitudes y revocados).
  - `src/app/mi-cuenta/page.tsx`: Datos propios de Google, rol, aceptación de privacidad, botones "Cerrar sesión en este equipo", "Cerrar sesión en todos mis dispositivos" y "Descargar mis datos" (`/api/mi-cuenta/descargar` en JSON).
  - `src/app/sin-permiso/page.tsx`: Pantalla amigable para errores 403 de control de acceso.

**Criterios de verificación de Fase 2:**
- [x] Tests en Vitest de transiciones de estado de `Membresia` (solicitada, activa, revocada, rechazada).
- [x] Test de concurrencia y regla de integridad: bloqueo simultáneo para impedir revocar o bajar de rol al último administrador.
- [x] Login verificado con Google OAuth y redirección automática por middleware y `obtenerContexto`.
- [x] 41 tests unitarios y de integración pasando al 100% y build de Next.js sin errores ni advertencias de linter.

---

### Fase 3: Sistema Visual, Estructura de Pantalla y Configuración
**Documentos base:** `docs/interfaz/ux-ui.md` y `docs/organizacion/organizacion-evento.md`

- [x] **3.1 Componentes Base de Interfaz (UX/UI §5.4):**
  - Reorganización de rutas internas en `src/app/(portal)/` con `<Estructura>` envolvente y rutas públicas directas (`/ingresar`, `/privacidad`, `/bienvenida`, `/solicitud`, `/sin-permiso`).
  - `src/components/app/estructura.tsx`: Shell con encabezado, menú (hamburguesa en móvil, lateral en escritorio), botón flotante `+` con espacio inferior de resguardo (safe area).
  - `src/components/app/encabezado.tsx`: Barra superior fixed de 56px con logo/avatar de organización, título de evento con truncado seguro, botón menú y botón volver `←`.
  - `src/components/app/menu-principal.tsx`: Drawer móvil con animación suave y barra lateral de 256px para escritorio, filtrado por rol y permisos según `src/lib/presentacion/menu.ts`.
  - `src/components/app/hoja-registrar.tsx`: Bottom sheet para móvil con 4 accesos directos táctiles (Ingreso, Gasto, Inscripción, Traspaso).
  - `src/components/app/boton-registrar.tsx`: Botón flotante accesible de 56px con badge `+` que activa la hoja de registro rápido.
  - `src/components/app/monto.tsx`: Formateo CLP (`$1.250.000`), números monoespaciados (`tabular-nums`), verde ingreso, rojo gasto.
  - `src/components/app/fecha.tsx`: Formateo America/Santiago ("Hoy", "Ayer", "12 oct").
  - `src/components/app/franja-sin-conexion.tsx`: Alerta sutil al perder conectividad a internet en terreno.
  - `src/components/ui/`: Componentes atómicos accesibles (`button`, `input`, `label`, `textarea`, `checkbox`, `sheet`) con Tailwind v4 tokens nativos.
  - PWA: `src/app/manifest.ts` e íconos en `public/iconos/icono-192.png` y `icono-512.png`.
  - `src/lib/utilidades.ts`: Implementación de distancia Levenshtein (`sonNombresParecidos`) y utilidades con tests.
- [x] **3.2 Configuración del Evento y Organización:**
  - `src/app/(portal)/configuracion/page.tsx`: Índice con accesos a Evento, Organización, Categorías y Pruebas/Conceptos (deshabilitado hasta Fase 6).
  - `src/app/(portal)/configuracion/evento/page.tsx` y `formulario-evento.tsx`: Edición de nombre del evento, fechas (inicio, término, referencia edad), lugar. Control por `version` concurrente.
  - `src/app/(portal)/configuracion/organizacion/page.tsx` y `formulario-organizacion.tsx`: Edición de nombre del club y subida/eliminación de logo.
  - `src/app/api/organizacion/logo/route.ts`: Endpoint seguro que valida membresía y sirve el logo con caché privada.
  - `src/dominio/organizacion/acciones.ts`: Acciones de servidor con validación de magic bytes para imágenes (PNG, JPEG, WebP hasta 1 MB, no SVG).
- [x] **3.3 Configuración de Categorías:**
  - `src/app/(portal)/configuracion/categorias/page.tsx` y `gestor-categorias.tsx`: Gestión interactiva de listas de ingresos y gastos.
  - `src/dominio/organizacion/categorias.ts`: Crear, renombrar, cambiar tipo, desactivar, reactivar y reordenar (con botones ↑ / ↓ por fila).
  - Protección de categorías de sistema (`inscripciones`, `devoluciones`, `aporte_inicial` no se desactivan ni cambian de tipo).
  - Marca `exigeContraparte` editable para administradores.
  - `src/components/app/selector-categoria.tsx`: Selector táctil que oculta categorías de sistema no elegibles manualmente.
- [x] **3.4 Gestión de Contrapartes (Auspiciadores y Proveedores):**
  - `src/app/(portal)/contrapartes/page.tsx` y `lista-contrapartes.tsx`: Listado con búsqueda por texto y filtro por tipo (auspiciador, proveedor, otro) y tarjetas de dos líneas.
  - `src/app/(portal)/contrapartes/[id]/page.tsx` y `ficha-contraparte.tsx`: Ficha detallada con edición (solo admin), desactivación/reactivación, modal de fusión y supresión de datos. La portabilidad CSV fue descartada por decisión de diseño para mantener la máxima simplicidad.
  - `src/dominio/organizacion/contrapartes.ts`: Creación y edición con aviso de nombres parecidos (`sonNombresParecidos`), bloqueo por RUT duplicado, fusión transaccional de duplicados con reasignación de movimientos y auditoría única, y supresión de contacto y RUT.
  - `src/components/app/selector-contraparte.tsx`: Selector con autocompletado en cliente, aviso de parecidos y creación en un toque con preselección según tipo de movimiento.

**Criterios de verificación de Fase 3:**
- [x] Estructura visual responsive con Tailwind v4 y React 19 funcionando sin conflictos de hidratación.
- [x] Rutas autenticadas agrupadas limpiamente en `src/app/(portal)/` sin alterar las URLs existentes.
- [x] Pruebas unitarias de algoritmos: 13 pruebas para Levenshtein y normalización de nombres, 3 pruebas para menú dinámico por rol.
- [x] Pruebas de integración para acciones de Evento, Organización, Categorías y Contrapartes pasando con PostgreSQL en Railway.
- [x] 64 tests pasando al 100% (8 suites) y 0 errores/warnings de linter.

---

### Fase 4: Movimientos, Respaldos y Validación de Tesorería
**Documento base:** `docs/movimientos/movimientos.md`

- [x] **4.1 Formulario de Registro Rápido (Celular Primero):**
  - `src/app/(portal)/movimientos/nuevo/page.tsx` y `formulario-movimiento.tsx`: Formulario táctil en una sola columna con teclado numérico, selección de tipo (Gasto / Ingreso), estado de pago (`pagado` o `pendiente`), y soporte para gastos reembolsables (`pagadoPorId` asignado al usuario o selección de miembro).
  - Selectores desplegables `<SelectorCategoria>` y `<SelectorContraparte>` con soporte para "No sé de qué es" (ingresos sin identificar) y creación rápida de contrapartes.
  - Regla de respaldo u observación: subida obligatoria de fotos/PDF o casilla obligatoria `sinRespaldo` con justificación en caso de no adjuntar boleta.
  - Modal de advertencia de posibles duplicados (±1 día y mismo monto) que no bloquea pero alerta al usuario.
  - Generación de `claveCliente` en cliente (`crypto.randomUUID()`) para garantizar envíos idempotentes sin duplicar ante reintentos o desconexiones de red.
- [x] **4.2 Compresión y Servidor Seguro de Respaldos:**
  - `src/lib/archivos/compresion.ts`: Compresión en cliente mediante Canvas HTML5 (máx. 1600 px, JPEG 80%), eliminando metadatos EXIF por privacidad y habilitando envíos ultrarrápidos con baja cobertura móvil.
  - `src/lib/archivos/almacenamiento.ts`: Guardado atómico en disco persistente (`RUTA_RESPALDOS`), con validación de magic bytes (JPEG, PNG, PDF; rechazo estricto de SVG, HTML y ejecutables).
  - `src/app/api/respaldos/[id]/route.ts`: Endpoint seguro que verifica membresía de organización y rol (oculto a observadores), con cabeceras `Cache-Control: private, no-store` y `X-Content-Type-Options: nosniff`.
- [x] **4.3 Acciones de Servidor y Listado de Movimientos:**
  - `src/dominio/movimientos/acciones.ts`: Acciones de servidor con validación Zod, idempotencia por `claveCliente`, cálculo de totales con `filtroSumable`, autovalidación de administradores, y trazabilidad completa en `RegistroAuditoria`.
  - `src/dominio/movimientos/reglas.ts`: Reglas de dominio para fechas futuras, validación de especie (solo ingresos), contrapartes requeridas, y enmascaramiento de privacidad para observadores (`ocultarDatosMovimiento`).
  - `src/app/(portal)/movimientos/page.tsx` y `lista-movimientos.tsx`: Listado con pestañas interactivas (*Todos*, *Por validar*, *Observados*, *Por cobrar*, *Por pagar*, *Sin respaldo*, *Sin identificar*), filtros reflejados en URL, tarjetas táctiles de dos líneas y fila de totales plegable.
  - `src/app/(portal)/movimientos/[id]/page.tsx` y `ficha-movimiento.tsx`: Ficha detallada con galería de comprobantes, visor modal ampliado, línea de tiempo de auditoría, e historial de abonos enlazados. Modales contextuales de edición con control de concurrencia (`version`), anulación con cascada (restitución de saldos de abonos y anulación de devoluciones vinculadas), adición y anulación justificada de comprobantes individuales.
- [x] **4.4 Bandeja de Validación y Probidad de Tesorería:**
  - `src/app/(portal)/movimientos/validar/page.tsx` y `bandeja-validar.tsx`: Bandeja de validación de a un movimiento a la vez para administradores, con visualizador amplio del comprobante y datos clave en un solo vistazo.
  - Acciones rápidas en un clic: botón `Validar` (verde prominente) y botón `Observar` con comentario obligatorio para devolver al ayudante.
  - Cumplimiento estricto del principio de probidad (`exigirNoPropio`): ningún administrador puede validar ni autoaprobar movimientos registrados por él mismo.
  - Sección de "Respaldos nuevos" para comprobantes agregados posteriormente a movimientos ya validados, con botón "Marcar como visto".
- [x] **4.5 Cobranzas, Pagos de Pendientes y Abonos Parciales:**
  - `src/dominio/movimientos/abonos.ts`: Manejo concurrente de pagos totales y abonos parciales (`marcarPagado`), con bloqueo de fila (`SELECT FOR UPDATE` implícito en transacción Prisma) para evitar condiciones de carrera.
  - Los abonos parciales crean un movimiento hijo enlazado (`abonoDeId`). Si lo registra un administrador, descuenta el saldo inmediatamente; si lo registra un ayudante, queda `por_validar` y descuenta el saldo al momento de la validación.
  - Al anular un abono validado, se restituye atómicamente el saldo pendiente al movimiento original.
  - Pantalla general de auditoría `src/app/(portal)/auditoria/page.tsx` y `vista-auditoria.tsx`: Vista exclusiva para administradores con filtros por entidad, acción y usuario, y visor de diferencias JSON antes/después.

**Criterios de verificación de Fase 4:**
- [x] Formulario móvil en una columna con teclado numérico, selector táctil de archivos/cámara con compresión Canvas y modal de duplicados.
- [x] Endpoint de respaldos seguro `/api/respaldos/[id]` con validación estricta de magic bytes (JPEG/PNG/PDF) y bloqueo a rol observador.
- [x] Listado `/movimientos` con pestañas de estado, filtros sincronizados en URL y totales filtrados por `filtroSumable`.
- [x] Ficha de detalle `/movimientos/[id]` con auditoría visual, galería de comprobantes, y modales para editar, observar, anular y abonar.
- [x] Bandeja administrativa `/movimientos/validar` con navegación uno a uno, probidad `exigirNoPropio` y revisión de respaldos nuevos.
- [x] Módulo `/auditoria` para administradores con historial completo de transacciones.
- [x] 19 pruebas de integración exhaustivas en `movimientos.test.ts` cubriendo idempotencia, probidad, abonos, anulación en cascada y privacidad.
- [x] 83 tests pasando al 100% en todo el proyecto (9 suites de Vitest) y compilación limpia en Next.js (`npm run build`).

---

### Fase 5: Participantes (Jinetes, Caballos, Apoderados y Clubes)
**Documento base:** `docs/inscripciones/participantes.md`
**Estado:** [x] COMPLETADA (2026-09-27)

#### Paso 5.1: Reglas de Edad, Alertas y Duplicados
- [x] **Archivos:** `src/dominio/inscripciones/participantes/reglas.ts`.
- **Qué hace:**
  - `edadEnEvento`: cálculo exacto de años cumplidos a la fecha de referencia del concurso (`fechaReferenciaEdad` o `fechaInicio`), en zona horaria chilena (`America/Santiago`), considerando bisiestos (29 de febrero).
  - `alertasJinete`: evaluación en memoria de alertas no bloqueantes (`sin_fecha_nacimiento`, `menor_sin_apoderado`, `falta_autorizacion`, `apoderado_sin_telefono`).
  - `buscarParecidos`: detección de similitudes fonéticas y ortográficas (distancia Levenshtein normalizada) para clubes, caballos en cualquier club, apoderados (con normalización de teléfonos chilenos) y jinetes.

#### Paso 5.2: Fichas, Selectores y Operaciones de Participantes
- [x] **Dominio y Consultas:**
  - `src/dominio/inscripciones/participantes/acciones.ts`: esquemas Zod y server actions para crear, editar (con control de concurrencia optimista `version`), desactivar y reactivar clubes, jinetes, apoderados y caballos.
  - Creación atómica de jinete con apoderado nuevo y autorización firmada en una sola transacción Prisma.
  - Vinculación/desvinculación de apoderados y registro de autorizaciones por administradores y ayudantes.
  - Fusiones transaccionales seguras (`ejecutarFusionarClubes`, `ejecutarFusionarJinetes`, `ejecutarFusionarCaballos`) con reasignación íntegra de dependencias hijas y desactivación del registro duplicado.
  - Cumplimiento estricto de privacidad (Leyes 19.628 y 21.719): supresión de datos personales (`ejecutarSuprimirDatosClub`, `ejecutarSuprimirDatosJinete`, `ejecutarSuprimirDatosApoderado`) y descarga de datos en CSV (`ejecutarDescargarDatosParticipante`).
  - `src/dominio/inscripciones/participantes/consultas.ts`: funciones de consulta con ocultamiento de datos privados (`ocultarDatosPersonales`) para el rol `observador` (no ve fechas de nacimiento, edad, contacto, RUT ni alertas; y recibe 403 en apoderados).
- [x] **Componentes Visuales Reutilizables:**
  - `<AlertasJinete>`: chips táctiles de colores con textos explicativos claros según la alerta.
  - `<SelectorClub>`: selector táctil con autocompletado y botón de alta rápida inline.
  - `<SelectorJinete>`: selector táctil con visualización de club y edad.
  - `<SelectorCaballo>`: selector táctil filtrable con indicación de club de origen.
  - `<SelectorApoderado>`: selector táctil con teléfono y búsqueda en vivo.
- [x] **Páginas del Portal:**
  - `src/app/(portal)/participantes/page.tsx` y `lista-participantes.tsx`: listado móvil con 4 pestañas (*Jinetes*, *Caballos*, *Clubes*, *Apoderados*), buscador en tiempo real, filtro por club y filtro táctil "Con alertas".
  - `src/app/(portal)/participantes/jinetes/nuevo/page.tsx` y `formulario-jinete.tsx`: formulario móvil de alta rápida con cálculo de edad en vivo y secciones desplegables para vincular apoderado y registrar autorización.
  - `src/app/(portal)/participantes/jinetes/[id]/page.tsx` y `ficha-jinete.tsx`: ficha detallada del jinete con alertas, historial de apoderados, edición, fusión, descarga CSV y supresión de datos.
  - `src/app/(portal)/participantes/clubes/[id]/page.tsx` y `ficha-club.tsx`: ficha del club con listados de jinetes y caballos asociados, edición y fusión de clubes duplicados.
  - `src/app/(portal)/participantes/caballos/[id]/page.tsx` y `ficha-caballo.tsx`: ficha del caballo con club de pertenencia, edición y fusión.
  - `src/app/(portal)/participantes/apoderados/[id]/page.tsx` y `ficha-apoderado.tsx`: ficha del apoderado con llamada telefónica en un toque, jinetes a cargo y edición (oculta y con 403 a observadores).

**Criterios de verificación de Fase 5:**
- [x] 30 pruebas unitarias y de integración exhaustivas en `participantes.test.ts` pasando al 100%.
- [x] 113 pruebas pasando al 100% en todo el proyecto (10 suites de Vitest).
- [x] Compilación Next.js de producción limpia (`npm run build`, 22 rutas estáticas/dinámicas, 0 errores, 0 warnings).
- [x] Aislamiento multi-tenant validado mediante cliente `db(ctx)`.

---

### Fase 6: Inscripción de Binomios, Pruebas y Pagos
**Documento base:** `docs/inscripciones/inscripcion-binomios.md`
**Estado:** Diagnóstico de avance realizado (Pendiente de implementación activa: 0 de 4 pasos concluidos).

#### Pre-requisitos heredados y completados en fases previas:
- [x] Modelos de datos en Prisma (`Prueba`, `Concepto`, `Binomio`, `Inscripcion`, `Cargo`, `Pago`, `Devolucion`) y base de datos migrada en Railway.
- [x] Acciones y matriz de permisos configuradas en `src/lib/permisos.ts` (`inscripciones.ver`, `inscripciones.verDatosPersonales`, `inscripciones.inscribir`, `inscripciones.ajustar`, `inscripciones.administrar`).
- [x] Categorías de sistema protegidas (`inscripciones`, `devoluciones`) en `src/dominio/organizacion/categorias.ts`.
- [x] Cascada de anulación de pagos y devoluciones en `ejecutarAnularMovimiento` (`src/dominio/movimientos/acciones.ts`).
- [x] Cálculo de edad en concurso (`edadEnEvento`) y alertas de menores en Participantes (`src/dominio/inscripciones/participantes/reglas.ts`).
- [x] Enlaces en menú de navegación (`/inscripciones`) y hoja rápida de registro (`/inscripciones/nueva`, `/inscripciones/pago`).

#### Paso 6.1: Configuración de Pruebas y Conceptos
- **Estado:** Pendiente.
- **Archivos:** `src/app/(portal)/configuracion/pruebas/page.tsx`, `src/dominio/inscripciones/binomios/acciones.ts`.
- **Tareas pendientes:**
  - [ ] Acciones de servidor con validación Zod y auditoría: `crearPrueba`, `editarPrueba`, `ordenarPruebas`, `desactivarPrueba`, `reactivarPrueba`.
  - [ ] Acciones de conceptos: `crearConcepto`, `editarConcepto`, `ordenarConceptos`, `desactivarConcepto`, `reactivarConcepto`.
  - [ ] Pantalla `/configuracion/pruebas` con pestañas para Pruebas del concurso y Conceptos adicionales (cuota por binomio automática, pensión, alojamiento).
  - [ ] Habilitar el acceso en `/configuracion/page.tsx` (remover deshabilitado y etiqueta).

#### Paso 6.2: Inscripción de Binomios en Terreno
- **Estado:** Pendiente.
- **Archivos:** `src/dominio/inscripciones/binomios/reglas.ts`, `src/dominio/inscripciones/binomios/consultas.ts`, `src/dominio/inscripciones/binomios/acciones.ts`, `src/app/(portal)/inscripciones/page.tsx`, `src/app/(portal)/inscripciones/nueva/page.tsx`, `src/app/(portal)/inscripciones/binomios/[id]/page.tsx`.
- **Tareas pendientes:**
  - [ ] Reglas puras: `estadoItem` (pendiente, parcial, pagado, becado, retirado, y marca `porValidar`), `avisoEdadPrueba` (no bloqueante), `ocultarDatosInscripcion` (ocultamiento a observador).
  - [ ] Acción `inscribir`: creación atómica de binomio si no existía, registro de inscripciones en pruebas seleccionadas, carga automática de cuota por binomio (`automatico: true`), idempotencia por `claveCliente`.
  - [ ] Acciones de gestión y ajuste: `agregarCargo` (servicios manuales a jinete/club), `ajustarItem` (con motivo y aviso "Visto" si es ayudante), `marcarVisto`, `revertirAjuste`.
  - [ ] Cambios pre-concurso: `cambiarPrueba`, `cambiarParBinomio`, `moverInscripcion`, `cambiarClubBinomio`.
  - [ ] Anulación: `anularItem` (solo propios sin pago para ayudante, cualquiera sin pago para administrador), `anularBinomio`.
  - [ ] Pantallas: listado `/inscripciones` con tarjetas de 2 líneas y 6 pestañas, formulario móvil `/inscripciones/nueva` y ficha de detalle `/inscripciones/binomios/[id]`.

#### Paso 6.3: Registro y Asignación de Pagos de Inscripción
- **Estado:** Pendiente.
- **Archivos:** `src/dominio/inscripciones/binomios/pagos.ts`, `src/app/(portal)/inscripciones/pago/page.tsx`, `src/app/(portal)/inscripciones/movimientos/[id]/asignar/page.tsx`, `src/components/app/reparto-pago.tsx`, `src/components/app/estado-item.tsx`.
- **Tareas pendientes:**
  - [ ] Algoritmo FIFO `repartirMonto`: reparte el valor transferido entre ítems pendientes (de más antiguo a más nuevo) sin superar saldos; remanente queda en `porAsignar`.
  - [ ] Acción `registrarPagoInscripciones`: crea movimiento de ingreso en categoría de sistema `inscripciones`, bloquea filas con `SELECT ... FOR UPDATE`, valida saldos y crea registros `Pago`.
  - [ ] Gestión de asignación: `asignarPorAsignar`, `corregirReparto` (para ayudante en movimientos propios por validar) y `desasignarPago` (administrador con anulación lógica de `Pago`).
  - [ ] Componentes visuales: `<RepartoPago>` interactivo y chip `<EstadoItem>` con marca `· por validar`.
  - [ ] Pantalla `/inscripciones/pago` y flujo directo "Registrar pago ahora" tras inscribir.

#### Paso 6.4: Retiros, Devoluciones y Cobranza WhatsApp
- **Estado:** Pendiente.
- **Archivos:** `src/dominio/inscripciones/binomios/retiros.ts`, `src/app/(portal)/inscripciones/binomios/[id]/retirar/page.tsx`, `src/components/app/estado-cuenta.tsx`.
- **Tareas pendientes:**
  - [ ] Acción `retirar`: retiro de pruebas/binomio por administrador (detiene si hay pagos por validar), con opción sin devolución, parcial o total (gasto en categoría `devoluciones`), registrando `retenido`.
  - [ ] Devolución posterior (`registrarDevolucionRetiro`) y devolución de sobrante por asignar (`devolverSobrante`).
  - [ ] Estado de cuenta: consulta `estadoCuenta` y generador de texto limpio para WhatsApp `textoEstadoCuenta` (sin RUT, edades ni contactos personales; con auditoría).
  - [ ] Componente `<EstadoCuenta>` con botón "Copiar estado de cuenta" en fichas de jinete, club y binomio.
  - [ ] Integración de fusión: gancho `reasignarPorFusion` en Participantes con detección y bloqueo de `ConflictoBinomios`.
  - [ ] Consulta `inscripcionesAfectadasPorCambioDeFecha` para vista previa en Configuración del Evento.
  - [ ] Indicadores de dashboard: `porCobrarInscripciones` y `totalPorAsignar`.

**Criterios de verificación de Fase 6:**
- [ ] Suite completa de pruebas unitarias y de integración de binomios (`binomios.test.ts`) pasando al 100%.
- [ ] Verificación de aislamiento multi-tenant en todas las consultas y acciones de binomios.
- [ ] Compilación Next.js de producción limpia (`npm run build`, 0 errores, 0 warnings).
- [ ] 100% de tests del proyecto pasando sin fallas.

---

### Fase 7: Dashboard y Traspasos entre Medios de Pago
**Documento base:** `docs/dashboard/dashboard.md` (v1.2), `docs/interfaz/ux-ui.md` (§3.4, §3.6) y `docs/marco-general/marco-general-proyecto.md` (§6.7).
**Estado:** [x] COMPLETADA (100% implementada y verificada).

#### Paso 7.1: Consultas de Agregación y Motor de KPIs Dinámicos
- **Archivos:** `src/dominio/dashboard/calculos.ts`.
- **Implementación y reglas verificadas:**
  - `indicadores(ctx, eventoId)`: cálculo en tiempo real sin saldos estáticos desde movimientos válidos (`anulado: false`), excluyendo movimientos en especie de saldos en efectivo/banco. Desglosa:
    - `ingresosPercibidos`: pagados y validados en dinero.
    - `aporteInicial`: desglose específico de categoría de sistema `aporte_inicial`.
    - `gastosPagados`: pagados y validados en dinero.
    - **Saldo de caja:** invariante estricta `ingresosPercibidos - gastosPagados`.
    - `porCobrar`: desglosado en `inscripciones` y `otros` ingresos pendientes validados.
    - `porPagar`: desglosado en `proveedores` (`pagadoPorId === null`) y `comision` (reembolsos pendientes a miembros).
    - **Resultado proyectado:** invariante estricta `saldoCaja + porCobrar - porPagar`.
    - `porValidar`: cantidad y monto total de movimientos pendientes de revisión (`por_validar` y `observado`).
    - `porAsignar`: monto total remanente de transferencias no asociadas a ítems.
    - `especie`: total percibido y comprometido en canjes no dinerarios.
  - `saldoPorMedio(ctx, eventoId)`: cálculo dinámico por medio (`transferencia`, `efectivo`, `otro`) considerando ingresos, gastos y traspasos netos vigentes, cumpliendo la invariante `transferencia + efectivo + otro === saldoCaja`.
  - `avisosAdministrador(ctx, eventoId)`: solicitudes de membresía pendientes, movimientos por validar, monto por asignar, ajustes de inscripción no vistos y conteo de jinetes menores con alertas activas que compiten en el evento.
  - `loMio(ctx, eventoId)`: pendientes propios del ayudante (por validar propios, observados con comentario administrativo de revisión y botón de corrección, y reembolsos pendientes que le adeuda la comisión).
  - `textoResumen(ctx, eventoId, ahora)`: generador de texto limpio para WhatsApp al formato exacto de `docs/dashboard/dashboard.md` §3.7 sin datos personales sensibles.

#### Paso 7.2: Traspasos entre Medios de Pago y Endpoint Seguro
- **Archivos:** `src/dominio/dashboard/traspasos.ts`, `src/dominio/dashboard/acciones.ts`, `src/app/api/traspasos/[id]/archivo/route.ts`, `src/app/(portal)/traspasos/page.tsx`, `src/app/(portal)/traspasos/lista-traspasos.tsx`, `src/app/(portal)/traspasos/nuevo/page.tsx`, `src/app/(portal)/traspasos/nuevo/formulario-traspaso.tsx`.
- **Implementación y reglas verificadas:**
  - Registro exclusivo para Administrador (`exigir(ctx, "registrar_traspaso")`).
  - Validación de reglas puras (`desde !== hacia`, comprobante de depósito u observación obligatoria si no hay archivo).
  - Manejo de concurrencia optimista por `version` e idempotencia de red por `claveCliente`.
  - Marcado automático de `posteriorAlCierre` cuando el evento está cerrado o rendido.
  - Almacenamiento seguro en disco persistente (`RUTA_RESPALDOS/traspasos/…`) con validación de magic bytes (JPEG, PNG, PDF; rechazo estricto de SVG/HTML/ejecutables).
  - Endpoint seguro de descarga `/api/traspasos/[id]/archivo` protegido con `puedeVerRespaldos` y cabeceras `Cache-Control: private, no-store`.
  - Anulación de traspasos con motivo obligatorio, restitución inmediata de saldos por medio y registro en la auditoría inmutable del sistema.
  - Privacidad estricta: `ocultarDatosTraspaso` oculta la observación y el archivo al rol Observador.
  - Interfaz móvil: listado `/traspasos` con chip de medios, filtro de anulados y sheet de anulación; formulario de alta rápida `/traspasos/nuevo` con teclado numérico y selector visual.

#### Paso 7.3: Pantalla de Inicio `/` Multirrol y Componentes Visuales
- **Archivos:** `src/app/(portal)/page.tsx`, `src/components/app/dashboard/` (`bloque-por-revisar.tsx`, `bloque-lo-mio.tsx`, `tarjeta-saldo.tsx`, `filas-resumen.tsx`, `detalle-dashboard.tsx`, `boton-copiar-resumen.tsx`).
- **Implementación y reglas verificadas:**
  - Administrador: visualiza `<BloquePorRevisar>` con enlaces directos contextuales (solicitudes `/usuarios`, por validar `/movimientos/validar`, por asignar `/movimientos?sinIdentificar=1`, alertas de menores `/participantes?alertas=1`) + saldo + indicadores + `<BotonCopiarResumen>`.
  - Ayudante: visualiza `<BloqueLoMio>` con tarjetas de movimientos observados (mostrando el comentario del admin y acción "Corregir"), movimientos por validar propios y total de reembolsos adeudados.
  - Observador: vista de solo lectura del saldo e indicadores; botón de copiar resumen habilitado; sin acceso a datos protegidos ni comprobantes.
  - `<TarjetaSaldo>`: saldo total destacado en tipografía de 36px, desglose Banco/Efectivo, alerta contextual de saldo negativo (`¿Falta registrar un traspaso?`), botón de refresco y enlace directo a `/traspasos`.
  - `<FilasResumen>`: filas táctiles de Por cobrar y Por pagar con bottom sheets de desglose interactivo, y fila de resultado proyectado con sheet informativo.
  - `<DetalleDashboard>`: bloque plegable con persistencia en `localStorage` (`dashboard_detalle_abierto`) con ingresos percibidos, gastos pagados y sublista gris "Aparte" (por validar, por asignar, en especie).
  - `<BotonCopiarResumen>`: copia al portapapeles en 1 toque y muestra modal de respaldo en caso de permisos denegados del portapapeles del navegador. Protegido en servidor: Ayudante recibe 403 (`ErrorPermiso`).
  - Estado vacío inicial con mensaje de bienvenida cuando no existen movimientos.

**Criterios de verificación de Fase 7:**
- [x] 13 pruebas unitarias y de integración exhaustivas en `src/dominio/dashboard/dashboard.test.ts` pasando al 100%.
- [x] 126 pruebas totales pasando al 100% en todo el proyecto (11 suites de Vitest).
- [x] Compilación Next.js de producción limpia (`npm run build`, 21 rutas estáticas y dinámicas, 0 errores, 0 warnings).
- [x] Aislamiento multi-tenant y entre eventos verificado con `db(ctx)`.
- [x] Servidor Server Actions (`acciones.ts`) desacoplado de funciones de dominio puras para estricta compatibilidad con webpack y Next.js App Router.

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
