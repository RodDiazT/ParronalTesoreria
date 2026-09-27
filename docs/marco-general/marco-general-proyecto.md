# Marco General — Tesorería Parronal

Estado: Aprobado · Versión 1.6 · Responsable: Rod (Administrador) · Ejecutor: Claude Code

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
| Administrador | Tesorero (presidente de la comisión) y **un administrador de respaldo**. Registra movimientos, inscripciones y pagos igual que un ayudante y, además, configura, aprueba accesos, valida, cierra y rinde. | Control total, trazabilidad de lo que hacen los demás, saber en todo momento cuánto hay y qué falta. |
| Ayudante | Miembro de la comisión que registra ingresos, gastos, inscripciones y pagos. | Registrar un movimiento en menos de un minuto desde el celular, en la cancha. |
| Observador | Socio autorizado, solo lectura. | Ver balance, KPIs y detalle sin poder modificar. |
| Solicitante | Persona que inició sesión con Google sin acceso aprobado. | Saber que su solicitud está pendiente. No ve ningún dato. |
| Jinete / amazona | Persona que monta. No usa el portal en v1.0; en v1.1 puede enviar su inscripción por formulario. | Que su inscripción y pagos queden bien registrados. |
| Apoderado | Adulto responsable vinculado a un jinete, contacto ante emergencias. No usa el portal. | Ser ubicable ante una emergencia. |
| Club o sociedad | Club, sociedad o criadero al que pertenece un jinete o un caballo. No usa el portal. Puede ser quien paga. | Que sus pagos queden bien asignados. |
| Auspiciador / Proveedor | No usan el portal. Contrapartes de ingresos y gastos. | Que sus aportes o cobros queden registrados. |
| Club (directorio) | Destinatario de la rendición final. No usa el portal. | Recibir un informe cuadrado con respaldos y el saldo a traspasar. |

Escala de diseño: **5 usuarios como máximo** por organización. Nada se dimensiona por encima de eso.

### 2.2 Matriz de permisos

| Acción | Administrador | Ayudante | Observador | Solicitante |
|---|---|---|---|---|
| Ver dashboard y listados | Sí | Sí | Sí | No |
| Ver archivos de respaldo | Sí | Sí | **No** (solo ve que existe) | No |
| Ver datos personales (contacto, RUT, fecha de nacimiento, apoderado) | Sí | Sí | **No** | No |
| Registrar movimientos, inscripciones y pagos | Sí (queda validado al registrar) | Sí (queda por validar) | No | No |
| Importar binomios desde Excel | Sí | No | No | No |
| Revisar inscripciones recibidas por formulario (v1.1) | Sí | Sí | No | No |
| Subir cartola y confirmar la conciliación (v1.1) | Sí | No | No | No |
| Editar un movimiento propio **por validar u observado** | Sí | Sí | No | No |
| Editar un movimiento validado | Sí (queda en auditoría) | No | No | No |
| Validar u observar movimientos | Sí | No | No | No |
| Anular movimientos, pagos o inscripciones | Sí | Solo los propios por validar | No | No |
| Marcar un pendiente como pagado o cobrado | Sí | Sí (queda por validar) | No | No |
| Aprobar accesos y asignar roles | Sí | No | No | No |
| Configurar evento y categorías | Sí | No | No | No |
| Registrar y anular traspasos entre medios de pago | Sí | No | No | No |
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
| Rendición al club | Informe de rendición entregado tras el evento | ≤ 30 días después del 2026-11-21 (a más tardar el 2026-12-21) |
| Costo mínimo | Costo incremental de infraestructura | $0 adicional (cuenta Railway existente de Rod, costo hundido); IA (importación y conciliación) < USD 5 en todo el evento |
| Cuadratura | Líneas de la cartola conciliadas o explicadas al cierre (v1.1) | 100 % |

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
- Jinetes, caballos, apoderados, clubes o sociedades, binomios, inscripciones y pagos de inscripción (un pago de inscripción **es** un movimiento de ingreso; ver 6.4).
- Dashboard básico: saldo de caja, ingresos, gastos, por cobrar, por pagar, por validar, por asignar y en especie, con el **saldo por medio de pago** (banco / efectivo) y los **traspasos** entre medios. Detalle en `docs/dashboard/dashboard.md`.
- Aviso de posible duplicado al registrar.
- Historial de auditoría.
- Interfaz liviana para celular: fotos comprimidas antes de subir y reintento si falla la subida.

### v1.1 — antes del 2026-11-21 (objetivo interno: 2026-11-14, para probarlo antes del evento)

- **Registro sin señal:** el movimiento y su foto se guardan en el teléfono y se envían al volver la conexión. Se prioriza porque la señal en el club ya es baja y empeorará con público.
- KPIs ampliados: ingresos y gastos por categoría, % de inscripciones pagadas (por monto y por cantidad), evolución de ingresos y gastos con horizonte configurable y estado de la conciliación. El saldo por medio de pago pasó a v1.0 (Dashboard).
- Pendientes ampliados: vista consolidada de por cobrar y por pagar, y tareas de la comisión.
- Cierre del evento y rendición: el evento pasa a solo lectura y se exporta el informe de rendición (resumen, libro de movimientos, respaldos y saldo a traspasar) en planilla y PDF.
- **Formulario de inscripción:** enlace que el administrador comparte (uno por evento); el jinete, su apoderado u otra persona inscribe **un binomio por envío**: datos del jinete y del caballo, pruebas y, si ya transfirió, el comprobante. Lo enviado queda como **inscripción por revisar**. El formulario no muestra ni confirma registros de jinetes, apoderados, caballos, inscripciones ni pagos: muestra la configuración del evento (nombre, fechas, lugar, logo y nombre del club, pruebas y conceptos con sus tarifas e instrucciones de pago) y sugiere los nombres de los clubes activos al escribir el club, para evitar duplicados. Un ayudante o administrador la acepta (se crea la inscripción y, si trae comprobante, se registra el pago) o la rechaza. Detalle en `docs/inscripciones/inscripcion-binomios/formulario-inscripcion.md`.
- **Importación desde Excel:** plantilla descargable para enviar a otras comisiones o clubes, y carga de esa plantilla o de cualquier planilla, con mapeo de columnas propuesto por IA (o manual) y confirmado por el administrador, vista previa y detección de duplicados. Pasa de v1.0 a v1.1 porque no hay inscritos que cargar antes del 2026-10-04 Detalle en `docs/inscripciones/inscripcion-binomios/importacion-excel.md`.
- **Conciliación con cartola:** el administrador sube la cartola del banco (Excel o CSV), el sistema propone qué movimiento corresponde a cada línea (primero por monto, fecha y nombre; con IA para los casos dudosos) y el administrador confirma cada coincidencia. Nada se concilia sin confirmación humana. Las líneas sin movimiento quedan como alerta para registrarlas.

### Futuro

- Eliminación de datos de contacto al vencer el plazo de conservación (debe estar implementada antes de que venza el primer plazo; ver 9.5).
- Presupuesto versus real.
- Conexión directa con el banco para conciliar sin subir la cartola.
- Notificaciones de pagos pendientes.
- Reutilización para otros eventos del club u otros clubes (el modelo ya lo admite; falta solo la experiencia de crear organizaciones desde la interfaz).

### Fuera de alcance explícito

Contabilidad formal del club; emisión de boletas o facturas; declaraciones ante el SII; **pagos en línea** y cualquier movimiento real de dinero; acceso público a cualquier dato; almacenamiento de datos de tarjetas o credenciales bancarias.

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
| `Contraparte` | Auspiciador, proveedor u otro tercero de un movimiento. | Pertenece a la organización. Datos mínimos (ver 9.3). |
| `Club` | Club, sociedad o criadero externo al que pertenece un jinete o un caballo (en la interfaz: "Club / sociedad"). No confundir con `Organizacion`. | Pertenece a la organización. Tiene jinetes y caballos. Puede ser quien paga inscripciones. |
| `Jinete` | Persona que monta (en la interfaz: "Jinete / amazona"). | Pertenece a la organización (reutilizable entre eventos). Club obligatorio. Fecha de nacimiento opcional y apoderados. Detalle de datos en `docs/inscripciones/participantes.md`. |
| `Apoderado` | Adulto responsable y contacto de emergencia de un jinete. | Vinculado a uno o varios jinetes (un apoderado puede tener varios hijos inscritos). |
| `Caballo` | El caballo. | Pertenece a la organización (reutilizable entre eventos). Nombre y club obligatorio (Participantes). |
| `Binomio` | Par jinete + caballo en un evento. | Une `Jinete` y `Caballo` en un `Evento`. Un caballo puede formar binomio con varios jinetes y un jinete con varios caballos; el par se repite una sola vez por evento. |
| `Prueba` | Prueba del concurso, con tarifa y límites de edad opcionales. | Pertenece a un evento. Detalle en `docs/inscripciones/inscripcion-binomios.md`. |
| `Inscripcion` | Inscripción de un binomio en una `Prueba`, con su monto a pagar. | Pertenece a un binomio y a una prueba. El detalle (tarifas, ajustes, reglas por edad) lo define su documento. |
| `Concepto` | Cobro distinto de las pruebas (cuota por binomio, pensión, alojamiento), con tarifa por unidad. | Pertenece a un evento. Se cobra a binomio (automático) o a jinete o club (manual). |
| `Cargo` | Cobro de un concepto a un binomio, a un jinete o a un club. | Se paga igual que una inscripción, mediante `Pago`. |
| `Importacion` (v1.1) | Planilla subida para cargar binomios: archivo original, mapeo, estado y resumen. | Pertenece a un evento. Crea o vincula participantes, binomios e inscripciones; nunca pagos. Detalle en `docs/inscripciones/inscripcion-binomios/importacion-excel.md`. |
| `SolicitudInscripcion` (v1.1) | Datos enviados por formulario (un binomio), con comprobante opcional, por revisar, aceptados, rechazados o vencidos. | Al aceptarla se crean o se vinculan jinete, apoderado, caballo, club, binomio e inscripciones y, si trae comprobante, el pago. Detalle en `docs/inscripciones/inscripcion-binomios/formulario-inscripcion.md`. |
| `EnlaceFormulario` (v1.1) | Enlace público del formulario de inscripción: token, activo, cierre e instrucciones de pago. | Uno por evento. |
| `Movimiento` | Ingreso o gasto del evento. | Pertenece a un evento; tiene categoría, contraparte opcional, respaldos y pagos de inscripción asociados. |
| `Respaldo` | Archivo (foto o PDF) que respalda un movimiento o su pago. | Pertenece a un movimiento. Un movimiento puede tener varios. |
| `Pago` | Asignación de un movimiento de ingreso a una inscripción o a un cargo. | Une `Movimiento` con `Inscripcion` o `Cargo` y un monto. Un movimiento puede cubrir varios ítems, incluso de distintos jinetes (por ejemplo, un club que paga por todos los suyos). |
| `Devolucion` | Asignación de un movimiento de gasto de devolución a una inscripción o cargo retirado, o al sobrante de un ingreso. | Une `Movimiento` (gasto, "Devoluciones") con `Inscripcion`, `Cargo` o el movimiento de ingreso, y un monto. |
| `Traspaso` | Paso de dinero entre medios de pago de la comisión (del banco al efectivo o al revés). No es ingreso ni gasto. | Pertenece a un evento. Solo mueve el saldo por medio de pago. Detalle en `docs/dashboard/dashboard.md`. |
| `Cartola` y `LineaCartola` (v1.1) | Cartola bancaria subida y cada una de sus líneas. | Cada línea se concilia con cero o un movimiento, previa confirmación del administrador. |
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
| `nombreOrigen` | texto | Solo ingresos: nombre del titular de la transferencia o de quien entregó el efectivo. Sirve para asignar pagos y conciliar. |
| `conciliado` | sí/no + línea de cartola (v1.1) | Solo movimientos con transferencia. |
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
              ├─ Club ─┬─ Jinete ── Apoderado (varios a varios)
              │        └─ Caballo
              └─ Evento ─┬─ Movimiento ─┬─ Respaldo
                         │              ├─ Pago ──────── Inscripcion o Cargo
                         │              ├─ Devolucion ── Inscripcion, Cargo o ingreso
                         │              └─ LineaCartola (v1.1)
                         ├─ Prueba, Concepto
                         ├─ Traspaso
                         ├─ Binomio (Jinete + Caballo) ─┬─ Inscripcion (Prueba)
                         │                              └─ Cargo (cuota)
                         ├─ Cargo (Jinete o Club)
                         ├─ SolicitudInscripcion (v1.1)
                         ├─ Importacion (v1.1) → Binomio, Inscripcion
                         └─ Cartola (v1.1)
RegistroAuditoria → (cualquier entidad), siempre con organizacionId
```

Jinetes, caballos, apoderados y clubes pertenecen a la organización y no al evento, para reutilizarlos en eventos futuros sin volver a cargarlos.

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
- Los **cargos** (cuota por binomio, pensión, alojamiento) se pagan igual que las inscripciones: con `Pago` desde un movimiento de "Inscripciones".
- El estado de pago de la inscripción o cargo (`pendiente`, `parcial`, `pagado`, `anulado`) se calcula a partir de sus pagos; no se escribe a mano. Los pagos de un movimiento por validar u observado ya descuentan el saldo y se marcan "por validar".
- Una devolución a un binomio que se retira es un movimiento de gasto (categoría de sistema "Devoluciones") vinculado a las inscripciones o cargos retirados. Puede ser total, parcial o ninguna; lo no devuelto queda como retenido. Un sobrante por asignar también se puede devolver. Detalle en `docs/inscripciones/inscripcion-binomios.md`.

### 6.5 Por cobrar, por pagar y reembolsos

- Un gasto pagado por un ayudante de su bolsillo se registra como gasto con `pagadoPor` = ese usuario y nace `pendiente`: es una cuenta por pagar a esa persona. Cuando la caja le devuelve el dinero, se marca `pagado` con la fecha, el medio y, si existe, el comprobante del reembolso.
- Un proveedor que cobrará después se registra como gasto `pendiente` (por pagar).
- Un auspicio comprometido pero no recibido se registra como ingreso `pendiente` (por cobrar).
- Lo por cobrar de inscripciones se calcula como el monto de cada inscripción o cargo no anulado menos sus pagos vigentes.

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
| Por cobrar | Ingresos `pendiente` validados + saldo de inscripciones y cargos no anulados |
| Por pagar | Gastos `pendiente` validados (incluye reembolsos) |
| Resultado proyectado | Saldo de caja + por cobrar − por pagar |
| Por validar | Monto y cantidad de movimientos `por_validar` u `observado`, mostrados **aparte** |
| Por asignar | Monto de los ingresos de "Inscripciones" no asignado a inscripciones o cargos ni devuelto como sobrante |
| En especie | Suma de valores estimados, mostrada aparte |
| Saldo por medio de pago | Para cada medio (`transferencia` = banco, `efectivo`, `otro`): ingresos percibidos − gastos pagados con ese medio + traspasos no anulados hacia ese medio − traspasos desde ese medio. La suma de los medios es igual al saldo de caja |
| % de inscripciones pagadas (v1.1) | Por monto: pagado / monto de inscripciones y cargos no anulados ni retirados. Por cantidad: inscripciones pagadas o becadas / inscripciones no anuladas ni retiradas |
| Por categoría (v1.1) | Percibido o pagado, y pendiente validado, por categoría; la categoría "Inscripciones" suma el por cobrar de inscripciones y cargos. Los totales coinciden con los indicadores de esta tabla |
| Evolución (v1.1) | Ingresos percibidos y gastos pagados según su fecha de pago, agrupados por día o por semana |

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

### 6.11 Jinetes, caballos y edad

- Del jinete se registra la **fecha de nacimiento** si se conoce, porque puede haber pruebas o categorías por edad. Es opcional para no bloquear el registro; si falta, el jinete queda con una alerta. La edad se calcula a la fecha que defina el reglamento del concurso (por defecto, la fecha del evento); no se guarda como número.
- Todo jinete menor de 18 años a la fecha del evento debe tener al menos un apoderado, y el menor de 14, la autorización del apoderado (9.3). El portal lo exige mediante **alertas visibles que no bloquean** el registro ni la inscripción. Para los adultos, el apoderado (contacto de emergencia) es opcional.
- Un mismo jinete, caballo, club o apoderado se registra una sola vez por organización. Al crear uno nuevo, el sistema avisa si existe otro con nombre parecido (y bloquea si el RUT se repite). Detalle en `docs/inscripciones/participantes.md` §3.5.

### 6.12 Importación desde Excel (v1.1)

- El portal entrega una plantilla descargable, sin datos personales, para enviarla a otras comisiones o clubes. El administrador sube esa plantilla o **cualquier otra planilla**: la plantilla se reconoce sola; para otros formatos, la IA propone qué columna es cada dato y el administrador lo confirma, o lo elige a mano. La IA nunca escribe datos de las filas (principio 9).
- Antes de guardar se muestra una **vista previa**: filas nuevas, filas que coinciden con registros existentes (las exactas se vinculan solas y las parecidas las decide el administrador), inscripciones ya existentes (se omiten), filas con errores (falta jinete, caballo, club o prueba), que no se importan, y filas con advertencias (menor sin apoderado, sin fecha de nacimiento, fecha o RUT no reconocidos, que se importan sin ese dato), que se importan. Nada se guarda sin confirmación.
- Las inscripciones se crean con la tarifa vigente; los montos y pagos que traiga la planilla quedan como listas para ajustar o registrar después.
- La importación crea o vincula jinetes, apoderados, caballos, clubes, binomios e inscripciones. No crea pagos: los pagos se registran como movimientos con respaldo.
- Cada importación queda en auditoría como una sola acción, con el archivo original guardado como respaldo.

### 6.13 Conciliación con cartola (v1.1)

- La conciliación solo **propone**; el administrador confirma cada coincidencia. Un movimiento conciliado queda marcado y enlazado a su línea de cartola.
- Orden de búsqueda: primero coincidencias exactas (monto y fecha ±2 días), luego por nombre del titular (`nombreOrigen`) y, solo para lo que siga sin resolver, sugerencias con IA.
- A la IA se le envía lo mínimo: monto, fecha, glosa y nombre de cada línea, y los movimientos candidatos. Nunca números de cuenta ni RUT.
- Las líneas de cartola sin movimiento quedan como alerta ("ingreso no registrado" o "cargo no registrado"). Los movimientos por transferencia sin línea de cartola al cierre también se destacan.

---

## 7. Principios rectores

1. **El núcleo primero.** Nada entra en v1.0 si pone en riesgo tenerlo en uso el 2026-10-04. Se recorta antes de atrasar.
2. **Un registro, una verdad.** Cada peso se registra una vez; las vistas (dashboard, por cobrar, rendición) se calculan, no se duplican.
3. **Nada se borra.** Se anula con motivo y queda en auditoría.
4. **Aislamiento por defecto.** Toda consulta exige una organización y una membresía activa; no existe consulta "sin organización".
5. **El club es un dato.** Nombres, fechas y montos del club o del concurso nunca van en el código.
6. **Celular primero.** Cada pantalla de registro se diseña para una mano, en exterior y con mala señal.
7. **Dimensionado para 5 usuarios.** Sin colas, caches, microservicios ni servicios pagados adicionales.
8. **Costo incremental cero.** Todo corre en la cuenta Railway existente. La única excepción es la IA (API de Gemini de pago) para la importación y la conciliación (v1.1), de uso puntual y opcional.
9. **La IA propone, una persona decide.** Ninguna sugerencia automática modifica dinero, pagos ni estados sin confirmación de un administrador.

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
| Lectura de Excel (importación y cartola, v1.1) | Librería de lectura de XLSX/CSV en el servidor | Sin servicios externos. |
| IA para importación y conciliación (v1.1) | API de Gemini (Google) **en el nivel de pago**, detrás de una capa propia que no depende del proveedor (`src/lib/ia/`, Importación desde Excel §5.5). Variables `GEMINI_API_KEY`, `GEMINI_NIVEL_PAGO` (`confirmado` solo con la facturación activa) y `GEMINI_MODELO` | Decisión de Rod: un solo proveedor de IA. El nivel gratuito no se usa porque sus términos prohíben enviar datos personales y permiten usar el contenido para mejorar productos. Es el único costo variable del proyecto: fracciones de centavo de dólar por planilla o cartola a esta escala. El portal funciona igual sin IA configurada. |
| Pruebas | Vitest para reglas de negocio, permisos y aislamiento | Las reglas de dinero y de acceso se prueban antes de desplegar. |
| Despliegue | Cuenta Railway existente de Rod, URL entregada por la plataforma, sin dominio propio | Costo hundido; HTTPS incluido. |
| Idioma del código | Dominio en español sin tildes (modelos `Movimiento`, `Inscripcion`; campos `montoClp`, `estadoValidacion`); términos técnicos del framework en inglés | Los nombres coinciden con los documentos; no hace falta tabla de equivalencias. Columnas en la base en `snake_case`. |

Variables de entorno mínimas: `DATABASE_URL`, `AUTH_SECRET`, `AUTH_GOOGLE_ID`, `AUTH_GOOGLE_SECRET`, `RUTA_RESPALDOS`. En v1.1, opcionales: `GEMINI_API_KEY`, `GEMINI_NIVEL_PAGO` y `GEMINI_MODELO`.

Copias de seguridad: se verifica si el plan de Railway incluye respaldo de la base y del volumen. Si no, en v1.0 se hace una copia manual semanal (volcado de la base + descarga de respaldos) y la exportación de v1.1 sirve como copia fuera de Railway.

---

## 9. Cumplimiento normativo transversal

Aplica: el proyecto trata datos personales (usuarios, jinetes, incluidos **menores de edad**, apoderados, clubes, auspiciadores y proveedores), datos financieros de terceros contenidos en comprobantes de transferencia, pagos entre personas y una rendición a un tercero (el club). Los documentos de componente referencian esta sección y solo agregan lo específico.

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
| Jinete / amazona | Nombre, club, inscripciones y pagos; fecha de nacimiento, un medio de contacto y RUT, opcionales | Ejecución de la relación de inscripción al concurso. En menores de edad, con autorización del apoderado (ver 9.3). |
| Apoderado | Nombre, teléfono, relación con el jinete | Contacto de emergencia y responsable del menor inscrito. |
| Club / sociedad | Nombre, contacto, RUT opcional | Ejecución de la relación de inscripción o pago. |
| Caballo | Nombre y club | No es dato personal (no se registra propietario). |
| Auspiciador / Proveedor | Nombre, contacto, RUT opcional | Ejecución del acuerdo de auspicio o compra. |
| Terceros en comprobantes | Nombre, banco y número de cuenta que aparezcan en un comprobante de transferencia | Necesarios para respaldar el movimiento; acceso restringido. |
| Remitente del formulario (v1.1) | Nombre, teléfono o correo y relación con el jinete | Iniciativa del propio remitente para inscribir; solo para contactarlo por su solicitud. |

### 9.3 Minimización

- De cada contraparte, club, jinete y apoderado se pide solo nombre y un medio de contacto. El **RUT es opcional**.
- La fecha de nacimiento del jinete se pide porque hay pruebas por edad (6.11). No se piden domicilio ni datos de salud (tampoco alergias o seguros: el apoderado es el contacto para eso).
- **Menores de edad:** tienen al menos un apoderado vinculado. Sus datos se tratan atendiendo a su interés superior; en los menores de 14 años, la autorización para tratar sus datos la da el apoderado (en el formulario de v1.1, con una casilla explícita; en la carga manual o por Excel, la comisión la obtiene al recibir la inscripción y registra en el portal la fecha en que la recibió, según Participantes §3.4). Los datos de menores nunca aparecen en exportaciones a terceros distintos del club.
- Nunca se almacenan datos de tarjetas ni credenciales bancarias.

### 9.4 Medidas de protección

- Acceso solo con Google y membresía activa aprobada por un administrador; aislamiento estricto por organización (sección 7, principio 4).
- El observador no ve archivos de respaldo ni datos personales (sección 2.2).
- Archivos de respaldo fuera de cualquier ruta pública, servidos solo tras verificar la membresía.
- HTTPS en todo el tráfico (Railway).
- Auditoría inmutable de accesos, cambios de rol y operaciones sobre datos.
- El formulario de inscripción (v1.1) solo recibe datos: no muestra ni confirma la existencia de jinetes, apoderados, caballos, inscripciones ni pagos, y tiene límite de envíos para evitar abuso. Única excepción (decisión de Rod): sugiere los nombres de los clubes activos al escribir el club, sin datos de contacto ni conteos.
- IA (v1.1): Google (API de Gemini, nivel de pago) actúa como encargado de tratamiento, con transferencia fuera de Chile declarada en el aviso de privacidad. En la conciliación se le envían solo los campos de 6.13. En la importación, los encabezados y hasta 20 filas completas de la planilla, incluidos datos de menores (decisión de Rod), sin el archivo ni datos del portal (Importación desde Excel §3.4 y §4). El contenido enviado no se guarda.

### 9.5 Conservación

- Datos y respaldos se conservan hasta que el club aprueba la rendición (evento `rendido`) **más 1 año**.
- Las solicitudes del formulario de inscripción rechazadas o vencidas pierden sus datos personales y su comprobante a los 30 días (Formulario de inscripción §4).
- Al vencer ese plazo se eliminan los datos de contacto, RUT y fechas de nacimiento, los apoderados, los archivos de respaldo con datos de terceros y las cartolas; se conserva el libro de movimientos (montos, fechas, categorías y nombres) como historia del club.
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
| `movimientos/` | Movimientos, respaldos, validación, anulación, por cobrar y por pagar, registro sin señal, pendientes, conciliación con cartola. |
| `inscripciones/` | Jinetes, apoderados, caballos, clubes, binomios, inscripciones, pagos, importación desde Excel y formulario de inscripción. |
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

Datos iniciales: la organización, el evento y los administradores se crean con un script de carga que recibe los datos como parámetros (nunca escritos en el código). La lista de categorías iniciales y sus categorías de sistema (Inscripciones, Devoluciones y Aporte inicial) la define `docs/organizacion/organizacion-evento.md` §3.4.

---

## 11. Documentos hijos de primer nivel

| Documento | Ruta | Alcance | Versión | Depende de |
|---|---|---|---|---|
| Acceso y roles | `docs/acceso/acceso-roles.md` | Login con Google, solicitudes, aprobación, roles, matriz de permisos aplicada, aviso de privacidad | v1.0 | Organización y evento |
| Organización y evento | `docs/organizacion/organizacion-evento.md` | Aislamiento, carga inicial, configuración del evento, categorías y contrapartes | v1.0 | — |
| Movimientos | `docs/movimientos/movimientos.md` | Registro de ingresos y gastos, respaldo u observación, validación, anulación, por cobrar y por pagar, reembolsos, especie, duplicados, auditoría | v1.0 | Acceso, Organización |
| Registro sin señal (hijo de Movimientos) | `docs/movimientos/movimientos/registro-sin-senal.md` | Borrador local y cola de envío | v1.1 | Movimientos |
| Participantes | `docs/inscripciones/participantes.md` | Jinetes, apoderados, caballos y clubes: datos, reglas de edad y apoderado, duplicados | v1.0 | Organización |
| Inscripción de binomios | `docs/inscripciones/inscripcion-binomios.md` | Binomios, pruebas, tarifas, descuentos, pagos, asignación y devoluciones | v1.0 | Participantes, Movimientos |
| Importación desde Excel (hijo de Inscripción) | `docs/inscripciones/inscripcion-binomios/importacion-excel.md` | Plantilla, cualquier formato con mapeo asistido por IA, vista previa, duplicados y carga | v1.1 | Inscripción de binomios |
| Formulario de inscripción (hijo de Inscripción) | `docs/inscripciones/inscripcion-binomios/formulario-inscripcion.md` | Enlace público de solo envío, solicitudes por revisar, autorización del apoderado | v1.1 | Inscripción de binomios |
| Conciliación con cartola | `docs/movimientos/conciliacion-cartola.md` | Carga de cartola, cruce, sugerencias con IA y confirmación | v1.1 | Movimientos |
| Dashboard | `docs/dashboard/dashboard.md` | Inicio por rol, indicadores de 6.7, saldo por medio de pago y traspasos en v1.0; KPIs ampliados en v1.1 | v1.0 / v1.1 | Movimientos, Inscripciones |
| Pendientes | `docs/movimientos/pendientes.md` | Vista consolidada de por cobrar y por pagar, y tareas de la comisión | v1.1 | Movimientos |
| Cierre y rendición | `docs/rendicion/exportacion-rendicion.md` | Cierre del evento, informe de rendición y exportación a planilla y PDF | v1.1 | Movimientos, Inscripciones |

Cambios respecto del índice inicial: se agregan "Participantes" (v1.0), "Importación desde Excel" (v1.0), "Formulario de inscripción" (v1.1), "Conciliación con cartola" (v1.1) y "Registro sin señal" (v1.1) y "Exportación para rendición" pasa a llamarse "Cierre y rendición" (misma ruta), porque incluye el cierre del evento. Lo por cobrar y por pagar mínimo queda dentro de Movimientos (v1.0); "Pendientes" conserva la vista consolidada y las tareas (v1.1).

---

## 12. Plan de acción

| # | Paso | Fecha objetivo | Depende de |
|---|---|---|---|
| 1 | Aprobar el marco general | 2026-09-27 | — |
| 2 | Crear credenciales OAuth de Google y el proyecto en Railway (base Postgres + volumen) | 2026-09-28 | 1 |
| 3 | Esqueleto técnico: Next.js, Prisma con el modelo de la sección 5, Auth.js, función de contexto por organización, auditoría, script de carga, despliegue en Railway | 2026-09-29 | 1, 2 |
| 4 | Documentar y aprobar Organización y evento + Acceso y roles | 2026-09-28 | 1 |
| 5 | Documentar y aprobar Movimientos | 2026-09-29 | 4 |
| 6 | Documentar y aprobar Participantes | 2026-09-30 | 4 |
| 7 | Documentar y aprobar Inscripción de binomios (requiere pruebas y tarifas: tarea t-002) | 2026-09-30 | 5, 6 |
| 8 | Documentar y aprobar Importación desde Excel (pasa a v1.1; se implementa en el paso 12) | 2026-09-27 | 7 |
| 9 | Documentar y aprobar Dashboard (v1.0) | 2026-10-01 | 5, 7 |
| 10 | Implementar 4 → 9 a medida que se aprueban | 2026-09-29 → 2026-10-03 | 3 y cada documento |
| 11 | Prueba con los ayudantes en celular y puesta en uso | 2026-10-04 | 10 |
| 12 | Documentar e implementar Formulario de inscripción; implementar Importación desde Excel | ≤ 2026-10-18 (importación ≤ 2026-10-25) | 11 |
| 13 | Documentar e implementar Registro sin señal | ≤ 2026-10-25 | 11 |
| 14 | Documentar e implementar Conciliación con cartola | ≤ 2026-11-07 | 11 |
| 15 | Documentar e implementar Dashboard v1.1, Pendientes y Cierre y rendición | ≤ 2026-11-14 | 11 |
| 16 | Prueba en terreno (señal real en el club) | ≤ 2026-11-14 | 13 |

---

## 13. Riesgos

| Riesgo | Tipo | Mitigación |
|---|---|---|
| No llegar al 2026-10-04 con todo el núcleo | Operativo | Orden de prioridad dentro de v1.0: acceso → movimientos → participantes e inscripciones → dashboard. La importación pasó a v1.1. Si falta tiempo, el dashboard empieza como una sola pantalla de totales. |
| Señal baja en el club el día del evento | Experiencia | Fotos comprimidas y reintento en v1.0; registro sin señal en v1.1, probado en terreno antes del 14-nov; verificar si habrá wifi (tarea). |
| Pérdida de datos o archivos en Railway | Técnico | Verificar respaldos del plan; copia manual semanal hasta la exportación de v1.1. |
| Fuga de datos entre organizaciones | Normativo | Función única de contexto y prueba automática de aislamiento. |
| Doble conteo de dinero (pago de inscripción registrado también como ingreso suelto) | Operativo | Un pago de inscripción es un movimiento con asignación (6.4); aviso de duplicado (6.9). |
| Saldo del portal no cuadra con banco + efectivo | Operativo | Todo efectivo se registra (con observación si no hay comprobante); saldo por medio de pago y traspasos entre banco y efectivo desde v1.0 para cuadrar por separado. |
| Movimientos quedan sin validar por mucho tiempo | Experiencia | Contador visible de "por validar" para el administrador; dos administradores. |
| Datos de menores de edad | Normativo | Apoderado obligatorio, autorización del apoderado para menores de 14, sin datos de salud y acceso restringido (9.3, 9.4). |
| Formulario de inscripción usado para spam o para averiguar datos | Técnico | Solo envío, sin respuestas que revelen datos, límite de envíos y revisión humana antes de crear nada (9.4). |
| Sugerencias de IA erróneas en la conciliación o en el mapeo de una planilla | Operativo | La IA solo propone; cada coincidencia o columna la confirma un administrador (principio 9). |
| Datos personales (incluidos de menores) enviados a la IA | Normativo | Solo nivel de pago, activado con `GEMINI_NIVEL_PAGO=confirmado`; envío mínimo; encargado declarado en el aviso (9.4; Importación desde Excel §4). |
| Duplicados de jinetes o caballos al importar o por formulario | Operativo | Vista previa con coincidencias y aviso de nombres parecidos (6.11, 6.12). |
| Uso de la cuenta Railway personal para datos del club | Operativo | Queda como decisión explícita de Rod; si el club asume el proyecto en el futuro, se traspasa el servicio. |
| Obligación tributaria por auspicios no resuelta | Normativo | Tarea t-001; el portal permite registrar el número de documento emitido en la observación. |

---

## 14. Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 0.1 | Primer borrador para revisión | Inicio del proyecto |
| 2026-09-27 | 0.2 | Jinete, caballo, apoderado y club como entidades separadas; binomio como par jinete + caballo; fecha de nacimiento y apoderado obligatorio para menores; importación desde Excel (v1.0); formulario de inscripción y conciliación con cartola asistida por IA (v1.1); pagos en línea fuera de alcance; se explicita que el administrador también registra | Revisión de Rod |
| 2026-09-27 | 0.3 | Plazo de rendición al club: 30 días después del evento | Decisión de Rod |
| 2026-09-27 | 1.0 | Aprobado por Rod; se confirma que el observador no ve respaldos ni datos personales | Aprobación |
| 2026-09-27 | 1.1 | §10.2: la lista de categorías iniciales pasa a Organización y evento §3.4, que agrega la categoría de sistema "Aporte inicial" | Aprobación de Organización y evento v1.0 (dueño único de la lista) |
| 2026-09-27 | 1.2 | §5, §6.11, §6.12, §9.2 y §9.3: club obligatorio para jinete y caballo; caballo sin número de registro ni propietario; fecha de nacimiento y contacto del jinete opcionales; menor sin apoderado y menor de 14 sin autorización como alertas que no bloquean; autorización con fecha registrada | Aprobación de Participantes v1.0 (decisiones de Rod) |
| 2026-09-27 | 1.3 | §5 y §5.2: entidades `Prueba`, `Concepto`, `Cargo` y `Devolucion`; `Inscripcion` en una prueba; `Pago` a inscripción o cargo. §6.4, §6.5 y §6.7: cargos, pagos por validar descuentan saldo, retiro con retenido, devolución de sobrante, por cobrar con cargos y por asignar precisado | Aprobación de Inscripción de binomios v1.0 (decisiones de Rod) |
| 2026-09-27 | 1.4 | §4, §11, §12 y §13: la importación desde Excel pasa a v1.1. §5: entidad `Importacion`. §6.12: plantilla para terceros, cualquier formato con mapeo propuesto por IA, fechas y RUT no reconocidos como advertencia, lo ya inscrito se omite, montos y pagos de la planilla como listas. §3, §7 (principio 8), §8 y §9.4: la IA del proyecto pasa de la API de Claude a la API de Gemini de pago, para importación y conciliación, con Google como encargado | Aprobación de Importación desde Excel v1.0 (decisiones de Rod) |
| 2026-09-27 | 1.5 | §2.2: fila de traspasos entre medios de pago (solo administrador). §4: el saldo por medio de pago pasa a v1.0 y los KPIs de v1.1 se precisan. §5 y §5.2: entidad `Traspaso`. §6.7: saldo por medio de pago y definiciones de los KPIs de v1.1. §11 y §13: se ajustan | Aprobación de Dashboard v1.0 (decisiones de Rod) |
| 2026-09-27 | 1.6 | §4 y §9.4: el formulario de inscripción recibe un binomio por envío con comprobante opcional, muestra la configuración del evento y sugiere los clubes activos, sin mostrar otros registros. §5: entidad `EnlaceFormulario` y detalle de `SolicitudInscripcion`. §9.2: remitente del formulario. §9.5: solicitudes rechazadas o vencidas a los 30 días | Aprobación de Formulario de inscripción v1.0 |
