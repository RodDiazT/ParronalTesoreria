# Estado del Proyecto — Tesorería Parronal

Última actualización: 2026-09-27

## Resumen

Están aprobados el marco general y los componentes Organización y evento, Acceso y roles, Movimientos, Participantes, Inscripción de binomios e Importación desde Excel (v1.1); todavía no hay código. Si se ejecutara lo aprobado, el proyecto tendría definidos:

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
