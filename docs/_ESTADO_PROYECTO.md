# Estado del Proyecto — Tesorería Parronal

Última actualización: 2026-09-27

## Resumen

Están aprobados el marco general y los componentes Organización y evento, Acceso y roles, Movimientos, Participantes, Inscripción de binomios, Dashboard, Importación desde Excel (v1.1) y Formulario de inscripción (v1.1) y UX/UI: todos los documentos del núcleo v1.0 están aprobados. Todavía no hay código. Si se ejecutara lo aprobado, el proyecto tendría definidos:

- quién puede hacer qué: dos administradores, ayudantes, observadores y solicitantes;
- el modelo de datos: organización, evento, movimientos, jinetes, caballos, apoderados, clubes, binomios, pruebas, conceptos, inscripciones, cargos, pagos y devoluciones;
- cómo se calculan saldo de caja, por cobrar, por pagar y por validar;
- el stack técnico y las reglas de cumplimiento de datos personales.

Con Organización y evento, además: el club y el concurso se cargan por script; el administrador edita el nombre y logo del club, las fechas y lugar del evento, y las categorías; administradores y ayudantes crean auspiciadores y proveedores desde el celular al registrar, y el administrador corrige, desactiva y fusiona duplicados. Toda consulta queda aislada por organización y toda referencia entre registros se valida contra la organización. Las fechas del evento son los días del concurso y no restringen la fecha de los movimientos.

Con Acceso y roles, además: cada persona entra con su cuenta de Google (correo verificado) y acepta el aviso de privacidad en su primer ingreso; quien no está aprobado queda como solicitante y no ve ningún dato; el administrador aprueba o rechaza solicitudes (con un contador dentro del portal), invita por correo, cambia roles y revoca accesos, y la organización nunca queda sin administrador. La sesión dura 30 días en el celular, y revocar surte efecto en la siguiente acción. Ayudantes y observadores ven la lista de la comisión sin correos. La matriz de permisos se aplica en el servidor desde una sola tabla.

Con Movimientos, además: administradores y ayudantes registran ingresos y gastos desde el celular con foto o PDF (comprimida en el teléfono) o con observación, en un solo envío con reintento que no duplica; lo que registra un ayudante queda por validar y el administrador valida u observa de a uno mirando el respaldo; los compromisos se registran como pendientes (proveedores, auspicios, reembolsos a la comisión) y se marcan pagados completos o por abonos, con fecha del hecho y fecha de pago; los auspicios en especie se registran aparte de la caja; las transferencias sin identificar esperan clasificación; nada se borra y la auditoría se ve en cada movimiento y, para administradores, en una pantalla general. El observador no ve respaldos, nombres de titulares ni observaciones.

Con Participantes, además: administradores y ayudantes registran clubes, jinetes, apoderados y caballos desde el celular, con aviso de posibles duplicados y bloqueo por RUT repetido, y el administrador los edita, desactiva y fusiona. Todo jinete y todo caballo pertenece a un club (quien no tiene uno va al club que la comisión cree para eso, por ejemplo "Particular"). La fecha de nacimiento y el contacto del jinete son opcionales. La edad se calcula a la fecha de referencia del evento, y los menores sin apoderado, los menores de 14 sin autorización registrada y los jinetes sin fecha de nacimiento muestran alertas que no bloquean. El observador no ve fechas de nacimiento, contactos, apoderados ni alertas.

Con Inscripción de binomios, además: el administrador configura las pruebas del evento (tarifa y límites de edad) y los conceptos que se cobran aparte (una cuota por binomio que se carga sola, y pensión o alojamiento que se cargan a mano a un jinete o club). Administradores y ayudantes inscriben binomios en pruebas desde el celular, con avisos de edad que no bloquean, y registran pagos: cada pago es un movimiento de "Inscripciones" que se reparte solo, de lo más antiguo a lo más reciente, y lo que sobra queda por asignar. El estado de cada inscripción o cargo se calcula (pendiente, parcial, pagado, becado, anulado o retirado) y muestra "por validar" mientras su pago no se valida. Los descuentos y becas llevan motivo, y los que hace un ayudante llegan al administrador para marcarlos como vistos o revertirlos. Solo el administrador desasigna pagos, retira binomios con devolución total, parcial o ninguna (lo no devuelto queda retenido) y devuelve sobrantes. Las fichas de jinete y club muestran el estado de cuenta y lo copian como texto para cobrar por WhatsApp. El observador ve montos y estados, pero no alertas, motivos ni estados de cuenta.

Con Importación desde Excel (v1.1), además: el administrador descarga una plantilla sin datos personales para enviarla a otras comisiones o clubes, y sube esa plantilla o cualquier planilla. La plantilla se reconoce sola; para otros formatos, la IA (Gemini de pago) propone qué columna es cada dato y el administrador lo confirma, o lo elige a mano. La vista previa vincula sola lo que coincide exacto, deja decidir lo parecido, omite lo ya inscrito y muestra errores y advertencias. Al confirmar se crean en una transacción clubes, jinetes, apoderados, caballos, binomios e inscripciones con la tarifa vigente y la cuota automática, sin pagos. Los pagos y montos que traiga la planilla quedan como listas para registrar o ajustar. La importación queda en auditoría con su archivo original y se puede anular lo que no tenga pagos.

Con Dashboard, además: el Dashboard es el inicio para todos. Todos ven el saldo de caja, por cobrar, por pagar y resultado proyectado, y en "Ver detalle" el resto de los indicadores del marco §6.7 (saldo de caja con su desglose en banco y efectivo, ingresos con la línea del aporte inicial, gastos, por cobrar, por pagar, resultado proyectado y, aparte, por validar, por asignar y en especie), y cada uno abre su lista filtrada. El administrador registra los traspasos entre banco y efectivo para que el desglose cuadre, y ve avisos de solicitudes, por validar, por asignar, ajustes por ver y menores con alertas. El ayudante ve "Lo mío" (por validar, observados y lo que le deben). Administrador y observador copian un resumen para WhatsApp. En v1.1 se suman el % pagado de las inscripciones (por monto y por cantidad), los ingresos y gastos por categoría, la evolución con horizonte configurable (por defecto, desde la creación del evento hasta su cierre) y el estado de la conciliación.

Con Formulario de inscripción (v1.1), además: el administrador comparte un enlace por evento (activable, con hora de cierre, instrucciones de pago y regenerable) y cualquiera inscribe un binomio desde el celular, sin login: datos del jinete, apoderado y caballo, pruebas con total estimado y, si ya transfirió, el comprobante. El club se autocompleta con los clubes activos para no duplicar; nada más del portal se muestra. Los menores de 14 requieren la casilla de autorización del apoderado; un menor sin apoderado se envía igual y llega marcado "Falta apoderado". Hay campo trampa y límites de envíos, sin terceros. Administradores y ayudantes revisan en la pestaña Por revisar: corrigen, deciden quién es quién con las reglas de la importación y aceptan en un paso que inscribe con la tarifa vigente y, si hay comprobante, registra el pago (por validar si acepta un ayudante). Las rechazadas pierden sus datos a los 30 días.

Con UX/UI, además: toda pantalla comparte una misma estructura. En el celular hay un menú hamburguesa, agrupado y con contadores de lo pendiente; en el computador, un menú lateral fijo. Administrador y ayudante registran desde un solo botón "+" con cuatro acciones (Gasto, Ingreso, Pago de inscripción, Inscribir binomio). Los estados usan cuatro tonos con palabra (listo, falta algo, problema, fuera de juego). Las listas usan tarjetas de dos líneas con un solo estado, con ingresos en verde y gastos en rojo. Las fichas tienen una acción principal abajo y el resto en ⋯, y los formularios, una columna con lo opcional plegado. La interfaz sigue el modo claro u oscuro del teléfono y se puede instalar en la pantalla de inicio (recortable a v1.1). En v1.1 se suma un buscador general.

Cada pantalla se construye a partir del documento de su componente. El núcleo (acceso, movimientos, participantes e inscripciones, y dashboard) debe estar en uso a más tardar el 2026-10-04. La importación desde Excel es v1.1.

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
