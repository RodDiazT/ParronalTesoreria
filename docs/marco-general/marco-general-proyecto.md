# Marco General — Tesorería Parronal

Estado: En revisión · Versión 0.1 · Responsable: Rod (Administrador) · Ejecutor: Claude Code

## Índice

1. Propósito del proyecto
2. Actores y permisos
3. Objetivos transversales y métricas
4. Alcance por versión
5. Modelo de dominio conceptual
6. Reglas de negocio transversales
7. Principios rectores
8. Stack y recursos base
9. Cumplimiento normativo transversal
10. Repositorio documental, carpetas de dominio y estructura de código
11. Documentos hijos de primer nivel
12. Plan de acción
13. Riesgos
14. Control de cambios

Padre: ninguno (raíz técnica del proyecto). Hijos: ver sección 11.

---

## 1. Propósito del proyecto

Portal web privado de tesorería para el concurso ecuestre del club, que se realiza el **21 de noviembre de 2026**. Reemplaza el manejo informal (planillas sueltas, gastos sin respaldo, cuentas que no cuadran) por un único lugar donde:

- se registra cada ingreso y cada gasto, con su respaldo o con una observación que explica por qué no lo tiene;
- el tesorero valida lo que registran los ayudantes;
- se controla qué binomios y auspiciadores pagaron, cuánto y qué falta;
- se sabe en todo momento cuánto dinero hay, cuánto falta cobrar y cuánto se debe;
- al final, se cierra el evento y se **rinde y traspasa al club** el resultado, con el libro completo y sus respaldos.

El portal registra y controla. No cobra, no paga, no emite documentos tributarios y no es la contabilidad formal del club.

---

## 2. Actores y permisos

### 2.1 Actores

| Actor | Descripción | Qué necesita del proyecto |
|---|---|---|
| Administrador | Tesorero (presidente de la comisión) y **un administrador de respaldo**. Configura, aprueba accesos, valida, cierra y rinde. | Control total, trazabilidad de lo que hacen los demás, saber en todo momento cuánto hay y qué falta. |
| Ayudante | Miembro de la comisión que registra ingresos, gastos, inscripciones y pagos. | Registrar un movimiento en menos de un minuto desde el celular, en la cancha. |
| Observador | Socio autorizado, solo lectura. | Ver balance, KPIs y detalle sin poder modificar. |
| Solicitante | Persona que inició sesión con Google sin acceso aprobado. | Saber que su solicitud está pendiente. No ve ningún dato. |
| Participante (binomio jinete–caballo) | No usa el portal en v1. | Que su inscripción y pagos queden bien registrados. |
| Auspiciador / Proveedor | No usan el portal. Contrapartes de ingresos y gastos. | Que sus aportes o cobros queden registrados. |
| Club (directorio) | Destinatario de la rendición final. No usa el portal. | Recibir un informe cuadrado con respaldos y el saldo a traspasar. |

Escala de diseño: **5 usuarios como máximo** por organización. Nada se dimensiona por encima de eso.

### 2.2 Matriz de permisos

| Acción | Administrador | Ayudante | Observador | Solicitante |
|---|---|---|---|---|
| Ver dashboard y listados | Sí | Sí | Sí | No |
| Ver archivos de respaldo | Sí | Sí | **No** (solo ve que existe) | No |
| Ver datos de contacto y RUT de contrapartes | Sí | Sí | **No** | No |
| Registrar movimientos, inscripciones y pagos | Sí | Sí | No | No |
| Editar un movimiento propio **por validar u observado** | Sí | Sí | No | No |
| Editar un movimiento validado | Sí (queda en auditoría) | No | No | No |
| Validar u observar movimientos | Sí | No | No | No |
| Anular movimientos, pagos o inscripciones | Sí | Solo los propios por validar | No | No |
| Marcar un pendiente como pagado o cobrado | Sí | Sí (queda por validar) | No | No |
| Aprobar accesos y asignar roles | Sí | No | No | No |
| Configurar evento y categorías | Sí | No | No | No |
| Cerrar el evento y generar la rendición | Sí | No | No | No |
| Ver historial de auditoría | Sí | Solo de sus registros | No | No |

Reglas de rol:

- Los roles se asignan **por organización** (una `Membresia`). Una persona puede tener roles distintos en organizaciones distintas.
- Una organización nunca puede quedar sin al menos un administrador activo.
- Un ayudante nunca valida sus propios movimientos ni cambia roles, categorías o configuración.
- Los movimientos que registra un administrador quedan **validados al registrarse** (ver 6.2), con registro en auditoría y la opción de adjuntar respaldo.

---

## 3. Objetivos transversales y métricas

| Objetivo | Métrica | Meta |
|---|---|---|
| Operativo a tiempo | Núcleo v1.0 en uso con datos reales | 2026-10-04 |
| Trazabilidad total | Movimientos con respaldo **o** con observación que justifica su ausencia | 100 % |
| Trazabilidad total | Registros borrados físicamente | 0 (solo anulaciones con motivo) |
| Rendición al tesorero | Mediana de tiempo entre registro y validación | < 48 h |
| Rendición al tesorero | Movimientos por validar al cerrar el evento | 0 |
| Control de cobranza | Inscripciones con estado de pago conocido el día del evento | 100 % |
| Visibilidad en tiempo real | Tiempo para registrar un gasto con foto desde el celular | < 1 minuto |
| Cuadratura | Diferencia entre el saldo del portal y el saldo real (banco + efectivo) al cierre | $0 |
| Rendición al club | Informe de rendición entregado tras el evento | ≤ 15 días después del 2026-11-21 (propuesta, a confirmar con el club) |
| Costo mínimo | Costo incremental de infraestructura | $0 adicional (cuenta Railway existente de Rod, costo hundido) |

---

## 4. Alcance por versión

### v1.0 — núcleo operativo, en uso al 2026-10-04

- Inicio de sesión con Google; todo usuario nuevo entra como solicitante sin acceso.
- Roles administrador, ayudante y observador por organización; dos administradores.
- Arquitectura multi-organización con aislamiento; el club es una `Organizacion` y el concurso un `Evento`.
- Categorías de ingreso y gasto configurables por el administrador.
- Movimientos de ingreso y gasto con respaldo (foto o PDF) u observación, validación, observación del administrador y anulación con motivo.
- Estado de pago del movimiento: pagado o pendiente. Esto cubre las **cuentas por cobrar y por pagar mínimas**: reembolsos a ayudantes, proveedores a crédito y auspicios comprometidos.
- Auspicios en especie o canje, valorizados y separados de la caja.
- Binomios, inscripciones y pagos de inscripción (un pago de inscripción **es** un movimiento de ingreso; ver 6.4).
- Dashboard básico: saldo de caja, ingresos, gastos, por cobrar, por pagar y por validar.
- Aviso de posible duplicado al registrar.
- Historial de auditoría.
- Interfaz liviana para celular: fotos comprimidas antes de subir y reintento si falla la subida.

### v1.1 — antes del 2026-11-21 (objetivo interno: 2026-11-14, para probarlo antes del evento)

- **Registro sin señal:** el movimiento y su foto se guardan en el teléfono y se envían al volver la conexión. Se prioriza porque la señal en el club ya es baja y empeorará con público.
- KPIs ampliados: recaudación por categoría, % de inscripciones pagadas, evolución en el tiempo, saldo por medio de pago (banco / efectivo).
- Pendientes ampliados: vista consolidada de por cobrar y por pagar, y tareas de la comisión.
- Cierre del evento y rendición: el evento pasa a solo lectura y se exporta el informe de rendición (resumen, libro de movimientos, respaldos y saldo a traspasar) en planilla y PDF.

### Futuro

- Eliminación de datos de contacto al vencer el plazo de conservación (debe estar implementada antes de que venza el primer plazo; ver 9.5).
- Presupuesto versus real.
- Autoinscripción de participantes por formulario o enlace.
- Pagos en línea y conciliación con cartola.
- Notificaciones de pagos pendientes.
- Reutilización para otros eventos del club u otros clubes (el modelo ya lo admite; falta solo la experiencia de crear organizaciones desde la interfaz).

### Fuera de alcance explícito

Contabilidad formal del club; emisión de boletas o facturas; declaraciones ante el SII; cualquier movimiento real de dinero; acceso público a cualquier dato; almacenamiento de datos de tarjetas o credenciales bancarias.

---

## 5. Modelo de dominio conceptual

Nombres oficiales, iguales en documentos y código (sin tildes en el código). No se usan sinónimos: se dice siempre "movimiento", nunca "transacción".

| Entidad | Qué representa | Relaciones clave |
|---|---|---|
| `Organizacion` | Unidad de aislamiento (el club). | Tiene eventos, membresías, categorías y contrapartes. |
| `Usuario` | Persona que inicia sesión con Google (correo, nombre). | Tiene membresías. |
| `Membresia` | Usuario + organización + rol + estado. | Estado: `solicitada`, `activa`, `revocada`. Rol: `administrador`, `ayudante`, `observador`. |
| `Evento` | El concurso. | Pertenece a una organización. Estado: `abierto`, `cerrado`, `rendido`. |
| `Categoria` | Clasificación de movimientos. | Pertenece a la organización (reutilizable entre eventos). Tipo: `ingreso` o `gasto`. Puede ser de sistema (no se elimina). |
| `Contraparte` | Persona u organización externa: jinete, auspiciador, proveedor, otro. | Pertenece a la organización. Datos mínimos (ver 9.3). |
| `Movimiento` | Ingreso o gasto del evento. | Pertenece a un evento; tiene categoría, contraparte opcional, respaldos y pagos de inscripción asociados. |
| `Respaldo` | Archivo (foto o PDF) que respalda un movimiento o su pago. | Pertenece a un movimiento. Un movimiento puede tener varios. |
| `Binomio` | Jinete (una `Contraparte`) + caballo, en un evento. | Un jinete con varios caballos son varios binomios. |
| `Inscripcion` | Inscripción de un binomio con su monto a pagar. | Pertenece a un binomio. El detalle (pruebas, tarifas, descuentos) lo define su documento. |
| `Pago` | Asignación de un movimiento de ingreso a una inscripción. | Une `Movimiento` e `Inscripcion` con un monto. Un movimiento puede cubrir varias inscripciones. |
| `Pendiente` | Tarea de la comisión (v1.1). | No representa dinero: lo por cobrar y por pagar se deriva de movimientos e inscripciones. |
| `RegistroAuditoria` | Evento de auditoría inmutable. | Referencia a la entidad afectada, al usuario y a la organización. |

### 5.1 Atributos principales del `Movimiento`

| Atributo | Valores | Nota |
|---|---|---|
| `tipo` | `ingreso`, `gasto` | |
| `naturaleza` | `dinero`, `especie` | `especie` no afecta caja ni balance (ver 6.6). |
| `montoClp` | entero positivo | CLP sin decimales. En especie, valor estimado. |
| `fecha` | fecha local (America/Santiago) | Fecha en que ocurrió, no en que se registró. |
| `medioPago` | `transferencia`, `efectivo`, `otro` | |
| `estadoPago` | `pagado`, `pendiente` | Ingreso pendiente = por cobrar. Gasto pendiente = por pagar. |
| `pagadoPor` | `caja` o un `Usuario` | Solo gastos. Si es un usuario, el gasto nace pendiente de reembolso. |
| `estadoValidacion` | `por_validar`, `validado`, `observado` | |
| `sinRespaldo` | sí/no | Si es sí, la observación es obligatoria. |
| `observacion` | texto | Libre; obligatoria sin respaldo. |
| `anulado` | sí/no + motivo + quién + cuándo | Anulado nunca se borra. |
| `posteriorAlCierre` | sí/no | Marca los ajustes registrados tras cerrar el evento. |
| `registradoPor`, `creadoEn`, `version` | | `version` evita que dos personas se pisen al editar. |

### 5.2 Diagrama de relaciones

```
Organizacion ─┬─ Membresia ── Usuario
              ├─ Categoria
              ├─ Contraparte
              └─ Evento ─┬─ Movimiento ─┬─ Respaldo
                         │              └─ Pago ──┐
                         └─ Binomio ── Inscripcion ┘
RegistroAuditoria → (cualquier entidad), siempre con organizacionId
```

Todas las tablas con datos de negocio llevan `organizacionId`, incluso cuando podría derivarse, para que el aislamiento se aplique con un solo filtro.

---

## 6. Reglas de negocio transversales

### 6.1 Montos, fechas e idioma

- Montos en CLP como enteros sin decimales. Nunca se guardan montos negativos: el signo lo da el `tipo`.
- Instantes guardados en UTC y mostrados en America/Santiago. Las fechas de negocio (`fecha` del movimiento) son fechas locales.
- Interfaz y documentos en español.

### 6.2 Validación (rendición al tesorero)

1. El ayudante registra: el movimiento queda `por_validar`.
2. El administrador lo **valida** o lo **observa** con un comentario (respaldo ilegible, monto que no cuadra, categoría errónea).
3. Un movimiento observado vuelve al ayudante, que lo corrige y lo reenvía (`por_validar`), o el administrador lo anula con motivo.
4. Los movimientos que registra un administrador quedan `validado` al registrarse, con constancia en auditoría de que fue autovalidado. Igual pueden llevar respaldo, y la regla de "respaldo u observación" se les aplica igual.
5. Editar un movimiento validado solo puede hacerlo un administrador, y queda en auditoría con el antes y el después.

### 6.3 Respaldo u observación

- Todo movimiento tiene al menos un respaldo **o** está marcado `sinRespaldo` con una observación que explica por qué (por ejemplo, "efectivo recibido en terreno, sin comprobante").
- Los movimientos sin respaldo se destacan en la lista del administrador al validar y en la rendición.
- Formatos aceptados: imagen (JPEG, PNG, HEIC convertido) y PDF, hasta 10 MB por archivo. Las fotos se comprimen en el teléfono antes de subir.

### 6.4 Pagos de inscripción

- Un pago de inscripción se registra como **un movimiento de ingreso** (categoría de sistema "Inscripciones") y uno o más `Pago` que lo asignan a inscripciones. El dinero se cuenta una sola vez.
- Una transferencia que cubre varios binomios se registra una vez y se reparte en varios `Pago`. La suma de los `Pago` no puede superar el monto del movimiento.
- Una transferencia recibida sin saber a quién corresponde se registra igual y queda **por asignar** hasta que se asocie.
- El estado de pago de la inscripción (`pendiente`, `parcial`, `pagado`, `anulado`) se calcula a partir de sus pagos; no se escribe a mano.
- Una devolución a un binomio que se retira es un movimiento de gasto (categoría de sistema "Devoluciones") vinculado a la inscripción.

### 6.5 Por cobrar, por pagar y reembolsos

- Un gasto pagado por un ayudante de su bolsillo se registra como gasto con `pagadoPor` = ese usuario y nace `pendiente`: es una cuenta por pagar a esa persona. Cuando la caja le devuelve el dinero, se marca `pagado` con la fecha, el medio y, si existe, el comprobante del reembolso.
- Un proveedor que cobrará después se registra como gasto `pendiente` (por pagar).
- Un auspicio comprometido pero no recibido se registra como ingreso `pendiente` (por cobrar).
- Lo por cobrar de inscripciones se calcula como el monto de cada inscripción menos sus pagos.

### 6.6 Auspicios en especie

- Se registran como movimiento de ingreso con `naturaleza` = `especie` y valor estimado.
- Aparecen en el detalle de auspicios y en la rendición, pero **no suman** a la caja, al balance ni a los KPIs de dinero.

### 6.7 Cálculos del dashboard (definición única)

Solo se consideran movimientos no anulados de `naturaleza` = `dinero`.

| Indicador | Cálculo |
|---|---|
| Ingresos percibidos | Ingresos `pagado` y `validado` |
| Gastos pagados | Gastos `pagado` y `validado` |
| **Saldo de caja** | Ingresos percibidos − gastos pagados |
| Por cobrar | Ingresos `pendiente` validados + saldo de inscripciones no pagadas |
| Por pagar | Gastos `pendiente` validados (incluye reembolsos) |
| Resultado proyectado | Saldo de caja + por cobrar − por pagar |
| Por validar | Monto y cantidad de movimientos `por_validar` u `observado`, mostrados **aparte** |
| Por asignar | Ingresos de inscripciones aún no asignados a una inscripción |
| En especie | Suma de valores estimados, mostrada aparte |

Cualquier documento que muestre estos indicadores los referencia desde aquí; no los redefine.

### 6.8 Anulación y auditoría

- Ningún movimiento, pago, inscripción, binomio ni respaldo se borra físicamente. Se anula con motivo y queda visible en el historial.
- `RegistroAuditoria` guarda: organización, usuario, entidad, identificador, acción (`crear`, `modificar`, `validar`, `observar`, `anular`, `marcar_pagado`, `asignar_pago`, `cambiar_rol`, `aprobar_acceso`, `cerrar_evento`, etc.), valores antes y después, y fecha. Es solo de inserción: ni la aplicación ni un administrador pueden editarlo.

### 6.9 Duplicados y concurrencia

- Al registrar, el sistema avisa si existe otro movimiento del mismo evento con igual tipo, monto y fecha (±1 día) y misma contraparte o categoría. Es un aviso, no un bloqueo.
- Si dos personas editan el mismo registro, la segunda recibe un aviso de que cambió y debe recargar (control por `version`).

### 6.10 Ciclo del evento

- `abierto`: operación normal.
- `cerrado` (v1.1): lo cierra un administrador cuando no quedan movimientos por validar. Queda de solo lectura; un movimiento que llega después solo lo registra un administrador y queda marcado `posteriorAlCierre`.
- `rendido`: el club aprobó la rendición. Se registra la fecha, que inicia el plazo de conservación (9.5).

---

## 7. Principios rectores

1. **El núcleo primero.** Nada entra en v1.0 si pone en riesgo tenerlo en uso el 2026-10-04. Se recorta antes de atrasar.
2. **Un registro, una verdad.** Cada peso se registra una vez; las vistas (dashboard, por cobrar, rendición) se calculan, no se duplican.
3. **Nada se borra.** Se anula con motivo y queda en auditoría.
4. **Aislamiento por defecto.** Toda consulta exige una organización y una membresía activa; no existe consulta "sin organización".
5. **El club es un dato.** Nombres, fechas y montos del club o del concurso nunca van en el código.
6. **Celular primero.** Cada pantalla de registro se diseña para una mano, en exterior y con mala señal.
7. **Dimensionado para 5 usuarios.** Sin colas, caches, microservicios ni servicios pagados adicionales.
8. **Costo incremental cero.** Todo corre en la cuenta Railway existente.

---

## 8. Stack y recursos base

| Capa o recurso | Decisión | Justificación |
|---|---|---|
| Aplicación | Next.js (versión estable vigente, App Router) con TypeScript | Una sola app para pantallas y API; menos piezas que desplegar; el ejecutor la implementa con rapidez. |
| Interfaz | Tailwind CSS, diseño mobile-first | Rápido de construir y liviano en el celular. |
| Validación de datos | Zod, compartido entre formulario y servidor | Una sola definición de reglas por formulario. |
| Base de datos | PostgreSQL de Railway | Relacional, adecuado para montos y auditoría; incluido en la cuenta existente. |
| Acceso a datos | Prisma | Esquema declarativo y migraciones versionadas en el repositorio. |
| Autenticación | Auth.js con proveedor Google, sesiones en base de datos | Login con Google sin contraseñas propias; revocar un acceso surte efecto de inmediato. |
| Archivos de respaldo | Volumen persistente de Railway montado en la app (ruta por variable de entorno `RUTA_RESPALDOS`) | Mismo proveedor, sin cuentas extra; el volumen esperado es menor a 1 GB. Los archivos se sirven solo a través de la app, tras verificar permisos; nunca por URL pública. |
| Compresión de fotos | En el navegador, antes de subir (máx. ~1600 px, JPEG) | Menos datos con mala señal y menos espacio. |
| Registro sin señal (v1.1) | Borrador local en el navegador (IndexedDB) y cola de envío | Sin servicios externos. |
| Exportación (v1.1) | Planilla (XLSX o CSV) y PDF generados en el servidor | Sin servicios externos. |
| Pruebas | Vitest para reglas de negocio, permisos y aislamiento | Las reglas de dinero y de acceso se prueban antes de desplegar. |
| Despliegue | Cuenta Railway existente de Rod, URL entregada por la plataforma, sin dominio propio | Costo hundido; HTTPS incluido. |
| Idioma del código | Dominio en español sin tildes (modelos `Movimiento`, `Inscripcion`; campos `montoClp`, `estadoValidacion`); términos técnicos del framework en inglés | Los nombres coinciden con los documentos; no hace falta tabla de equivalencias. Columnas en la base en `snake_case`. |

Variables de entorno mínimas: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `RUTA_RESPALDOS`.

Copias de seguridad: se verifica si el plan de Railway incluye respaldo de la base y del volumen. Si no, en v1.0 se hace una copia manual semanal (volcado de la base + descarga de respaldos) y la exportación de v1.1 sirve como copia fuera de Railway.

---

## 9. Cumplimiento normativo transversal

Aplica: el proyecto trata datos personales (usuarios, jinetes, auspiciadores, proveedores), datos financieros de terceros contenidos en comprobantes de transferencia, pagos entre personas y una rendición a un tercero (el club). Los documentos de componente referencian esta sección y solo agregan lo específico.

### 9.1 Normativa y vigencia (verificada el 2026-09-27)

| Norma | Vigencia | Aplicación |
|---|---|---|
| Ley 19.628, sobre protección de la vida privada | Vigente | Todos los datos personales tratados por el portal. |
| Ley 21.719, que regula la protección y el tratamiento de datos personales y crea la Agencia de Protección de Datos Personales | Entra en vigencia el **2026-12-01**. Existe un proyecto de ley de prórroga a 2027 (Boletín 18.623-07), en primer trámite en el Senado y sin aprobar. | Los datos se conservan después de esa fecha, así que el diseño la cumple desde el inicio. Se reverifica la fecha al documentar cada componente con datos personales. |
| Normativa tributaria (SII) | — | El portal no emite documentos. Si el club debe emitir boletas o facturas por auspicios o ventas, es responsabilidad del club (tarea t-001). |

### 9.2 Datos tratados y finalidad

Finalidad única: administrar y rendir la tesorería del evento. Los datos no se usan para otro fin, no se ceden a terceros y no se publican.

| Titular | Datos | Base de licitud |
|---|---|---|
| Usuario del portal | Correo, nombre e imagen de Google; acciones en auditoría | Consentimiento al solicitar acceso, con aviso de privacidad en la pantalla de solicitud. |
| Jinete (participante) | Nombre, un medio de contacto (teléfono o correo), nombre del caballo, montos y pagos | Ejecución de la relación de inscripción al concurso. |
| Auspiciador / Proveedor | Nombre, contacto, RUT opcional | Ejecución del acuerdo de auspicio o compra. |
| Terceros en comprobantes | Nombre, banco y número de cuenta que aparezcan en un comprobante de transferencia | Necesarios para respaldar el movimiento; acceso restringido. |

### 9.3 Minimización

- De cada contraparte se pide solo nombre y un medio de contacto. El **RUT es opcional** y se usa solo cuando hay un documento tributario de por medio.
- No se piden fecha de nacimiento, domicilio ni datos de salud.
- Si un jinete es **menor de edad**, el contacto registrado es el de su apoderado, y no se registra la edad salvo que una categoría del concurso lo exija (a confirmar en el documento de inscripción).
- Nunca se almacenan datos de tarjetas ni credenciales bancarias.

### 9.4 Medidas de protección

- Acceso solo con Google y membresía activa aprobada por un administrador; aislamiento estricto por organización (sección 7, principio 4).
- El observador no ve archivos de respaldo ni datos de contacto (sección 2.2).
- Archivos de respaldo fuera de cualquier ruta pública, servidos solo tras verificar la membresía.
- HTTPS en todo el tráfico (Railway).
- Auditoría inmutable de accesos, cambios de rol y operaciones sobre datos.

### 9.5 Conservación

- Datos y respaldos se conservan hasta que el club aprueba la rendición (evento `rendido`) **más 1 año**.
- Al vencer ese plazo se eliminan los datos de contacto y RUT de las contrapartes y los archivos de respaldo con datos de terceros; se conserva el libro de movimientos (montos, fechas, categorías y nombres) como historia del club.
- La eliminación se implementa antes de que venza el primer plazo (versión futura, con fecha límite derivada del estado `rendido`).

### 9.6 Derechos de los titulares

- El aviso de privacidad (pantalla de solicitud de acceso y texto breve para el canal de inscripción) indica la finalidad, el plazo de conservación y cómo ejercer los derechos de acceso, rectificación, supresión, oposición y portabilidad: escribiendo al administrador del evento.
- El administrador responde desde el portal: puede ver, corregir o exportar los datos de una contraparte. La supresión antes de plazo se aplica sobre los datos de contacto, conservando el registro del movimiento.

### 9.7 Incidentes

Ante un acceso no autorizado, el administrador revoca las membresías afectadas, revisa la auditoría y, desde la vigencia de la Ley 21.719, evalúa la notificación a la Agencia y a los titulares afectados.

---

## 10. Repositorio documental, carpetas de dominio y estructura de código

- Repositorio: GitHub, `RodDiazT/parronaltesoreria`.
- Raíz documental: `docs/`. Un commit por documento aprobado: `docs(<dominio>): aprueba <componente> v<versión>`.

### 10.1 Carpetas de dominio (documentos y código)

| Dominio | Cubre |
|---|---|
| `acceso/` | Login, solicitudes, membresías, roles y permisos. |
| `organizacion/` | Organización, evento, categorías, contrapartes. |
| `movimientos/` | Movimientos, respaldos, validación, anulación, por cobrar y por pagar, registro sin señal, pendientes. |
| `inscripciones/` | Binomios, inscripciones y pagos. |
| `dashboard/` | Indicadores y KPIs. |
| `rendicion/` | Cierre del evento, informe de rendición y exportaciones. |

La auditoría es transversal y la define este documento (6.8); cada dominio la invoca.

### 10.2 Estructura de código

```
prisma/schema.prisma            modelos del dominio (sección 5)
src/app/                        rutas y pantallas de Next.js
src/dominio/<dominio>/          reglas de negocio, acciones de servidor y consultas por dominio
src/lib/                        auth, acceso a datos con filtro por organización, auditoría, archivos
docs/                           documentación
```

Regla de aislamiento en código: toda consulta a datos de negocio pasa por una única función de contexto que obtiene la membresía activa del usuario y aplica `organizacionId`. Existe una prueba automática que verifica que un usuario de una organización no puede leer ni modificar datos de otra.

Datos iniciales: la organización, el evento y los administradores se crean con un script de carga que recibe los datos como parámetros (nunca escritos en el código). Las categorías iniciales sugeridas son: ingresos — Auspicios, Inscripciones (sistema), Alojamiento, Pensión de caballos, Venta de comida, Otros ingresos; gastos — Pintura, Insumos, Equipamiento de equitación, Premios, Devoluciones (sistema), Otros gastos.

---

## 11. Documentos hijos de primer nivel

| Documento | Ruta | Alcance | Versión | Depende de |
|---|---|---|---|---|
| Acceso y roles | `docs/acceso/acceso-roles.md` | Login con Google, solicitudes, aprobación, roles, matriz de permisos aplicada, aviso de privacidad | v1.0 | Organización y evento |
| Organización y evento | `docs/organizacion/organizacion-evento.md` | Aislamiento, carga inicial, configuración del evento, categorías y contrapartes | v1.0 | — |
| Movimientos | `docs/movimientos/movimientos.md` | Registro de ingresos y gastos, respaldo u observación, validación, anulación, por cobrar y por pagar, reembolsos, especie, duplicados, auditoría | v1.0 | Acceso, Organización |
| Registro sin señal (hijo de Movimientos) | `docs/movimientos/movimientos/registro-sin-senal.md` | Borrador local y cola de envío | v1.1 | Movimientos |
| Inscripción de binomios | `docs/inscripciones/inscripcion-binomios.md` | Binomios, pruebas, tarifas, descuentos, pagos, asignación y devoluciones | v1.0 | Movimientos |
| Dashboard | `docs/dashboard/dashboard.md` | Indicadores de 6.7 en v1.0; KPIs ampliados en v1.1 | v1.0 / v1.1 | Movimientos, Inscripciones |
| Pendientes | `docs/movimientos/pendientes.md` | Vista consolidada de por cobrar y por pagar, y tareas de la comisión | v1.1 | Movimientos |
| Cierre y rendición | `docs/rendicion/exportacion-rendicion.md` | Cierre del evento, informe de rendición y exportación a planilla y PDF | v1.1 | Movimientos, Inscripciones |

Cambios respecto del índice inicial: se agrega "Registro sin señal" (v1.1) y "Exportación para rendición" pasa a llamarse "Cierre y rendición" (misma ruta), porque incluye el cierre del evento. Lo por cobrar y por pagar mínimo queda dentro de Movimientos (v1.0); "Pendientes" conserva la vista consolidada y las tareas (v1.1).

---

## 12. Plan de acción

| # | Paso | Fecha objetivo | Depende de |
|---|---|---|---|
| 1 | Aprobar el marco general | 2026-09-27 | — |
| 2 | Crear credenciales OAuth de Google y el proyecto en Railway (base Postgres + volumen) | 2026-09-28 | 1 |
| 3 | Esqueleto técnico: Next.js, Prisma con el modelo de la sección 5, Auth.js, función de contexto por organización, auditoría, script de carga, despliegue en Railway | 2026-09-29 | 1, 2 |
| 4 | Documentar y aprobar Organización y evento + Acceso y roles | 2026-09-28 | 1 |
| 5 | Documentar y aprobar Movimientos | 2026-09-29 | 4 |
| 6 | Documentar y aprobar Inscripción de binomios (requiere tarifas: tarea t-002) | 2026-09-30 | 5 |
| 7 | Documentar y aprobar Dashboard (v1.0) | 2026-10-01 | 5, 6 |
| 8 | Implementar 4 → 7 a medida que se aprueban | 2026-09-29 → 2026-10-03 | 3 y cada documento |
| 9 | Prueba con los ayudantes en celular, carga inicial real y puesta en uso | 2026-10-04 | 8 |
| 10 | Documentar e implementar Registro sin señal | ≤ 2026-10-25 | 9 |
| 11 | Documentar e implementar Dashboard v1.1, Pendientes y Cierre y rendición | ≤ 2026-11-14 | 9 |
| 12 | Prueba en terreno (señal real en el club) | ≤ 2026-11-14 | 10 |

---

## 13. Riesgos

| Riesgo | Tipo | Mitigación |
|---|---|---|
| No llegar al 2026-10-04 con todo el núcleo | Operativo | Orden de prioridad dentro de v1.0: acceso → movimientos → inscripciones → dashboard. Si falta tiempo, el dashboard puede empezar como una sola pantalla de totales. |
| Señal baja en el club el día del evento | Experiencia | Fotos comprimidas y reintento en v1.0; registro sin señal en v1.1, probado en terreno antes del 14-nov; verificar si habrá wifi (tarea). |
| Pérdida de datos o archivos en Railway | Técnico | Verificar respaldos del plan; copia manual semanal hasta la exportación de v1.1. |
| Fuga de datos entre organizaciones | Normativo | Función única de contexto y prueba automática de aislamiento. |
| Doble conteo de dinero (pago de inscripción registrado también como ingreso suelto) | Operativo | Un pago de inscripción es un movimiento con asignación (6.4); aviso de duplicado (6.9). |
| Saldo del portal no cuadra con banco + efectivo | Operativo | Todo efectivo se registra (con observación si no hay comprobante); en v1.1 saldo por medio de pago para cuadrar por separado. |
| Movimientos quedan sin validar por mucho tiempo | Experiencia | Contador visible de "por validar" para el administrador; dos administradores. |
| Datos de menores de edad | Normativo | Contacto del apoderado y sin edad salvo necesidad (9.3). |
| Uso de la cuenta Railway personal para datos del club | Operativo | Queda como decisión explícita de Rod; si el club asume el proyecto en el futuro, se traspasa el servicio. |
| Obligación tributaria por auspicios no resuelta | Normativo | Tarea t-001; el portal permite registrar el número de documento emitido en la observación. |

---

## 14. Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 0.1 | Primer borrador para revisión | Inicio del proyecto |
