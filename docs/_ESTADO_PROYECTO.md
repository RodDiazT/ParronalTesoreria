# Estado del Proyecto — Tesorería Parronal

Última actualización: 2026-10-01

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
- **Fase 3 (UX/UI Base, Configuración y Contrapartes):** COMPLETADA.
  - Reorganización de rutas internas bajo `src/app/(portal)/` con layout envolvente `<Estructura>`, manteniendo rutas públicas en la raíz.
  - Sistema de diseño accesible mobile-first con Tailwind CSS v4, PWA manifest e íconos generados (192 y 512 px).
  - Componentes estructurales y comunes: `<Encabezado>` (fixed 56px con logo dinámico o inicial neutra, título seguro de evento y drawer de navegación), `<MenuPrincipal>` (responsivo por rol), `<BotonRegistrar>` y `<HojaRegistrar>` (bottom sheet rápido con 4 accesos directos), `<Monto>`, `<Fecha>` y `<FranjaSinConexion>`.
  - Configuración del Evento (`/configuracion/evento` con control concurrente por `version`) y de la Organización (`/configuracion/organizacion` con subida/eliminación de logo y validación de magic bytes para PNG, JPEG y WebP hasta 1 MB, no SVG).
  - Configuración de Categorías (`/configuracion/categorias`) con pestañas Ingresos/Gastos, reordenamiento mediante botones ↑ / ↓, protección estricta de categorías de sistema (`inscripciones`, `devoluciones`, `aporte_inicial`) y selector `<SelectorCategoria>`.
  - Gestión de Contrapartes (`/contrapartes` y `/contrapartes/[id]`): listado táctil con búsqueda y filtros, detección de nombres similares mediante algoritmo Levenshtein (`sonNombresParecidos`), ficha detallada, fusión transaccional de duplicados con reasignación de movimientos y auditoría, y supresión de datos personales por ley de privacidad. Se descarta la portabilidad CSV por directriz de simplicidad y minimalismo. Selector `<SelectorContraparte>` con autocompletado y creación en un toque.
  - Suite completa de 64 tests unitarios y de integración pasando al 100% y linter limpio (0 errores, 0 warnings).
- **Fase 4 (Movimientos, Respaldos y Validación de Tesorería):** COMPLETADA.
  - Formulario móvil de registro rápido (`/movimientos/nuevo`) con teclado numérico, selección de tipo/medio/categoría/contraparte, detección no bloqueante de duplicados por monto y fecha cercana (±1 día), clave de transacción (`claveCliente`) generada en cliente para idempotencia garantizada, y opción "No sé de qué es" para ingresos sin identificar.
  - Almacenamiento seguro de respaldos en volumen persistente (`RUTA_RESPALDOS`) con validación estricta de magic bytes (JPEG, PNG, PDF; rechazo de SVG/HTML/ejecutables) y endpoint seguro `/api/respaldos/[id]` con verificación de membresía y rol (oculto a observador) con cabeceras `Cache-Control: private, no-store`.
  - Compresión previa en el navegador mediante HTML5 Canvas (máx. 1600 px, JPEG 80%), purgando metadatos EXIF por privacidad y optimizando transferencias bajo redes móviles inestables.
  - Listado de movimientos (`/movimientos`) con pestañas táctiles (*Todos*, *Por validar*, *Observados*, *Por cobrar*, *Por pagar*, *Sin respaldo*, *Sin identificar*), filtros sincronizados en parámetros de URL, tarjetas táctiles de dos líneas y fila de totales plegable según la regla `filtroSumable`.
  - Ficha detallada (`/movimientos/[id]`) con visualización de comprobantes, visor modal ampliado, línea de tiempo de auditoría e historial de abonos enlazados. Modales contextuales de edición con control de concurrencia (`version`), observación con comentario obligatorio, anulación con restitución de saldos y anulación en cascada de devoluciones vinculadas, y adición/anulación justificada de respaldos individuales.
  - Bandeja administrativa de validación individual (`/movimientos/validar`) con probidad estricta (`exigirNoPropio`, nadie valida lo propio), revisión visual ágil y pestaña de "Respaldos nuevos" con botón "Visto".
  - Gestión de cobranzas, pagos y abonos parciales (`marcarPagado`) con transacciones ACID y bloqueo de fila para prevenir condiciones de carrera.
  - Pantalla general de auditoría (`/auditoria`) para administradores con filtros y visor de diferencias JSON antes/después.
  - Suite de 83 tests pasando al 100% (9 suites de Vitest, incluyendo 19 tests de integración exhaustivos de movimientos) y compilación limpia en Next.js (0 errores, 0 warnings).
- **Fase 5 (Participantes: Jinetes, Caballos, Apoderados y Clubes):** COMPLETADA.
  - Reglas canónicas del dominio: `edadEnEvento` (cálculo exacto con fecha de referencia, zona horaria chilena y año bisiesto), `alertasJinete` (evaluación de menor sin apoderado, menor de 14 sin autorización registrada, jinete sin fecha y apoderado sin teléfono) y `buscarParecidos` (detección fonética/ortográfica Levenshtein para evitar duplicados en clubes, jinetes, apoderados y caballos).
  - Acciones del servidor y transacciones: creación atómica de jinete con apoderado y autorización, edición con control optimista de concurrencia (`version`), desactivación/reactivación, fusiones transaccionales seguras de duplicados con reasignación completa de dependencias hijas, y supresión de datos personales junto con exportación de portabilidad CSV (conforme a las Leyes 19.628 y 21.719).
  - Privacidad estricta por rol: el rol `observador` nunca recibe fecha de nacimiento, edad, contacto, RUT ni alertas (`ocultarDatosPersonales`), y tiene bloqueado el acceso a apoderados con error 403.
  - Componentes táctiles: chips visuales `<AlertasJinete>` y selectores con búsqueda y alta rápida inline (`<SelectorClub>`, `<SelectorJinete>`, `<SelectorCaballo>`, `<SelectorApoderado>`).
  - Pantallas del portal: listado `/participantes` con 4 pestañas y filtro rápido "Con alertas", alta rápida móvil `/participantes/jinetes/nuevo` con edad en vivo, y fichas de detalle `/participantes/jinetes/[id]`, `/participantes/clubes/[id]`, `/participantes/caballos/[id]` y `/participantes/apoderados/[id]`.
  - Suite de 30 tests unitarios y de integración de participantes pasando al 100%. Total del proyecto: 113 tests pasando al 100% (10 suites de Vitest) y build de producción Next.js limpio.
- **Fase 6 (Inscripción de Binomios, Pruebas, Cargos, Pagos, Retiros y Cobranza WhatsApp):** COMPLETADA.
  - Dominio y lógica de negocio (`src/dominio/inscripciones/binomios/`):
    - `reglas.ts`: función canónica `estadoItem` (pendiente, parcial, pagado, becado, retirado, marca `porValidar`), `retiroItem` con cálculo de pagado/devuelto/retenido, `porAsignar`, algoritmo FIFO `repartirMonto`, `avisoEdadPrueba`, `ocultarDatosInscripcion` (ocultamiento riguroso de contacto/RUT/avisos para observador).
    - `consultas.ts`: listados con filtros táctiles (todas, por cobrar, por asignar, con alertas, por prueba, retiros), ficha completa del binomio (`fichaBinomio`), desglose por prueba (`resumenPorPrueba`), agrupaciones y cálculo de indicadores de dashboard (`porCobrarInscripciones`, `totalPorAsignar`), generador de estado de cuenta para WhatsApp anonimizado (`generarMensajeWhatsApp`).
    - `acciones.ts`: gestión de pruebas y conceptos (`crearPrueba`, `editarPrueba`, `ordenarPruebas`, `crearConcepto`, etc.), flujo atómico `inscribir` con cuotas automáticas por binomio (`automatico: true`), `agregarCargo`, `ajustarItem` con motivo y aviso no bloqueante "Visto" para administradores, cambios pre-concurso (`cambiarPrueba`, `cambiarParBinomio`, `moverInscripcion`, `cambiarClubBinomio`), anulación de ítems y anulación completa de binomios.
    - `pagos.ts`: `registrarPagoInscripciones` mediante movimiento en categoría de sistema `inscripciones`, imputación manual y asignación FIFO con transacciones ACID, `asignarPorAsignar` desde ingresos huérfanos o excedentes, `corregirReparto`, `desasignarPago`.
    - `retiros.ts`: `ejecutarRetirar` (retiro de binomio completo o pruebas individuales, retención o devolución), registro de devoluciones (`registrarDevolucionRetiro`, `devolverSobrante`) con generación de gasto en categoría de sistema `devoluciones`.
  - Integraciones transversales:
    - Gancho `reasignarPorFusion` en Participantes con detección y bloqueo de `ConflictoBinomios`.
    - Función interna `registrarMovimientoSistema` en Movimientos y pantalla de asignación (`/inscripciones/movimientos/[id]/asignar`) para ingresos huérfanos o con saldo sobrante.
    - Consulta `inscripcionesAfectadasPorCambioDeFecha` en Configuración del Evento.
  - Componentes táctiles y pantallas del portal (`src/app/(portal)/`):
    - Componentes `<RepartoPago>`, `<EstadoItemBadge>`, `<EstadoCuenta>`, botón táctil "Copiar para WhatsApp", bandeja de "Ajustes de inscripción" en `/movimientos/validar`.
    - Pantallas completas: `/configuracion/pruebas`, `/inscripciones` (6 pestañas dinámicas), `/inscripciones/nueva` (con selectores en vivo), `/inscripciones/binomios/[id]` (ficha completa con historial, auditoría y modales de ajuste/cambio), `/inscripciones/pago`, `/inscripciones/movimientos/[id]/asignar`, `/inscripciones/binomios/[id]/retirar`.
  - Suite de pruebas automatizadas:
    - `src/dominio/inscripciones/binomios/binomios.test.ts` con 19 pruebas de integración y unitarias pasando al 100%. Total del proyecto: 152 tests pasando en 13 suites de Vitest y build de producción Next.js limpio (42 rutas compiladas).
- **Fase 7 (Dashboard por Rol y Traspasos entre Medios de Pago):** COMPLETADA.
  - Motor de cálculo dinámico (`src/dominio/dashboard/calculos.ts`): consultas de agregación sin saldos estáticos, cálculo de saldo de caja (`ingresosPercibidos - gastosPagados`), resultado proyectado (`saldoCaja + porCobrar - porPagar`) y desglose estricto por medios (`transferencia + efectivo + otro === saldoCaja`). Desglose de aporte inicial, pendientes a proveedores vs reembolsos a la comisión, y sección aparte (por validar, por asignar, en especie).
  - Avisos del Administrador (`avisosAdministrador`) y resumen "Lo mío" del Ayudante (`loMio`) con comentarios de revisión y botón de corrección.
  - Generador de texto limpio para WhatsApp (`textoResumen`) al formato normado (§3.7) con acción protegida (`copiarResumenAccion`: administradores y observadores permitidos; ayudantes bloqueados con 403).
  - Módulo de Traspasos (`src/dominio/dashboard/traspasos.ts`, `acciones.ts` y `/traspasos`): registro exclusivo para administradores, regla `desde !== hacia`, comprobante u observación obligatoria, almacenamiento seguro con magic bytes, endpoint autenticado `/api/traspasos/[id]/archivo` (`puedeVerRespaldos`), anulación atómica con reversión de saldos, concurrencia por `version`, idempotencia por `claveCliente`, auditoría y privacidad de observador (`ocultarDatosTraspaso`).
  - Interfaz multirrol en portal (`/`): `<TarjetaSaldo>` con advertencia interactiva de saldo negativo, `<BloquePorRevisar>` para admin, `<BloqueLoMio>` para ayudante, `<FilasResumen>` con bottom sheets de desglose, `<DetalleDashboard>` plegable con persistencia en `localStorage` y bienvenida para eventos sin movimientos.
  - Suite de 13 pruebas exhaustivas en `dashboard.test.ts` con aislamiento total de base de datos. Total del proyecto: 126 pruebas en 11 suites de Vitest pasando al 100% y build de Next.js limpio.
- **Fase 8 (Pruebas Integrales, Despliegue en Railway y Puesta en Marcha):** COMPLETADA.
  - Suite de integración integral (`src/dominio/integracion/fase8.test.ts`) con 7 pruebas automatizadas de extremo a extremo cubriendo: aislamiento estricto multi-tenant con `db(ctx)`, `exigirDeLaOrganizacion` y rechazo foráneo; cuadratura matemática de tesorería (`saldoCaja === ingresosPercibidos - gastosPagados`); desglose de `saldoPorMedio`; impacto de traspasos y restitución atómica al anular; integridad de pagos parciales (`abono`), amortización de deuda y restitución; y probe del endpoint `/api/health`.
  - Configuración de orquestación y despliegue en Railway (`railway.json`) con builder Nixpacks, build `npm run build`, start `npm run start`, healthcheck path `/api/health` con timeout de 100 s y política de reinicio `ON_FAILURE`.
  - Endpoint de healthcheck de producción `/api/health` (`src/app/api/health/route.ts`) con probe directo a PostgreSQL (`SELECT 1`), sin requerir sesión (`RUTAS_PUBLICAS` en `src/middleware.ts`).
  - Total del proyecto: 133 pruebas pasando al 100% en 12 suites de Vitest y compilación de producción Next.js limpia (22 rutas, 0 errores, 0 warnings).


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
| 2026-09-27 | 1.13 | Ejecución de Fase 2 completada: pantallas públicas (`/ingresar`, `/privacidad`, `/bienvenida`, `/solicitud`), panel de administración `/usuarios` con bloqueo de último administrador activo, `/comision` y `/mi-cuenta` con descarga JSON y revocación inmediata de sesiones | Implementación de Fase 2 |
| 2026-09-27 | 1.14 | Ejecución de Fase 3 completada: estructura visual responsive (`<Estructura>`, `<Encabezado>`, `<MenuPrincipal>`, `<HojaRegistrar>`), PWA manifest e íconos, pantallas `/configuracion/*` (evento, organización con logo, categorías con reordenamiento), módulo `/contrapartes` con parecidos Levenshtein, fusión y supresión de datos. Suite de 64 tests pasando al 100% | Implementación de Fase 3 |
| 2026-09-27 | 1.15 | Ejecución de Fase 4 completada: módulo de movimientos (`/movimientos`, `/movimientos/nuevo`, `/movimientos/[id]`), compresión Canvas, almacenamiento persistente y endpoint seguro `/api/respaldos/[id]`, bandeja de validación individual `/movimientos/validar` con probidad `exigirNoPropio`, pagos y abonos concurrentes (`marcarPagado`), y auditoría general `/auditoria`. Suite de 83 tests pasando al 100% | Implementación de Fase 4 |
| 2026-09-27 | 1.16 | Ejecución de Fase 5 completada: módulo de participantes (`/participantes`, `/participantes/jinetes/nuevo`, `/participantes/jinetes/[id]`, `/participantes/clubes/[id]`, `/participantes/caballos/[id]`, `/participantes/apoderados/[id]`), reglas de edad `edadEnEvento`, alertas de menores `alertasJinete`, detección de parecidos Levenshtein `buscarParecidos`, creación atómica de jinete con apoderado y autorización, fusiones transaccionales de clubes, jinetes y caballos duplicados, y privacidad normada (Ley 19.628 / 21.719) con supresión y descarga CSV. Suite de 30 tests de participantes y 113 tests totales del proyecto pasando al 100% | Implementación de Fase 5 |
| 2026-09-28 | 1.17 | Diagnóstico y revisión exhaustiva de Fase 6: se documenta el estado de implementación detallando las bases previas consolidadas (modelos Prisma, permisos en matriz, rutas de menú y cascadas parciales) versus los componentes de dominio, pantallas de portal, ganchos de integración y suite de tests pendientes para su ejecución | Revisión y diagnóstico de Fase 6 |
| 2026-09-28 | 1.18 | Ejecución de Fase 7 completada: módulo de Dashboard multirrol (`/`), motor de KPIs dinámicos sin saldos estáticos (`indicadores`, `saldoPorMedio`, `avisosAdministrador`, `loMio`, `textoResumen`), módulo de Traspasos (`/traspasos`, `/traspasos/nuevo`), endpoint seguro `/api/traspasos/[id]/archivo`, Server Actions desacopladas, y suite de 13 tests con aislamiento en `dashboard.test.ts`. Total: 126 tests en 11 suites pasando al 100% y build de Next.js limpio | Implementación de Fase 7 |
| 2026-09-28 | 1.19 | Ejecución de Fase 8 completada: configuración de despliegue en Railway (`railway.json`), endpoint de monitoreo `/api/health`, ajuste de middleware público y suite de integración integral (`fase8.test.ts`) con 7 pruebas que validan aislamiento multi-tenant, cuadratura matemática de caja, traspasos y pagos parciales. Total: 133 tests en 12 suites pasando al 100% y build de Next.js limpio | Implementación de Fase 8 |
| 2026-09-29 | 1.20 | Auditoría exhaustiva de Administrador y Hard Reset en ambiente de pruebas: resolución de BUG-01 (preselección cruzada de club en inscripciones), BUG-02 (eliminación resiliente de pruebas con inscripciones anuladas sin pagos), BUG-03 (insignias contables de sujeto imputado en /movimientos), BUG-04 (búsqueda insensible a tildes con normalizarBusqueda), MEJORA-01 (onboarding guiado en 3 pasos en dashboard limpio), MEJORA-02 (deselección rápida en combobox de categorías) y cumplimiento de restricción check_movimiento_pagado_fecha. Hard reset ejecutado con éxito en Railway pruebas preservando Organización oficial, Evento, Administrador y Categorías del sistema | Auditoría integral y saneamiento operativo |
| 2026-09-29 | 1.21 | Auditoría y modernización integral de Usabilidad UX/UI y Ergonomía en Terreno: resolución de BUG-05 (visibilidad de categorías personalizadas de gasto mediante `OR: [{ claveSistema: null }, { claveSistema: { not: 'devoluciones' } }]`), BUG-06 (soporte de elevación dinámica `zIndex` en `<Sheet>` y `data-sheets-abiertas` para resolver ocultamiento de modal anidado "Crear Club"), unificación de doble fecha a fecha única en movimientos con toggle secundario opcional, selector compacto horizontal para "Quién pagó", colapso de tarifas/becas en pruebas, colapso de campos opcionales en altas rápidas de entidades y contrapartes, y pestañas de movimientos adaptadas responsivamente para móvil. Suite completa de 138 tests pasando al 100% y build limpio de Next.js. | Implementación completa de mejoras de Usabilidad UX/UI |
| 2026-09-30 | 1.22 | Implementación completa de Servicios y Cargos Operativos, Tarifas Estándar y Reparto Multiconcepto: nuevo modelo `Cargo` desacoplado del movimiento bancario, tarifas estándar sugeridas en categorías con entidad asociada (`tarifaBaseClp`), motor de pagos con reparto multiconcepto ACID unificando inscripción + cargo en 1 movimiento, submenú dinámico indentado bajo Directorio con semáforo y contadores, pantalla nómina del servicio `/servicios/[categoriaId]` con métricas, cobro en 1 clic y WhatsApp, e integración en fichas de caballos y estado de cuenta global. Suite de 7 tests pasando al 100% (total 145 tests). | Implementación de Servicios y Cargos Operativos |
| 2026-10-01 | 1.23 | Saneamiento de submenú de servicios en Directorio y aislamiento multi-tenant en suites de test: purga de categorías residuales generadas por pruebas en base de datos, adición de filtro estricto `claveSistema: null` en `layout.tsx` para garantizar que solo categorías configuradas por el usuario aparezcan bajo Directorio, y aislamiento completo con ciclo de vida dedicado de organizaciones de prueba en `cargos.test.ts` y `categorias.test.ts`. | Saneamiento de base de datos y aislamiento de tests |
| 2026-10-01 | 1.24 | Reubicación de Inscripciones bajo Directorio, auto-completado de binomio y corrección de comboboxes: reubicación de Inscripciones como sub-ítem permanente bajo Directorio (eliminado del menú superior), corrección de blur prematuro en `SelectorJinete`, `SelectorCaballo`, `SelectorClub` y `SelectorApoderado` mediante `onMouseDown` preventDefault y salvaguarda de foco, auto-completado inteligente bidireccional en `/inscripciones/nueva` (club y caballo habitual del jinete), y purga completa de datos dummy en Parronal con aislamiento de `binomios.test.ts` y `participantes.test.ts`. | Usabilidad en Inscripciones, corrección de comboboxes y saneamiento de participantes |




