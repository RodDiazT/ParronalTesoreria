# Estado del Proyecto — Tesorería Parronal

Última actualización: 2026-09-27

## Resumen

Están aprobados el marco general y todos los componentes del núcleo v1.0 (Organización y evento, Acceso y roles, Movimientos, Participantes, Inscripción de binomios, Dashboard y UX/UI) junto con los aprobados para v1.1 (Importación desde Excel y Formulario de inscripción).

**Estado de la implementación técnica (2026-09-27):**
- **Fase 1 (Esqueleto técnico, Base de Datos, Carga Inicial y Núcleo de Aislamiento y Permisos):** COMPLETADA. Infraestructura Railway, 24 modelos Prisma migrados, carga inicial, `db(ctx)`, `permisos.ts` y Auth.js.
- **Fase 2 (Acceso, Privacidad y Gestión de Miembros):** COMPLETADA.
  - Pantallas públicas `/ingresar` (con Google OAuth y mensajes de error en español) y `/privacidad` (aviso completo normado Ley 19.628 / 21.719 con mención de IA Gemini).
  - Pantalla `/bienvenida` con consentimiento informado obligatorio previo a la habilitación de funciones.
  - Pantalla `/solicitud` con los tres estados visuales para solicitantes sin revelar datos del club.
  - Panel administrativo `/usuarios` con pestañas *Solicitudes*, *Con acceso* y *Sin acceso*, invitación por correo, cambio de rol, revocación con cierre inmediato de sesiones, reactivación y supresión de datos conforme a ley.
  - Regla crítica del administrador mínimo activo protegida por transacción con bloqueo `SELECT FOR UPDATE` en PostgreSQL.
  - Lista de miembros `/comision` (oculta correos privados a ayudantes y observadores) y pantalla `/mi-cuenta` con cierre de sesiones en todos los dispositivos y descarga de datos personales JSON (`/api/mi-cuenta/descargar`).
  - Suite de 41 tests unitarios y de integración pasando al 100% y build de Next.js limpio.

El plan paso a paso y la estrategia completa de avance se detallan en [`docs/PLAN_IMPLEMENTACION.md`](PLAN_IMPLEMENTACION.md).

## Stack o recursos confirmados

| Capa o recurso | Decisión | Documento que lo confirma |
|---|---|---|
| Aplicación | Next.js (App Router) con TypeScript | Marco general, §8 |
| Interfaz | Tailwind CSS, mobile-first | Marco general, §8 |
| Validación | Zod | Marco general, §8 |
| Base de datos | PostgreSQL de Railway | Marco general, §8 |
| Acceso a datos | Prisma | Marco general, §8 |
| Autenticación | Auth.js con Google, sesiones en base de datos | Marco general, §8 |
| Archivos de respaldo | Volumen persistente de Railway, servidos solo por la app | Marco general, §8 |
| Pruebas | Vitest (reglas, permisos, aislamiento) | Marco general, §8 |
| Despliegue | Cuenta Railway existente de Rod, URL de la plataforma | Marco general, §8 |
| Aislamiento en código | Función `obtenerContexto`, cliente Prisma extendido `db(ctx)` que agrega `organizacionId` y `exigirDeLaOrganizacion` para validar referencias; ESLint prohíbe el cliente sin extender | Organización y evento, §5.2 |
| Autenticación en código | Adaptador propio de Auth.js sobre `Usuario`, `Account` y `Session`; solo correos verificados por Google; sesión de 30 días renovable | Acceso y roles, §5.2 |
| Permisos en código | Tabla única `src/lib/permisos.ts` con `puede(ctx, accion)` y `exigir(ctx, accion)`, transcripción del marco §2.2 | Acceso y roles, §5.4 |
| Movimientos en código | Modelos `Movimiento` y `Respaldo` con restricciones `CHECK`; idempotencia por `claveCliente`; abonos con bloqueo de fila; `filtroSumable` único para totales; archivos en `RUTA_RESPALDOS/movimientos/…` servidos por `/api/respaldos/[id]`; compresión en el navegador con `canvas` | Movimientos, §5 |
| Inscripciones en código | Modelos `Prueba`, `Concepto`, `Binomio`, `Inscripcion`, `Cargo`, `Pago` y `Devolucion` con índices únicos parciales y `CHECK`; `estadoItem` como única función de estado; `repartirMonto`; `porCobrarInscripciones` y `totalPorAsignar` para el Dashboard; `registrarMovimientoSistema` y cascada `anularEnCascadaPorMovimiento`; permisos `inscripciones.*` | Inscripción de binomios, §5 |
| Participantes en código | Modelos `Club`, `Jinete`, `Apoderado`, `JineteApoderado` y `Caballo`; `edadEnEvento` como única función de edad; `alertasJinete`; `buscarParecidos` compartida con Importación desde Excel; permisos `participantes.*` | Participantes, §5 |
| Dashboard en código | `src/dominio/dashboard/` con `indicadores`, `saldoPorMedio`, `avisosAdministrador`, `loMio` y `textoResumen` (v1.0) y `porcentajePagado`, `porCategoria`, `rangoPorDefecto`, `agrupacion` y `evolucion` (v1.1); modelo `Traspaso` con `CHECK`; inicio `/` sin caché; gráficos en SVG propio; filtros de listados en la URL | Dashboard, §5 |
| Formulario en código (v1.1) | Modelos `EnlaceFormulario` (token con hash y cifrado) y `SolicitudInscripcion`; ruta pública `/inscribirse/[token]` con `resolverEnlacePublico`, `sugerirClubes` y `enviarSolicitud` (idempotencia, campo trampa, tiempo mínimo, límites por huella de IP); `coincidenciaParticipante` compartida con Importación; aceptación en una transacción con `inscribir(tx)` y `registrarPagoInscripciones(tx)`; comprobantes en `RUTA_RESPALDOS/solicitudes/…`; purga al abrir la bandeja | Formulario de inscripción, §5 |
| Interfaz en código | shadcn/ui en `src/components/ui/`, componentes comunes en `src/components/app/` (`<Estructura>`, `<MenuPrincipal>`, `<HojaRegistrar>`, `<TarjetaLista>`, `<Estado>`, `<Monto>`…), funciones `estadoVisual`, `estadoPrincipal`, `formatearMonto`, `formatearFecha`, `itemsMenu` en `src/lib/presentacion/`; colores como variables CSS para modo claro y oscuro; lucide-react, sonner, fuente del sistema; `manifest.ts` genérico sin service worker | UX/UI, §5 |
| Idioma del código | Dominio en español sin tildes; términos técnicos en inglés | Marco general, §8 |
| Importación en código (v1.1) | Modelo `Importacion`; `importacionId` en `Binomio` e `Inscripcion`; `exceljs` para leer y generar planillas; `normalizarFilas` determinista, `resolverFilas` con `buscarParecidos`, confirmación en una transacción con `inscribir(tx)` y auditoría única; archivos en `RUTA_RESPALDOS/importaciones/…` | Importación desde Excel, §5 |
| IA (v1.1, importación y conciliación) | API de Gemini de pago tras la capa `src/lib/ia/` (`sugerir` con salida validada por Zod); `GEMINI_API_KEY`, `GEMINI_NIVEL_PAGO=confirmado`, `GEMINI_MODELO`; opcional | Marco general, §8; Importación desde Excel, §5.5 |

## Herramientas, proveedores e integraciones

| Herramienta | Uso | Documento |
|---|---|---|
| GitHub (`RodDiazT/ParronalTesoreria`) | Repositorio de documentos y código | Marco general, §10 |
| Railway | Hosting de app, base de datos y volumen | Marco general, §8 |
| Google (OAuth) | Inicio de sesión, alcances `openid email profile`, pantalla de consentimiento publicada | Marco general, §8; Acceso y roles, §5.7 |
| Google (API de Gemini, nivel de pago) | Mapeo de planillas importadas y sugerencias de conciliación, v1.1; encargado de tratamiento | Marco general, §8 y §9.4; Importación desde Excel, §4 |

## Componentes aprobados

| Componente | Qué hace | Ruta |
|---|---|---|
| Marco general | Raíz técnica: actores y permisos, modelo de dominio, reglas de negocio, stack, cumplimiento, alcance por versión y plan | `docs/marco-general/marco-general-proyecto.md` |
| Organización y evento | Aislamiento por organización, carga inicial por script, configuración del evento y de la organización (nombre y logo), categorías y contrapartes con fusión de duplicados | `docs/organizacion/organizacion-evento.md` |
| Movimientos | Registro de ingresos y gastos con respaldo u observación, validación de a uno, pendientes y abonos, reembolsos, especie, sin identificar, anulación en cascada y pantalla de auditoría | `docs/movimientos/movimientos.md` |
| Inscripción de binomios | Pruebas y conceptos configurables, inscripción de binomios, cuota automática y cargos, pagos repartidos con por asignar, ajustes con aviso, retiros y devoluciones, estado de cuenta copiable | `docs/inscripciones/inscripcion-binomios.md` |
| Participantes | Clubes, jinetes, apoderados y caballos con club obligatorio, edad calculada a la fecha del evento, alertas de menores que no bloquean, avisos de duplicado y fusión | `docs/inscripciones/participantes.md` |
| Importación desde Excel (v1.1) | Plantilla para terceros, cualquier planilla con mapeo asistido por IA o manual, vista previa con duplicados y ya inscritos, carga en una transacción sin pagos, listas de pagos informados y anulación de lo importado | `docs/inscripciones/inscripcion-binomios/importacion-excel.md` |
| Dashboard | Inicio por rol con indicadores, saldo en banco y efectivo, traspasos, avisos del administrador, "Lo mío" del ayudante y resumen copiable; en v1.1, % pagadas, por categoría, evolución y conciliación | `docs/dashboard/dashboard.md` |
| Formulario de inscripción (v1.1) | Enlace público de solo envío por evento, un binomio por solicitud con comprobante opcional y clubes autocompletados, bandeja por revisar, aceptación con pago en un paso y autorización del apoderado | `docs/inscripciones/inscripcion-binomios/formulario-inscripcion.md` |
| UX/UI | Menú (hamburguesa y lateral) y botón "+" con cuatro acciones, inicio con lo secundario plegado, cuatro tonos de estado, tarjetas de dos líneas, fichas, formularios, confirmaciones, modo claro y oscuro, instalable y buscador general (v1.1) | `docs/interfaz/ux-ui.md` |
| Acceso y roles | Ingreso con Google, aviso de privacidad, solicitudes, invitaciones, roles, revocación con mínimo de un administrador, lista de la comisión y matriz de permisos en el servidor | `docs/acceso/acceso-roles.md` |

## Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 1.0 | Creación del archivo de estado | Inicio del proyecto |
| 2026-09-27 | 1.1 | Se registra el marco general aprobado y el stack confirmado | Aprobación del marco general |
| 2026-09-27 | 1.2 | Se registra Organización y evento aprobado y el mecanismo de aislamiento en código | Aprobación de Organización y evento |
| 2026-09-27 | 1.3 | Organización y evento v1.1 aprobado: validación de referencias entre organizaciones y fechas del evento informativas | Aprobación de Organización y evento v1.1 |
| 2026-09-27 | 1.4 | Se registra Acceso y roles aprobado, el adaptador de autenticación y la tabla única de permisos | Aprobación de Acceso y roles |
| 2026-09-27 | 1.5 | Se registra Movimientos aprobado y su implementación en código; Organización y evento v1.2 | Aprobación de Movimientos |
| 2026-09-27 | 1.6 | Se registra Participantes aprobado y su implementación en código; marco general v1.2 | Aprobación de Participantes |
| 2026-09-27 | 1.7 | Se registra Inscripción de binomios aprobado y su implementación en código; marco general v1.3 y Movimientos v1.1 | Aprobación de Inscripción de binomios |
| 2026-09-27 | 1.8 | Se registra Importación desde Excel aprobado (v1.1) y su implementación en código; la IA del proyecto pasa a Gemini de pago; marco general v1.4, Acceso y roles v1.1 e Inscripción de binomios v1.1 | Aprobación de Importación desde Excel |
| 2026-09-27 | 1.9 | Se registra Dashboard aprobado y su implementación en código; marco general v1.5, Movimientos v1.2, Inscripción de binomios v1.2 y Acceso y roles v1.2. Todo el núcleo v1.0 queda documentado | Aprobación de Dashboard |
| 2026-09-27 | 1.10 | Se registra Formulario de inscripción aprobado (v1.1) y su implementación en código; marco general v1.6, Inscripción de binomios, Movimientos y Acceso y roles v1.3, Importación desde Excel y Dashboard v1.1 | Aprobación de Formulario de inscripción |
| 2026-09-27 | 1.11 | Se registra UX/UI aprobado y su implementación en código; marco general v1.7, Dashboard v1.2, Movimientos, Acceso y roles e Inscripción de binomios v1.4, Organización y evento v1.3 | Aprobación de UX/UI |
| 2026-09-27 | 1.12 | Ejecución de Fase 1 completada: esqueleto Next.js 15, base de datos en Railway con 24 tablas y restricciones migrada, carga inicial ejecutada con éxito (Club Parronal), Auth.js con Google, capa de permisos, contexto multi-tenant y tests unitarios | Implementación de Fase 1 y plan de ejecución |
