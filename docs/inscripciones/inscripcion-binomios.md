# Inscripción de binomios

Estado: Aprobado · Versión 1.4 · Responsable: Rod (Administrador) · Ejecutor: Claude Code

## 1. Índice

- **Padre:** `docs/marco-general/marco-general-proyecto.md`. Alcance dentro del padre: entidades `Binomio`, `Inscripcion` y `Pago` (§5), pagos de inscripción (§6.4), por cobrar de inscripciones (§6.5), indicadores "por cobrar" y "por asignar" (§6.7) y anulación (§6.8).
- **Hijos:**
  - `docs/inscripciones/inscripcion-binomios/importacion-excel.md` (v1.1): plantilla, cualquier planilla con mapeo asistido por IA, vista previa y carga de binomios e inscripciones.
  - `docs/inscripciones/inscripcion-binomios/formulario-inscripcion.md` (v1.1): enlace de solo envío y solicitudes por revisar.
- **Depende de:** `docs/inscripciones/participantes.md` (jinetes, caballos, clubes, selectores, `edadEnEvento`, alertas) y `docs/movimientos/movimientos.md` (registro de ingresos y gastos, respaldos, validación, anulación en cascada, sin identificar). Además usa `docs/organizacion/organizacion-evento.md` (contexto, evento vigente, `db(ctx)`, categorías de sistema) y `docs/acceso/acceso-roles.md` (`puede`, `exigir`, `esPropio`).
- **Secciones:**
  1. Índice
  2. Contexto y alcance
  3. Flujo operativo y experiencia
  4. Cumplimiento normativo
  5. Especificación de ejecución
  6. Elementos que quedan obsoletos
  7. Plan de acción
  8. Riesgos
  9. Control de cambios

---

## 2. Contexto y alcance

**Qué es.** El registro de quién compite y cuánto debe pagar. Un binomio (jinete + caballo) se inscribe en una o más pruebas, cada una con su tarifa. Además se cargan los cobros que no son pruebas: una cuota fija por binomio y los servicios que se cobran aparte a un jinete o a un club (pensión de caballos, alojamiento). Cada pago que entra se registra una sola vez como movimiento de ingreso y se reparte entre lo que cubre. El portal calcula en todo momento qué está pagado, qué falta y qué dinero llegó sin asignar. También resuelve retiros y devoluciones. No mueve dinero, no emite boletas y no organiza la competencia deportiva.

**Versión:** v1.0 (en uso al 2026-10-04).

**Pendiente del club:** las pruebas, las tarifas, la cuota por binomio, los descuentos y la pensión y el alojamiento aún no están definidos (tarea t-002). Por eso todo es configurable por el administrador y nada de eso va en el código (marco §7, principio 5).

**Conexión con el proyecto.**

| Documento | Relación |
|---|---|
| Marco general | Dueño de las reglas §6.4, §6.5 y §6.7. Este documento las aplica y agrega los cargos, la cuota por binomio y el detalle de devoluciones. Declara desviaciones en la sección 6: el marco sube a v1.3. |
| Participantes | Usa `<SelectorJinete>`, `<SelectorCaballo>`, `<SelectorClub>`, `<AlertasJinete>` y `edadEnEvento`. Resuelve lo que Participantes le dejó: el `clubId` propio del binomio (3.10) y la reasignación de binomios al fusionar, con rechazo si quedan dos iguales (3.13). |
| Movimientos | Usa el registro de ingresos y gastos con respaldo, `claveCliente`, validación, aviso de duplicado, anulación y la clasificación de ingresos sin identificar. Es dueño del `Pago`, de los flujos con las categorías de sistema "Inscripciones" y "Devoluciones" y de lo por asignar (Movimientos §2). Al aprobarse este documento, Movimientos pasa a v1.1 con los detalles de la sección 6. |
| Organización y evento | Usa el evento vigente y las categorías de sistema `inscripciones` y `devoluciones`. Llena el espacio que dejó reservado en la vista previa del cambio de fechas (3.13). Responde su pendiente sobre alojamiento y pensión por noches: la cantidad se ingresa a mano, así que un cambio de fechas no la modifica (3.4). |
| Acceso y roles | Aplica la matriz con `exigir(ctx, accion)` y agrega acciones a la tabla única (5.4). |
| Importación desde Excel (hijo, v1.1) | Crea binomios e inscripciones con `inscribir` (5.3) dentro de su propia transacción, sin pagos (marco §6.12). La cuota automática se carga igual que al inscribir a mano. Marca lo creado con `importacionId` (5.1). |
| Formulario de inscripción (hijo, v1.1) | Al aceptar una solicitud llama, en una sola transacción, a `inscribir` (5.3) y, si trae comprobante, a `registrarPagoInscripciones` con `tx` y el comprobante como respaldo existente. Agrega la pestaña **Por revisar** en `/inscripciones` (3.12). |
| Dashboard | Toma "por cobrar" y "por asignar" de las funciones de 5.2 y no los recalcula. |
| Cierre y rendición (v1.1) | Usa el estado de cuenta, los retiros (retenido y devuelto) y el desglose por prueba y concepto. |
| Conciliación con cartola (v1.1) | Concilia los movimientos de pago y de devolución como cualquier otro. |

**Fuera de alcance.**

- Orden de salida, dorsales, resultados, cupos por prueba y listas del jurado: esto es tesorería, no gestión deportiva.
- Plantilla y carga masiva (Importación desde Excel) y formulario público (Formulario de inscripción, v1.1).
- Pagos en línea, links de pago y cobro automático (marco §4).
- Cálculo automático de noches según las fechas del evento: la cantidad se ingresa a mano (3.4).
- Descuentos automáticos por reglas (por ejemplo, "segunda prueba a mitad de precio"): cada descuento es un ajuste manual con motivo (3.3).
- Propietario del caballo (Participantes: solo nombre y club).

### Justificación de valor

a. **Problema que reduce o carga que elimina.** Al **administrador** le elimina cruzar a mano la planilla de inscritos con las transferencias: ve por binomio, por jinete y por club qué está pagado, qué falta y qué llegó sin asignar, y resuelve retiros y devoluciones dejando constancia. Al **ayudante** le permite inscribir y registrar el pago en la cancha en dos pasos. También puede copiar el estado de cuenta de una familia o club para cobrar por WhatsApp sin preguntarle al tesorero.

b. **Métricas del marco (§3) que mueve.** Control de cobranza (100 % de inscripciones con estado de pago conocido el día del evento); cuadratura (cada peso de inscripción se cuenta una vez y lo por asignar queda a la vista); trazabilidad (retiros, ajustes y devoluciones con motivo y auditoría); operativo a tiempo (núcleo v1.0).

c. **Datos o recursos nuevos.** Entidades `Prueba`, `Concepto`, `Cargo` y `Devolucion` (desviación declarada frente al marco §5, sección 6). No se agregan datos personales: se usan los de Participantes. Se agregan textos libres (motivos y descripción del cargo), que pueden mencionar personas y por eso se ocultan al observador (3.12).

d. **Costo de mantención.** Cero. Misma app, base y volumen (marco §8). Los respaldos de pagos y devoluciones usan el almacenamiento de Movimientos.

e. **¿Se resuelve con algo existente?** En parte. El dinero es un `Movimiento` (marco §6.4) y se reutiliza completo. Pero Movimientos no sabe qué debe cada binomio, jinete o club ni cómo se reparte una transferencia, y un ingreso pendiente con `Contraparte` no sirve para jinetes y clubes: obligaría a duplicar sus datos como contraparte y no aparecería en su estado de cuenta.

---

## 3. Flujo operativo y experiencia

Escala esperada: **50 binomios o menos** (Participantes §3), unas pocas pruebas y conceptos, y del orden de un centenar de pagos. Las listas caben en una pantalla con búsqueda.

**Vocabulario.** En este documento, **ítem** es cualquier cosa que se cobra: una inscripción (binomio en una prueba) o un cargo (cuota por binomio o servicio a un jinete o club). Los ítems se pagan, se ajustan, se anulan y se retiran con las mismas reglas.

### 3.1 Configuración del evento: pruebas y conceptos (administrador)

Pantalla **Configuración → Pruebas y cobros**, con dos listas. Pertenecen al evento vigente y solo se editan con el evento `abierto` (Organización y evento §3.2).

**Pruebas** (`Prueba`)

| Campo | Regla |
|---|---|
| Nombre | Obligatorio, 2 a 80 caracteres, sin repetirse en el evento (comparación con `normalizarNombre`). |
| Tarifa | Entero en CLP, de 0 a 999.999.999. Una prueba sin costo tiene tarifa $0. |
| Edad mínima y máxima | Opcionales, en años cumplidos a la fecha de referencia del evento (`edadEnEvento`). Por ejemplo, "Infantil": máxima 13. |
| Orden | Para que las más usadas queden arriba en el celular. |
| Activa | Una prueba inactiva no se ofrece al inscribir; sus inscripciones se conservan. |

**Conceptos** (`Concepto`): lo que se cobra aparte de las pruebas.

| Campo | Regla |
|---|---|
| Nombre | Obligatorio, 2 a 80 caracteres, sin repetirse en el evento. Por ejemplo: "Cuota de participación", "Pensión de caballos", "Alojamiento". |
| Se cobra a | **Binomio** (automático: se carga una vez a cada binomio que se inscribe) o **Jinete o club** (se agrega a mano). No cambia después de tener cargos. |
| Tarifa | Entero en CLP, de 0 a 999.999.999, por unidad. |
| Unidad | Opcional, hasta 20 caracteres: "noche", "pesebrera por día", "persona". Se muestra junto a la cantidad. |
| Categoría de referencia | Opcional: una categoría de ingreso del formulario libre (por ejemplo, "Pensión de caballos"). Sirve para el aviso de 3.4. |
| Orden y activo | Igual que en pruebas. |

**Reglas comunes:**

- **Cambiar una tarifa no cambia lo ya inscrito o cargado** (decisión de Rod). Cada ítem guarda su monto al crearse. Si hace falta, se ajusta cada ítem a mano (3.3).
- No se eliminan: se desactivan (marco §7, principio 3). Tampoco se cambia el nombre de una prueba con inscripciones sin que quede en auditoría (el nombre nuevo se ve en todas).
- Todo cambio queda en auditoría con antes y después, con control por `version`.
- El ayudante y el observador ven pruebas y conceptos solo como opciones y en los listados.

### 3.2 Inscribir (administrador y ayudante)

Botón **Inscribir** en `/inscripciones`, en la ficha del jinete y en la del caballo. Formulario de una columna:

1. **Jinete** con `<SelectorJinete>` y **caballo** con `<SelectorCaballo>`, con creación en línea (Participantes §3.2). Debajo del jinete, sus alertas (`<AlertasJinete>`).
2. **Club del binomio**: se prellena con el club del jinete y se puede cambiar solo para este evento (3.10).
3. Si ese binomio ya existe en el evento, se reutiliza y se muestran sus pruebas actuales, marcadas y deshabilitadas: "Ya inscrito".
4. **Pruebas**: casillas con nombre y tarifa. Si el jinete no cumple la edad de una prueba o no tiene fecha de nacimiento, la casilla muestra el aviso "No cumple la edad (15 años; máx. 13)" o "Edad sin dato". **No bloquea** (decisión de Rod): se puede marcar igual.
5. **Ajuste** opcional por prueba (plegado): monto distinto y motivo (3.3).
6. **Resumen**: pruebas marcadas + cuota por binomio, si corresponde (3.4), y el total.
7. **Guardar**: un solo envío. Crea en una transacción el binomio (si no existía), las inscripciones y la cuota automática. Con la misma `claveCliente` de Movimientos (5.2), un reintento no duplica.
8. Resultado: "Inscrito. Total $X" con el botón **Registrar pago ahora**, que abre el formulario de pago (3.6) prellenado con esos ítems. Son dos envíos separados (decisión de Rod), cada uno con su reintento.

**Reglas:**

- **La inscripción no se valida** (decisión de Rod): la del ayudante vale al guardarla. Lo que se valida es el dinero (el movimiento del pago, Movimientos §3.4).
- Un binomio no se inscribe dos veces en la misma prueba (índice único, 5.1). Un jinete sí puede correr la misma prueba con dos caballos, porque son binomios distintos. Tampoco se impide que un caballo corra la misma prueba con dos jinetes: es una regla deportiva, no de tesorería.
- Un binomio es único por jinete, caballo y evento (marco §5).
- Solo en el evento vigente y `abierto`. Toda referencia se valida con `exigirDeLaOrganizacion`.
- No se puede inscribir un jinete o un caballo desactivado (no aparecen en los selectores).

### 3.3 Monto, ajustes, descuentos y becas

- **Monto fijo:** el monto se fija al crear el ítem con la tarifa vigente (3.1).
- **Ajuste:** monto nuevo (de 0 a 999.999.999) y **motivo obligatorio** (hasta 200 caracteres). Si el monto baja es un descuento; si queda en $0, una beca o un invitado; si sube, un recargo. Un ítem en $0 se muestra como **Becado**.
- **Quién ajusta:** el administrador y el ayudante (decisión de Rod). El ajuste se aplica de inmediato. **Aviso "Visto"**: cuando el ajuste lo hace un ayudante, el ítem aparece en la bandeja del administrador, en la sección **Ajustes de inscripción** (junto a "Respaldos nuevos", Movimientos §3.4), con el antes, el después y el motivo. El administrador toca **Visto** o **Revertir** (vuelve al monto anterior, con motivo). El mismo aviso se usa para los cambios de prueba, caballo o club que hace un ayudante (3.9, 3.10). Lo que ajusta un administrador no genera aviso.
- **Límite:** el monto no puede quedar bajo lo ya pagado. Se muestra "Ya tiene pagado $X. Primero hay que desasignar el excedente" (lo hace el administrador, 3.7).
- En cargos por cantidad (3.4), el ajuste cambia el precio unitario o la cantidad, y el monto se recalcula.

### 3.4 Cargos: cuota por binomio y servicios

**Cuota por binomio (automática).** Decisión de Rod: además de cada prueba, el club cobra un monto fijo por binomio.

- Cada concepto activo que "se cobra a binomio" se carga **una vez** por binomio y evento, al inscribirse en su primera prueba, con la tarifa vigente. Si no hay conceptos de ese tipo (o están inactivos), no se carga nada.
- Se ajusta como cualquier ítem (beca, descuento).
- Si se anulan todas las pruebas del binomio y la cuota no tiene pagos, la cuota se anula sola, en la misma transacción. Si tiene pagos, queda vigente y se resuelve con el retiro (3.8).
- Si el binomio se vuelve a inscribir en una prueba después de quedar sin pruebas, la cuota se carga de nuevo solo si no tiene una vigente.

**Servicios a un jinete o club (manual).** Decisión de Rod: pensión y alojamiento se cobran aparte del binomio, porque el caballo puede ser de otra persona. Se cargan a quien responde por el pago: el jinete o el club.

- Desde la ficha del jinete o del club, **Agregar cargo**: concepto, cantidad (entero de 1 a 999; por defecto 1), precio unitario (se prellena con la tarifa) y descripción opcional, hasta 140 caracteres ("Pesebrera 20 al 22-nov, caballo Relámpago"). Monto = cantidad × precio unitario.
- Si se cambia el precio unitario prellenado, es un ajuste: motivo obligatorio y aviso "Visto" si lo hace un ayudante (3.3).
- **Pensión o alojamiento con tarifas distintas por día:** se agrega un cargo por tramo (por ejemplo, 2 noches a $15.000 y 1 noche a $20.000).
- **Cambio de fechas del evento:** no cambia la cantidad ni el monto de los cargos (se ingresan a mano). Esto resuelve el pendiente de Organización y evento §2.
- Administrador y ayudante agregan cargos; se pagan, ajustan, anulan y retiran como cualquier ítem.

**Categorías del formulario libre** (decisión de Rod): "Pensión de caballos" y "Alojamiento" siguen en el formulario de ingreso de Movimientos para quien **no** está inscrito (por ejemplo, un visitante que paga alojamiento). Para no contar dos veces el mismo dinero, cuando en ese formulario se elige una categoría que es la categoría de referencia de un concepto activo, aparece el aviso: "¿Es de un jinete o club inscrito? Regístralo como pago desde su ficha", con un enlace. No bloquea. El aviso de posible duplicado de Movimientos (marco §6.9) sigue funcionando.

### 3.5 Estado de pago de cada ítem

Se calcula, nunca se escribe a mano (marco §6.4):

- **Pagado** = suma de los `Pago` vigentes del ítem. Un `Pago` es vigente si no está anulado y su movimiento no está anulado, **aunque el movimiento esté por validar u observado** (decisión de Rod: el saldo baja al registrar el pago).
- **Saldo** = monto − pagado.

| Estado | Condición | Se muestra |
|---|---|---|
| `pendiente` | Monto > 0 y pagado = 0 | "Pendiente $X" |
| `parcial` | 0 < pagado < monto | "Parcial: falta $X" |
| `pagado` | Pagado = monto, o monto = 0 | "Pagado", o "Becado" si el monto es $0 |
| `anulado` | Ítem anulado | "Anulado", o "Retirado" si se anuló por retiro (3.8) |

- Si algún `Pago` vigente viene de un movimiento por validar u observado, se agrega la marca **· por validar** ("Pagado · por validar", decisión de Rod). Al validarse, la marca desaparece. Si el administrador anula el movimiento, sus pagos se anulan en cascada (Movimientos §3.7) y el saldo vuelve.
- **Por cobrar de inscripciones** (marco §6.7, ampliado en la sección 6) = suma de los saldos de los ítems no anulados, inscripciones y cargos. El monto de los pagos por validar aparece aparte en "por validar" (marco §6.7) y no suma dos veces: sale de por cobrar al registrarse, igual que un pendiente que un ayudante marca pagado en Movimientos §3.5.

### 3.6 Registrar un pago (administrador y ayudante)

Puntos de entrada: **Registrar pago** en la ficha del jinete, del club o del binomio; **Registrar pago ahora** al terminar de inscribir; y **Asignar a inscripciones** al clasificar un ingreso sin identificar (Movimientos §3.3, solo administrador).

Formulario:

1. **Datos del dinero**, con las reglas de Movimientos §3.1 y §3.2: monto, respaldo (foto o PDF) o **Sin respaldo** con observación, fecha de pago (hoy por defecto), medio de pago, nombre de origen (obligatorio en transferencias, prellenado con el nombre del jinete o del club) y observación. No se elige categoría: es "Inscripciones" (de sistema). La contraparte no se pide: el movimiento está pagado (Movimientos §3.2).
2. **Reparto**: la lista de ítems con saldo de ese jinete, club o binomio (3.11 define qué ítems son de cada uno), con casilla y monto. **Se reparte solo**: el monto se asigna de la más antigua a la más reciente hasta agotarlo (decisión de Rod). Se puede editar: desmarcar, cambiar montos o **Agregar de otro jinete o club** (por ejemplo, un apoderado que paga a dos hijos inscritos por clubes distintos).
3. Debajo, "Asignado $X · Por asignar $Y". Ningún reparto supera el saldo de su ítem. Lo que sobra queda **por asignar** en el mismo movimiento (3.7).
4. **Guardar**: un solo envío con datos, archivos y reparto, e idempotente por `claveCliente`. Crea el movimiento de ingreso (dinero, pagado, categoría de sistema "Inscripciones") y sus `Pago`. Validación según Movimientos §3.1: el del ayudante queda por validar; el del administrador, validado.
5. Antes de guardar se muestra el aviso de posible duplicado de Movimientos (marco §6.9).

**Efectivo en la cancha sin comprobante:** Sin respaldo con observación ("Efectivo recibido en terreno por Juan"). Queda destacado al validar (Movimientos §3.4).

### 3.7 Por asignar, desasignar y reasignar

- **Por asignar de un movimiento** = monto − pagos vigentes − devoluciones de sobrante vigentes (3.8). El total de lo por asignar es el indicador del marco §6.7.
- Pestaña **Por asignar** en `/inscripciones`: movimientos "Inscripciones" con saldo por asignar, con nombre de origen, fecha y monto. **Asignar** abre el reparto del paso 2 de 3.6.
- **Quién asigna lo por asignar:** el administrador, siempre. El ayudante, solo en movimientos que él envió a validar y que siguen por validar u observados, es decir, cuando corrige su propio reparto (decisión de Rod).
- **Desasignar** (corregir un pago mal asignado): **solo el administrador**. Anula el `Pago` con motivo (no lo borra) y el monto vuelve a por asignar; después se reasigna. Queda en auditoría con `desasignar_pago` y `asignar_pago`.
- **El ayudante corrige su reparto:** mientras su movimiento sigue por validar u observado, puede cambiar el reparto. Los `Pago` anteriores se anulan con el motivo "Corrección de reparto" y se crean los nuevos, en una transacción.
- **Cambiar el monto de un movimiento de "Inscripciones"** se hace desde aquí (Movimientos §3.11), con sus reglas de edición. No puede quedar bajo lo asignado más lo devuelto como sobrante.

### 3.8 Anular, retirar y devolver

**Anular un ítem sin pagos:**

| Quién | Qué |
|---|---|
| Ayudante | Inscripciones y cargos que registró él, mientras no tengan pagos vigentes (decisión de Rod). |
| Administrador | Cualquier ítem sin pagos vigentes. |

Motivo obligatorio (hasta 300 caracteres). El ítem queda visible, tachado, y deja de sumar a por cobrar (marco §6.8). La cuota automática sigue la regla de 3.4.

**Retiro de un binomio que ya pagó** (solo administrador, decisión de Rod). Caso: un binomio pagó dos pruebas y la cuota, y se retira por lesión del caballo.

1. En la ficha del binomio, **Retirar**. Se eligen los ítems que se retiran (una prueba o todas, y la cuota) y se escribe el motivo.
2. Si algún pago de esos ítems viene de un movimiento por validar u observado, se detiene: "Hay un pago por validar. Valídalo o anúlalo primero" (decisión de Rod). Así el retiro trabaja solo con dinero confirmado.
3. Se muestra lo pagado por esos ítems y se elige: **No devolver**, **Devolver todo** o **Devolver una parte** (decisión de Rod: el club puede devolver todo o una parte).
4. Si hay devolución: monto, respaldo (comprobante de la transferencia al binomio) o sin respaldo con observación, fecha de pago y medio. Se crea un movimiento de **gasto** en la categoría de sistema "Devoluciones", pagado y validado (lo registra un administrador), con una `Devolucion` por ítem. El monto se reparte entre los ítems de la misma forma que un pago (más antiguo primero, editable) y no supera lo pagado por cada uno.
5. En una transacción, los ítems quedan anulados con la marca **retirado** y el motivo.
6. **Retenido** por ítem = pagado − devuelto. El dinero retenido sigue en la caja: el movimiento de ingreso no cambia. La ficha y la pestaña **Retiros** muestran pagado, devuelto y retenido.

Después de un retiro con dinero retenido, el administrador puede **Registrar devolución** sobre esos ítems (por ejemplo, si el club decide devolver más tarde), con el mismo paso 4, hasta el monto retenido.

**Devolver un sobrante.** Si alguien pagó de más y ese dinero quedó por asignar, el administrador toca **Devolver sobrante** en el movimiento: gasto en "Devoluciones" con una `Devolucion` vinculada al movimiento de ingreso. Lo por asignar baja en ese monto.

**Anular una devolución:** se anula su movimiento de gasto (Movimientos §3.7, administrador). En cascada se anulan sus `Devolucion`: el retenido del ítem sube o el sobrante vuelve a por asignar. Los ítems retirados siguen anulados.

**No se desanula:** un ítem anulado por error se vuelve a inscribir o cargar, con la tarifa vigente o ajustando el monto.

**Anular un binomio:** solo administrador, y solo si todos sus ítems están anulados. Se usa para resolver el conflicto de fusión (3.13). El binomio queda visible, marcado como anulado.

### 3.9 Cambios antes del concurso

Decisión de Rod: se edita y el pago se conserva.

- **Cambiar de prueba:** en la inscripción, **Cambiar prueba**. Los pagos siguen en la misma inscripción. El monto no cambia solo. Si la tarifa de la nueva prueba es distinta, se ofrece "Ajustar a la tarifa de la nueva prueba ($X)", que es un ajuste con motivo "Cambio de prueba". Se rechaza si el binomio ya está inscrito en esa prueba.
- **Cambiar de caballo o de jinete** (por ejemplo, por una lesión): en el binomio, **Cambiar caballo** o **Cambiar jinete**. Cambia el par del mismo binomio y se conservan sus inscripciones, cuota y pagos. Se rechaza si el par nuevo ya existe en el evento. En ese caso, las pruebas se mueven una a una con **Mover a otro binomio**, que conserva sus pagos y no carga una cuota nueva.
- Pueden hacerlo el administrador y el ayudante. Si lo hace un ayudante, genera el aviso "Visto" (3.3). Todo queda en auditoría con antes y después.

### 3.10 Club del binomio

- Al crear el binomio se copia el club del jinete (Participantes §2). Si después cambia el club del jinete, los binomios existentes no cambian.
- Se puede cambiar **solo para ese evento** (por ejemplo, un jinete que este año representa a otro club), desde la ficha del binomio o al inscribir. Pueden hacerlo el administrador y el ayudante, con aviso "Visto" si es un ayudante.
- El club del binomio define en qué estado de cuenta de club aparecen sus ítems (3.11). Los pagos ya asignados no cambian.

### 3.11 Estado de cuenta y "Copiar estado de cuenta"

**Qué ítems son de quién:**

| Sujeto | Ítems |
|---|---|
| Binomio | Sus inscripciones y su cuota. |
| Jinete | Los ítems de todos sus binomios del evento (con cualquier caballo o club) y los cargos a su nombre. |
| Club | Los ítems de los binomios cuyo club (del binomio) es ese club y los cargos a nombre del club. |

Un mismo ítem aparece en el estado de cuenta del jinete y en el de su club, porque cualquiera de los dos puede pagarlo. Al pagarlo desde cualquiera de las dos fichas, el saldo baja en ambas.

**Estado de cuenta** en la ficha del jinete, del club y del binomio (solo administrador y ayudante): cada ítem con prueba o concepto, caballo, monto, pagado y saldo; los totales; y los pagos con fecha y medio.

**Copiar estado de cuenta** (decisión de Rod: para cobrar por WhatsApp). Copia al portapapeles un texto simple:

```
Concurso <nombre del evento> — Estado de cuenta
<Jinete o club>

• <Jinete> / <Caballo> — <Prueba>: $25.000 · pagado $25.000
• <Jinete> / <Caballo> — Cuota de participación: $10.000 · pendiente
• Pensión de caballos (2 noches): $30.000 · pagado $15.000

Total: $65.000 · Pagado: $40.000 · Saldo: $25.000
Pagos recibidos en revisión: $15.000
```

- Solo contiene nombres de jinetes y caballos, pruebas, conceptos y montos del sujeto. No incluye RUT, contactos, edades, alertas, nombres de origen, motivos ni datos de otros sujetos.
- La línea "Pagos recibidos en revisión" aparece solo si hay pagos por validar.
- Los ítems anulados no aparecen. Los retirados con retenido aparecen en una sección "Retiros" con pagado, devuelto y retenido.
- Queda en auditoría como `copiar_estado_cuenta`, sin el texto.

### 3.12 Listas, fichas y qué ve cada rol

`/inscripciones`, con pestañas:

| Pestaña | Contenido |
|---|---|
| Binomios | Tarjeta de dos líneas (UX/UI §3.7): jinete · caballo · saldo; club · N pruebas · estado. Total y pagado, en la ficha. Filtros: club, prueba, estado y, para administrador y ayudante, "Con alertas". Búsqueda por jinete o caballo. |
| Por prueba | Por cada prueba: inscripciones vigentes, monto total y pagado. Sin cupos. |
| Cargos | Cuotas y servicios con sujeto, concepto, cantidad, monto y estado. |
| Por cobrar | Ítems con saldo, agrupados por club, con el total. |
| Por asignar | 3.7. |
| Retiros | Ítems retirados con pagado, devuelto y retenido. |
| Por revisar (v1.1) | Solicitudes del formulario, solo administrador y ayudante (Formulario de inscripción §3.5). |

Arriba, los totales: por cobrar, pagado (del cual por validar) y por asignar. La pestaña activa se refleja en la URL (`?pestana=por-cobrar`, etc.; Dashboard §5.5).

**Ficha del binomio:** jinete (con alertas), caballo, club del binomio, inscripciones y cuota con estado, pagos, devoluciones, acciones según permisos y línea de tiempo de auditoría. La ficha del jinete y la del club (Participantes §3.9) agregan su estado de cuenta y los botones **Inscribir**, **Registrar pago**, **Agregar cargo** y **Copiar estado de cuenta**.

**Qué ve cada rol** (complementa marco §2.2):

| | Administrador | Ayudante | Observador |
|---|---|---|---|
| Binomios, pruebas, conceptos, montos, pagado, saldo y estados | Sí | Sí | Sí |
| Alertas del jinete y avisos de edad por prueba | Sí | Sí | **No** (revelan que es menor o su edad) |
| Estado de cuenta y "Copiar estado de cuenta" | Sí | Sí | **No** |
| Nombre de origen y respaldos de pagos y devoluciones | Sí | Sí | **No** (Movimientos §3.8) |
| Motivos de ajuste, anulación y retiro, y descripción de cargos | Sí | Sí | **No** (texto libre que puede tener datos personales) |
| Inscribir, agregar cargos, ajustar, registrar pagos, cambiar prueba, caballo o club | Sí | Sí (con aviso en ajustes y cambios) | No |
| Anular ítems sin pagos | Todos | Solo los que registró | No |
| Desasignar, retirar, devolver, anular binomio, marcar "Visto" o revertir | Sí | No | No |
| Configurar pruebas y conceptos | Sí | No | No |

Lo oculto al observador se quita en el servidor, nunca solo en la interfaz.

### 3.13 Fusión de participantes y cambio de fechas del evento

- **Fusión** (Participantes §3.7): al fusionar jinetes, caballos o clubes, Participantes llama al gancho `reasignarPorFusion` (5.3). Reasigna al conservado los binomios (jinete o caballo), el `clubId` de los binomios (club) y los cargos a nombre del duplicado (jinete o club). **Si quedarían dos binomios vigentes con el mismo jinete, caballo y evento, la fusión se rechaza** y se listan esos binomios (Participantes §3.7). El administrador mueve las pruebas de uno al otro (3.9), anula el que queda vacío (3.8) y vuelve a fusionar.
- **Cambio de fechas del evento** (Organización y evento §3.2): la vista previa agrega las inscripciones cuyo jinete **deja de cumplir** o **pasa a cumplir** el límite de edad de su prueba con la nueva fecha de referencia, con la consulta `inscripcionesAfectadasPorCambioDeFecha` (5.3). Guardar no modifica inscripciones: solo cambia los avisos.

### 3.14 Uso en la cancha

- Los selectores cargan las listas activas al abrir la pantalla y filtran en el teléfono (Participantes §3.10).
- Inscribir y registrar el pago son dos envíos cortos, cada uno con reintento que conserva el formulario y no duplica (`claveCliente`).
- Fotos del comprobante comprimidas en el teléfono (Movimientos §3.1).
- Sin señal del todo: el registro sin conexión es v1.1 y solo cubre movimientos. Una inscripción hecha en la cancha sin señal se anota en papel y se registra al volver la señal.

### 3.15 Casos borde revisados

| Caso | Tratamiento |
|---|---|
| Pago parcial o en cuotas | Cada pago es un movimiento que se reparte; el ítem queda `parcial` hasta completar (3.5, 3.6). |
| Una transferencia cubre varios binomios o la paga un club | Un movimiento con varios `Pago`, desde la ficha del club o agregando ítems de otros sujetos (3.6). |
| Transferencia sin identificar | Ingreso sin identificar (Movimientos §3.3); el administrador la asigna a inscripciones al saber de quién es (3.6). |
| Pago de más | El excedente queda por asignar; se asigna a otro ítem o se devuelve como sobrante (3.7, 3.8). |
| Efectivo en terreno sin comprobante | Sin respaldo con observación; destacado al validar (3.6). |
| Binomio que se retira y pide devolución | Retiro por el administrador, con devolución total, parcial o ninguna, y retenido a la vista (3.8). |
| Se retira de una sola prueba | Retiro solo de ese ítem (3.8). |
| Retiro con un pago aún por validar | Se exige validarlo o anularlo antes (3.8). |
| Un jinete con varios caballos, o un caballo con varios jinetes | Binomios distintos; cada uno con su cuota y sus pruebas (3.2, 3.4). |
| Inscripción en varias pruebas | Varias casillas en un solo envío (3.2). |
| Categorías por edad y jinete que no cumple o sin fecha de nacimiento | Aviso por prueba que no bloquea; oculto al observador (3.2, 3.12). |
| Menor de edad sin apoderado | Alerta de Participantes visible al inscribir; no bloquea (Participantes §3.4). |
| Descuentos, becas o invitados | Ajuste con motivo; $0 = "Becado"; aviso "Visto" si lo hace un ayudante (3.3). |
| Pensión o alojamiento por varios días con tarifa distinta | Cargo al jinete o club, uno por tramo (3.4). |
| Caballo de otra persona que paga la pensión | El cargo va a quien responde por el pago (jinete o club), no al binomio (3.4). |
| Pensión pagada por un visitante no inscrito | Ingreso en la categoría libre "Pensión de caballos", con aviso si hay un concepto relacionado (3.4). |
| Cambio de caballo por lesión, o cambio de prueba | Se edita y se conservan los pagos (3.9). |
| Cambio de tarifa con inscritos | Los ítems conservan su monto (3.1). |
| Auspicio en especie o canje | No es de este componente (Movimientos §3.6). |
| Gasto pagado por un ayudante | No es de este componente (Movimientos §3.5). |
| Pago de inscripción observado por el administrador | Sus `Pago` siguen vigentes y el ítem muestra "· por validar". Si se anula, el saldo vuelve (3.5). |
| Mismo pago registrado dos veces por dos personas | Aviso de posible duplicado al guardar. Si igual pasa, el administrador anula uno y sus pagos se anulan en cascada (3.6). |
| Reintento tras una respuesta perdida | `claveCliente` devuelve lo ya creado, al inscribir y al pagar (3.2, 3.6). |
| Dos personas inscriben el mismo binomio en la misma prueba a la vez | El índice único rechaza la segunda con "Ya inscrito" (5.1). |
| Dos pagos simultáneos al mismo ítem superan el saldo | Bloqueo de filas en la transacción; el segundo recibe "El saldo cambió" y se recarga el reparto (5.2). |
| Jinete o caballo duplicado al importar | Aviso de parecido (Participantes §3.5); si se fusionan y queda un binomio repetido, la fusión se rechaza (3.13). |
| Jinete que representa a otro club este año | Se cambia el club del binomio (3.10). |
| Un apoderado paga por dos hermanos de clubes distintos | Reparto con "Agregar de otro jinete o club" (3.6). |
| Se posterga el concurso | Vista previa con las inscripciones que cambian de condición por edad (3.13); los cargos no cambian (3.4). |
| Movimientos después del cierre | v1.1 (Cierre y rendición). En v1.0 el evento está abierto. |
| Uso con señal baja | Listas locales, dos envíos cortos con reintento (3.14). |
| Formulario manipulado con ids de otra organización o de otro evento | Rechazo por `exigirDeLaOrganizacion` y verificación de evento (5.2). |

---

## 4. Cumplimiento normativo

Aplica: el componente vincula a jinetes (incluidos **menores de edad**) y clubes con montos y pagos, muestra alertas y avisos de edad, y produce un texto que sale del portal por WhatsApp. Lo transversal está en el marco §9; aquí solo lo específico.

- **Normativa y vigencia** (reverificada el 2026-09-27): Ley 19.628, vigente. Ley 21.719, entra en vigencia el **2026-12-01**. El proyecto de prórroga a 2027 (Boletín 18.623-07) seguía en primer trámite en el Senado al 2026-09-23, sin informe de comisión ni votación. El Ejecutivo renovó la urgencia el 2026-09-22. Mientras no se publique, la fecha vigente es el 2026-12-01. El diseño la cumple desde el inicio (marco §9.1).
- **Datos regulados en este componente:** la relación entre un jinete o club y sus inscripciones, cargos, pagos y devoluciones; los textos libres de motivos y descripciones; los avisos de edad por prueba, que derivan de la fecha de nacimiento. No se agregan campos personales nuevos: los datos de las personas son los de Participantes y los del dinero, los de Movimientos.
- **Base de licitud:** ejecución de la relación de inscripción al concurso y necesidad de rendir la tesorería al club (marco §9.2).
- **Medidas específicas:**
  - el observador no recibe alertas, avisos de edad, estados de cuenta, nombres de origen, respaldos, motivos ni descripciones de cargos, tampoco en la API (3.12);
  - "Copiar estado de cuenta" solo contiene nombres, pruebas, conceptos y montos del sujeto, sin RUT, contactos, edades ni datos de otros sujetos (3.11). Un estado de cuenta de club lista los jinetes de sus binomios, que el club ya conoce. La acción queda en auditoría;
  - la ayuda del campo motivo dice "No escribas datos de salud, RUT ni números de cuenta" (una beca o un retiro pueden deberse a una lesión o a una situación personal: basta con "Lesión" o "Beca del club");
  - todas las consultas pasan por `db(ctx)` y toda referencia por `exigirDeLaOrganizacion`.
- **Menores de edad** (marco §9.3): las alertas de Participantes se ven al inscribir y no bloquean (Participantes §3.4). Los avisos de edad por prueba solo los ven el administrador y el ayudante.
- **Derechos de los titulares** (marco §9.6): la descarga de datos del jinete de Participantes (§4) incluye sus binomios, inscripciones, cargos, pagos y devoluciones. La rectificación se hace editando. La supresión no aplica a inscripciones y pagos antes de plazo, porque son parte del libro que se rinde al club. Se informa al titular.
- **Trazabilidad y conservación:** toda creación, ajuste, cambio, asignación, desasignación, anulación, retiro y devolución queda en `RegistroAuditoria`. Inscripciones, cargos y pagos se conservan como parte del libro (marco §9.5). Los respaldos de pagos y devoluciones siguen la regla de Movimientos §4.

---

## 5. Especificación de ejecución

Stack heredado del marco §8, sin cambios. Nombres de entidad del marco §5, más los que agrega este documento (sección 6). Columnas en `snake_case` con `@map`. Código en `src/dominio/inscripciones/binomios/`.

### 5.1 Modelo de datos (Prisma)

```prisma
enum AplicaConcepto { binomio participante }

model Prueba {
  id                String   @id @default(cuid())
  organizacionId    String
  eventoId          String
  nombre            String
  nombreNormalizado String
  tarifaClp         Int      // >= 0
  edadMinima        Int?
  edadMaxima        Int?
  orden             Int
  activa            Boolean  @default(true)
  creadoPorId       String
  version           Int      @default(1)
  creadoEn          DateTime @default(now())
  actualizadoEn     DateTime @updatedAt
  @@unique([eventoId, nombreNormalizado])
  @@index([organizacionId, eventoId])
}

model Concepto {
  id                     String         @id @default(cuid())
  organizacionId         String
  eventoId               String
  nombre                 String
  nombreNormalizado      String
  aplicaA                AplicaConcepto
  tarifaClp              Int            // >= 0, por unidad
  unidad                 String?        // hasta 20
  categoriaReferenciaId  String?        // categoría de ingreso del formulario libre (aviso 3.4)
  orden                  Int
  activo                 Boolean        @default(true)
  creadoPorId            String
  version                Int            @default(1)
  creadoEn               DateTime       @default(now())
  actualizadoEn          DateTime       @updatedAt
  @@unique([eventoId, nombreNormalizado])
  @@index([organizacionId, eventoId])
}

model Binomio {
  id              String    @id @default(cuid())
  organizacionId  String
  eventoId        String
  jineteId        String
  caballoId       String
  clubId          String    // copiado del jinete al crear; editable por evento (3.10)
  importacionId   String?   // Importación desde Excel que lo creó
  anulado         Boolean   @default(false)
  motivoAnulacion String?
  anuladoPorId    String?
  anuladoEn       DateTime?
  creadoPorId     String
  version         Int       @default(1)
  creadoEn        DateTime  @default(now())
  actualizadoEn   DateTime  @updatedAt
  @@index([organizacionId, eventoId])
  @@index([organizacionId, jineteId])
  @@index([organizacionId, caballoId])
  @@index([organizacionId, clubId])
}

// Campos comunes de un ítem cobrable (Inscripcion y Cargo)
model Inscripcion {
  id               String    @id @default(cuid())
  organizacionId   String
  eventoId         String
  binomioId        String
  pruebaId         String
  tarifaClp        Int       // tarifa de la prueba al crear (referencia)
  montoClp         Int       // >= 0; monto a pagar vigente
  motivoAjuste     String?   // último motivo, si montoClp != tarifaClp o hubo cambio
  avisoPendiente   Boolean   @default(false) // ajuste o cambio de ayudante sin "Visto"
  avisoVistoPorId  String?
  avisoVistoEn     DateTime?
  anulado          Boolean   @default(false)
  retirado         Boolean   @default(false) // anulado por retiro (3.8)
  motivoAnulacion  String?
  anuladoPorId     String?
  anuladoEn        DateTime?
  claveCliente     String    // de la operación inscribir (idempotencia)
  importacionId    String?   // Importación desde Excel que la creó
  registradoPorId  String
  version          Int       @default(1)
  creadoEn         DateTime  @default(now())
  actualizadoEn    DateTime  @updatedAt
  @@unique([organizacionId, claveCliente, pruebaId])
  @@index([organizacionId, eventoId])
  @@index([binomioId])
}

model Cargo {
  id                 String    @id @default(cuid())
  organizacionId     String
  eventoId           String
  conceptoId         String
  binomioId          String?   // conceptos que se cobran a binomio
  jineteId           String?   // conceptos que se cobran a jinete o club
  clubId             String?
  automatico         Boolean   @default(false) // cuota cargada al inscribir
  cantidad           Int       // 1 a 999
  tarifaClp          Int       // tarifa del concepto al crear (referencia)
  precioUnitarioClp  Int       // >= 0
  montoClp           Int       // = cantidad * precioUnitarioClp
  descripcion        String?   // hasta 140
  motivoAjuste       String?
  avisoPendiente     Boolean   @default(false)
  avisoVistoPorId    String?
  avisoVistoEn       DateTime?
  anulado            Boolean   @default(false)
  retirado           Boolean   @default(false)
  motivoAnulacion    String?
  anuladoPorId       String?
  anuladoEn          DateTime?
  claveCliente       String
  registradoPorId    String
  version            Int       @default(1)
  creadoEn           DateTime  @default(now())
  actualizadoEn      DateTime  @updatedAt
  @@unique([organizacionId, claveCliente, conceptoId])
  @@index([organizacionId, eventoId])
  @@index([binomioId])
  @@index([jineteId])
  @@index([clubId])
}

model Pago {
  id               String    @id @default(cuid())
  organizacionId   String
  movimientoId     String    // ingreso, categoría de sistema "inscripciones"
  inscripcionId    String?
  cargoId          String?
  montoClp         Int       // > 0
  anulado          Boolean   @default(false)
  motivoAnulacion  String?
  anuladoPorId     String?
  anuladoEn        DateTime?
  creadoPorId      String
  creadoEn         DateTime  @default(now())
  @@index([organizacionId, movimientoId])
  @@index([inscripcionId])
  @@index([cargoId])
}

model Devolucion {
  id               String    @id @default(cuid())
  organizacionId   String
  movimientoId     String    // gasto, categoría de sistema "devoluciones"
  inscripcionId    String?   // retiro
  cargoId          String?   // retiro
  ingresoId        String?   // sobrante de un movimiento de ingreso
  montoClp         Int       // > 0
  anulado          Boolean   @default(false)
  motivoAnulacion  String?
  anuladoPorId     String?
  anuladoEn        DateTime?
  creadoPorId      String
  creadoEn         DateTime  @default(now())
  @@index([organizacionId, movimientoId])
  @@index([inscripcionId])
  @@index([cargoId])
  @@index([ingresoId])
}
```

**Restricciones por migración SQL:**

- Índices únicos parciales: `binomio (evento_id, jinete_id, caballo_id) WHERE NOT anulado`; `inscripcion (binomio_id, prueba_id) WHERE NOT anulado`.
- `CHECK` en `Prueba` y `Concepto`: `tarifa_clp >= 0`; en `Prueba`, `edad_minima IS NULL OR edad_maxima IS NULL OR edad_minima <= edad_maxima`.
- `CHECK` en `Inscripcion`: `monto_clp BETWEEN 0 AND 999999999`; `NOT retirado OR anulado`; `NOT anulado OR (motivo_anulacion IS NOT NULL AND anulado_por_id IS NOT NULL)`.
- `CHECK` en `Cargo`: `cantidad BETWEEN 1 AND 999`; `monto_clp = cantidad * precio_unitario_clp`; exactamente uno de `binomio_id`, `jinete_id`, `club_id` no nulo; `NOT retirado OR anulado`; `NOT automatico OR binomio_id IS NOT NULL`.
- `CHECK` en `Pago`: `monto_clp > 0`; exactamente uno de `inscripcion_id`, `cargo_id`.
- `CHECK` en `Devolucion`: `monto_clp > 0`; exactamente uno de `inscripcion_id`, `cargo_id`, `ingreso_id`.

Las reglas entre tablas (sumas, tipo de concepto, categoría del movimiento) no caben en un `CHECK`: las verifica el servidor en la misma transacción (5.2).

### 5.2 Reglas de código y funciones de dominio (con pruebas)

- **Montos:** Zod `z.number().int().min(0).max(999_999_999)` para montos de ítems y tarifas; `min(1)` para pagos y devoluciones.
- **Pago vigente:** `!pago.anulado && !movimiento.anulado`. Igual para `Devolucion`.
- `estadoItem(item, pagosVigentes)`: devuelve `{ monto, pagado, saldo, estado, porValidar, becado }` según 3.5. Es **la única** función de estado; la usan las listas, las fichas, el estado de cuenta, Importación, Dashboard y Rendición.
- `retiroItem(item, pagos, devoluciones)`: `{ pagado, devuelto, retenido }`.
- `porAsignar(movimiento, pagos, devolucionesSobrante)`: monto − pagos vigentes − devoluciones de sobrante vigentes.
- `porCobrarInscripciones(ctx, eventoId)` y `totalPorAsignar(ctx, eventoId)`: los indicadores del marco §6.7 que usa el Dashboard. Se calculan en SQL con los mismos criterios de las dos funciones anteriores.
- `repartirMonto(monto, items)`: asigna de la más antigua a la más reciente (`creadoEn`, luego `id`) sin superar ningún saldo; devuelve el reparto y el sobrante. La usan el pago, la devolución por retiro e Importación.
- `itemsDeSujeto(ctx, { binomioId | jineteId | clubId })`: aplica la tabla de 3.11.
- `avisoEdadPrueba(jinete, prueba, evento)`: con `edadEnEvento` (Participantes §5.2) devuelve `null`, `no_cumple_edad` o `edad_sin_dato`.
- `textoEstadoCuenta(ctx, sujeto)`: arma el texto de 3.11 en el servidor, desde `estadoItem`.
- **Registrar un pago:** en una transacción, llama a la función interna de Movimientos para crear el ingreso (con `claveSistema = "inscripciones"`, sin pasar por el selector), bloquea con `SELECT … FOR UPDATE` los ítems del reparto, recalcula sus saldos y rechaza si alguno se supera ("El saldo cambió"), y crea los `Pago`. Verifica que cada ítem sea del evento del movimiento y de la organización.
- **Asignar, desasignar y corregir el reparto:** bloquea el movimiento y los ítems; verifica `suma(pagos vigentes) + suma(devoluciones de sobrante vigentes) <= movimiento.montoClp`.
- **Devolución:** crea el gasto con `claveSistema = "devoluciones"` mediante la función interna de Movimientos (autovalidado, porque solo lo hace un administrador) y las `Devolucion`, verificando que ninguna supere el pagado del ítem (retiro) o el por asignar del ingreso (sobrante).
- **Cuota automática:** al crear inscripciones, si el binomio no tiene un cargo vigente de un concepto activo con `aplicaA = binomio`, lo crea con `cantidad = 1` y la tarifa vigente. Al anular la última inscripción vigente de un binomio, anula en la misma transacción las cuotas sin pagos vigentes.
- **Aviso "Visto":** `avisoPendiente = true` cuando un usuario sin `inscripciones.administrar` ajusta o cambia un ítem. `marcarVisto` y `revertirAjuste` lo dejan en `false`.
- **Idempotencia:** `inscribir` recibe una `claveCliente`; si ya existen inscripciones con esa clave del mismo usuario, devuelve el resultado anterior sin crear. El pago usa la `claveCliente` del movimiento (Movimientos §5.2).
- **Ocultar al observador:** `ocultarDatosInscripcion(ctx, …)` quita alertas, avisos de edad, motivos, descripción de cargos y nombres de origen, y responde 403 en estado de cuenta y en su copia.
- **Evento:** toda acción verifica el evento vigente `abierto` (Organización y evento §3.6).

### 5.3 Acciones de servidor y consultas

Todas con Zod, `obtenerContexto`, `exigir(ctx, accion)`, `exigirDeLaOrganizacion`, `version` en ediciones y auditoría en la misma transacción.

| Función | Permiso (5.4) | Efecto |
|---|---|---|
| `crearPrueba`, `editarPrueba`, `crearConcepto`, `editarConcepto`, `ordenar…`, `desactivar…`, `reactivar…` | `configurar` | 3.1. |
| `inscribir({ jineteId, caballoId, clubId, pruebas: [{ pruebaId, montoClp?, motivo? }], claveCliente })` | `inscripciones.inscribir` | 3.2 y cuota automática (3.4). La usan Importación y el Formulario. La función interna acepta además `tx` (transacción externa), `importacionId` y `auditar: false`, que solo usa Importación desde Excel (§5.7 y §5.8 de ese documento). |
| `agregarCargo({ conceptoId, jineteId \| clubId, cantidad, precioUnitarioClp, descripcion?, motivo?, claveCliente })` | `inscripciones.inscribir` | 3.4. |
| `ajustarItem(tipo, id, { montoClp \| cantidad \| precioUnitarioClp, motivo }, version)` | `inscripciones.inscribir` | 3.3; aviso si no administra. |
| `cambiarPrueba(inscripcionId, pruebaId, ajustar?, version)` | `inscripciones.inscribir` | 3.9. |
| `cambiarParBinomio(binomioId, { jineteId? , caballoId? }, version)` | `inscripciones.inscribir` | 3.9. |
| `moverInscripcion(inscripcionId, binomioDestino \| { jineteId, caballoId }, version)` | `inscripciones.inscribir` | 3.9. |
| `cambiarClubBinomio(binomioId, clubId, version)` | `inscripciones.inscribir` | 3.10. |
| `registrarPagoInscripciones(datosMovimiento, archivos, reparto)` | `inscripciones.inscribir` | 3.6. La función interna acepta además `tx` (transacción externa) y `respaldoExistente` (ruta de un archivo ya copiado al volumen en lugar de `archivos`), que solo usa Formulario de inscripción (§5.6 de ese documento). |
| `asignarPorAsignar(movimientoId, reparto, version)` | `inscripciones.administrar`, o `inscripciones.inscribir` con `esPropio` sobre `enviadoAValidarPorId` y movimiento por validar u observado | 3.7. |
| `corregirReparto(movimientoId, reparto, version)` | Igual que la anterior | 3.7. |
| `desasignarPago(pagoId, motivo)` | `inscripciones.administrar` | 3.7. |
| `anularItem(tipo, id, motivo, version)` | `inscripciones.administrar`, o `inscripciones.inscribir` con `esPropio` y sin pagos vigentes | 3.8. |
| `retirar(binomioId, items, motivo, devolucion?)` | `inscripciones.administrar` | 3.8. |
| `registrarDevolucionRetiro(items, devolucion)` | `inscripciones.administrar` | 3.8. |
| `devolverSobrante(movimientoId, devolucion)` | `inscripciones.administrar` | 3.8. |
| `anularBinomio(binomioId, motivo, version)` | `inscripciones.administrar` | 3.8. |
| `marcarVisto(tipo, id)`, `revertirAjuste(tipo, id, motivo)` | `inscripciones.administrar` | 3.3. |
| `copiarEstadoCuenta(sujeto)` | `inscripciones.verEstadoCuenta` | 3.11; devuelve el texto y audita. |
| `reasignarPorFusion(tx, entidad, conservadoId, duplicadoId)` | Interno (lo llama Participantes con `participantes.administrar`) | 3.13; lanza `ConflictoBinomios` con la lista. |
| `inscripcionesAfectadasPorCambioDeFecha(ctx, eventoId, nuevaFechaReferencia)` | `configurar` | 3.13. |
| `anularEnCascadaPorMovimiento(tx, movimientoId)` | Interno (lo llama `anularMovimiento` de Movimientos) | Anula los `Pago` o las `Devolucion` del movimiento y devuelve la lista para su aviso y auditoría. |

Consultas: `listarBinomios(filtros)`, `fichaBinomio(id)`, `estadoCuenta(sujeto)`, `resumenPorPrueba()`, `listarCargos(filtros)`, `listarPorCobrar()`, `listarPorAsignar()`, `listarRetiros()`, `bandejaAjustes()` y `contadorAjustes()`. Todas pasan por `ocultarDatosInscripcion`.

### 5.4 Permisos (`src/lib/permisos.ts`)

Se agregan a la tabla única (Acceso y roles §5.4), con el mismo estilo que Participantes:

| Acción | Administrador | Ayudante | Observador |
|---|---|---|---|
| `inscripciones.ver` | Sí | Sí | Sí (sin alertas, motivos, descripciones ni nombres de origen) |
| `inscripciones.inscribir` (inscribir, cargos, ajustar, cambiar, registrar pagos, anular propios sin pagos) | Sí | Sí | No |
| `inscripciones.verEstadoCuenta` | Sí | Sí | No |
| `inscripciones.administrar` (asignar cualquiera, desasignar, anular cualquiera, retirar, devolver, anular binomio, visto y revertir) | Sí | No | No |

Pruebas y conceptos usan la acción existente `configurar`.

### 5.5 Pantallas y componentes

| Ruta o componente | Rol | Contenido |
|---|---|---|
| `/configuracion/pruebas` | Administrador | Listas de pruebas y conceptos (3.1). |
| `/inscripciones` | Todos con membresía activa | Pestañas y totales (3.12). |
| `/inscripciones/nueva` | Administrador y ayudante | Formulario de 3.2 (acepta `?jineteId=` o `?caballoId=`). |
| `/inscripciones/binomios/[id]` | Todos (reducida para el observador) | Ficha del binomio (3.12). |
| `/inscripciones/pago` | Administrador y ayudante | Formulario de 3.6 (acepta sujeto e ítems prellenados). |
| `/inscripciones/movimientos/[id]/asignar` | Administrador y ayudante (3.7) | Reparto de lo por asignar. |
| `/inscripciones/binomios/[id]/retirar` | Administrador | Retiro y devolución (3.8). |
| Sección **Ajustes de inscripción** en `/movimientos/validar` | Administrador | Avisos con Visto y Revertir (3.3); suma al contador del menú. |
| `<EstadoCuenta>` y botón **Copiar estado de cuenta** | Administrador y ayudante | En las fichas de jinete, club y binomio (3.11). |
| `<RepartoPago>` | Administrador y ayudante | Lista de ítems con casillas y montos, reparto automático y sobrante (3.6). |
| `<EstadoItem>` | Todos | Chip de estado con la marca "· por validar" (3.5). |

Celular primero (marco §7, principio 6): tarjetas en vez de tablas anchas, botones de al menos 44 px, teclado numérico en montos.

### 5.6 Integración con Movimientos

- **Crear movimientos de sistema:** Movimientos expone una función interna `registrarMovimientoSistema(tx, ctx, { claveSistema, … }, archivos)` con las mismas reglas de 3.1 y 3.2 de Movimientos (respaldo u observación, fechas, medio, `claveCliente`, autovalidación), sin pasar por el selector de categorías.
- **Anulación en cascada:** `anularMovimiento` llama a `anularEnCascadaPorMovimiento` (5.3). El aviso previo lista los ítems que quedarían con saldo (pagos) o los retiros cuyo retenido cambia (devoluciones).
- **Sin identificar:** al clasificar, **Asignar a inscripciones** pone la categoría de sistema y abre el reparto (3.6) en la misma transacción.
- **Aviso en el formulario libre:** si la categoría elegida es la `categoriaReferenciaId` de un concepto activo del evento, se muestra el aviso de 3.4.
- **Ficha del movimiento:** para "Inscripciones" muestra los pagos con enlace a cada ítem y lo por asignar; para "Devoluciones", los ítems o el ingreso devueltos.

### 5.7 Auditoría

Con `registrarAuditoria` (marco §6.8). Entidades `Prueba`, `Concepto`, `Binomio`, `Inscripcion`, `Cargo`, `Pago` y `Devolucion`. Acciones: `crear`, `modificar`, `desactivar`, `reactivar`, `ajustar_monto`, `cambiar_prueba`, `cambiar_binomio`, `mover_inscripcion`, `cambiar_club_binomio`, `asignar_pago` (marco), `desasignar_pago`, `corregir_reparto`, `anular`, `retirar`, `registrar_devolucion`, `marcar_visto`, `revertir_ajuste`, `copiar_estado_cuenta`. Cada una con antes y después de los campos cambiados. `inscribir` deja un registro por inscripción y por cuota creadas.

### 5.8 Pruebas (Vitest)

- **Aislamiento:** con dos organizaciones, ninguna entidad de 5.1 se lee, cuenta, crea ni modifica desde la otra; ids de jinete, caballo, club, prueba, concepto, ítem o movimiento ajenos se rechazan, también de otro evento.
- **Permisos:** el ayudante inscribe, carga, ajusta (con aviso), registra pagos y anula lo propio sin pagos. No desasigna, retira, devuelve, anula lo ajeno, marca visto ni configura. El observador no recibe alertas, avisos de edad, motivos, descripciones, nombres de origen ni estados de cuenta, y recibe 403 al copiar.
- **Inscribir:** crea el binomio si no existe y lo reutiliza si existe; rechaza la misma prueba dos veces; permite el mismo jinete en la misma prueba con otro caballo; cuota automática una sola vez por binomio; sin conceptos de binomio no carga cuota; aviso de edad `no_cumple_edad` y `edad_sin_dato` sin bloquear; idempotencia con la misma `claveCliente`.
- **Montos:** el ítem guarda la tarifa vigente; un cambio de tarifa no altera ítems existentes; un ajuste exige motivo; $0 se muestra "Becado"; no se ajusta bajo lo pagado; `monto = cantidad × precio` en cargos.
- **Estado:** pendiente, parcial, pagado, becado, anulado y retirado; "· por validar" con un pago de un movimiento por validar u observado; un pago de un movimiento anulado no cuenta.
- **Reparto:** del más antiguo al más reciente; sin superar saldos; sobrante por asignar; suma de pagos + devoluciones de sobrante ≤ monto del movimiento; dos pagos concurrentes al mismo ítem: uno se rechaza.
- **Por asignar y desasignar:** el administrador desasigna (el `Pago` queda anulado, no borrado) y reasigna; el ayudante solo corrige su reparto por validar.
- **Retiro:** bloquea con pagos por validar; sin devolución, parcial y total; retenido = pagado − devuelto; devolución posterior hasta el retenido; anular la devolución restituye el retenido.
- **Sobrante:** la devolución baja lo por asignar y no supera el disponible.
- **Cascada:** anular un ingreso anula sus pagos y el saldo vuelve; anular un gasto de devolución anula sus `Devolucion`.
- **Cambios:** cambiar prueba conserva pagos; cambiar caballo rechazado si el par existe; mover inscripción no carga cuota.
- **Indicadores:** `porCobrarInscripciones` y `totalPorAsignar` coinciden con la suma de `estadoItem` y `porAsignar` en datos de prueba.
- **Fusión:** reasigna binomios, clubes y cargos; rechaza con `ConflictoBinomios` si queda un par repetido.
- **Cambio de fechas:** `inscripcionesAfectadasPorCambioDeFecha` detecta quién deja de cumplir y quién pasa a cumplir los límites.
- **Estado de cuenta:** el texto no contiene RUT, contactos, edades, nombres de origen, motivos ni ítems de otros sujetos.

---

## 6. Elementos que quedan obsoletos

**Marco general, desviaciones declaradas.** Al aprobarse este documento, el marco sube a **v1.3** con estos cambios, y este documento pasa a ser el dueño del detalle:

- **§5, entidades:** se agregan `Prueba` (prueba del evento con tarifa y límites de edad), `Concepto` (cobro aparte de las pruebas, por binomio o por jinete o club), `Cargo` (cobro de un concepto a un binomio, jinete o club) y `Devolucion` (asignación de un gasto de devolución a una inscripción, un cargo o un ingreso con sobrante). `Inscripcion` pasa a decir "inscripción de un binomio en una `Prueba`" (la palabra "categoría" se reserva para `Categoria` de movimientos). `Pago` pasa a unir un movimiento con una inscripción **o un cargo**. Se actualiza el diagrama §5.2.
- **§6.4:** se agregan los cargos (pagados con el mismo flujo, con el mismo estado calculado); el retiro con devolución total, parcial o ninguna, y el retenido; la devolución de un sobrante; y que los pagos de un movimiento por validar ya descuentan el saldo del ítem.
- **§6.5 y §6.7:** "saldo de inscripciones no pagadas" pasa a "saldo de inscripciones y cargos no anulados". "Por asignar" se precisa como el monto de los ingresos de "Inscripciones" no asignado a ítems ni devuelto como sobrante.

**Movimientos, documento dueño actualizado** (pasa a v1.1 en el mismo commit de aprobación de este documento):

- §3.7 y §5.3: la anulación en cascada cubre también las `Devolucion` de un gasto de "Devoluciones" (5.6).
- §3.1: aviso en el formulario de ingreso cuando la categoría es la de referencia de un concepto activo (3.4).
- §5.3: se agrega la función interna `registrarMovimientoSistema` (5.6).
- §3.12, fila "Pensión o alojamiento": pasa a remitir a los cargos de este documento.

**Organización y evento:** su pendiente sobre alojamiento y pensión por noches queda resuelto (3.4), y el espacio reservado en la vista previa del cambio de fechas se llena con 3.13. No requiere cambio de texto.

**Participantes:** lo que dejó para este documento (club del binomio, gancho de fusión) queda resuelto (3.10, 3.13). No requiere cambio.

**Planillas de inscritos y cruces manuales de transferencias:** quedan redundantes cuando se carguen los binomios (a mano o con Importación desde Excel).

**Tareas:** t-002 se precisa para incluir la cuota por binomio. Se agrega t-013 (club): acordar con el club la política de devolución por retiro, es decir, hasta cuándo se devuelve y cuánto se retiene.

Código: ninguno, revisado: el repositorio solo tiene documentación.

---

## 7. Plan de acción

| # | Paso | Depende de |
|---|---|---|
| 1 | Modelos de 5.1, índices parciales y `CHECK`; migración | Participantes paso 1; Movimientos paso 1 |
| 2 | Funciones de 5.2 (`estadoItem`, `retiroItem`, `porAsignar`, `repartirMonto`, `itemsDeSujeto`, `avisoEdadPrueba`) con pruebas | 1 |
| 3 | Permisos de 5.4 y `ocultarDatosInscripcion`, con pruebas de observador y aislamiento | 1; Acceso y roles |
| 4 | Configuración de pruebas y conceptos | 3 |
| 5 | `registrarMovimientoSistema` y cascada en Movimientos (5.6) | Movimientos pasos 4 y 9 |
| 6 | `inscribir` con cuota automática, `/inscripciones/nueva` | 2, 4; Participantes pasos 5 y 6 |
| 7 | `/inscripciones` (Binomios, Por prueba, Por cobrar) y ficha del binomio | 6 |
| 8 | Registrar pago con reparto (`<RepartoPago>`) y "Registrar pago ahora" | 5, 7 |
| 9 | Por asignar, asignar, corregir reparto, desasignar; "Asignar a inscripciones" desde sin identificar | 8 |
| 10 | Ajustes, aviso "Visto" y sección en la bandeja | 7 |
| 11 | Anular ítems y binomio; retiro, devoluciones y sobrante; pestaña Retiros | 8 |
| 12 | Cargos manuales, pestaña Cargos y aviso en el formulario libre | 8 |
| 13 | Estado de cuenta y "Copiar estado de cuenta" en las fichas | 8, 12 |
| 14 | Cambiar prueba, par del binomio, mover inscripción y club del binomio | 7 |
| 15 | `reasignarPorFusion` conectada a Participantes; `inscripcionesAfectadasPorCambioDeFecha` en Configuración del evento | 6; Participantes pasos 10 y 11 |
| 16 | `porCobrarInscripciones` y `totalPorAsignar` para el Dashboard | 2 |
| 17 | Prueba en celular con un ayudante: inscribir y registrar un pago con foto en la cancha | 8 |

**Imprescindibles para el 2026-10-04:** pasos 1 a 9, 11 (anular y retiro), 16 y 17. **Recortables a v1.1 sin cambiar el modelo**, si el plazo aprieta:

- paso 12, cargos manuales (pensión y alojamiento se cobran cerca del concurso, en noviembre). La cuota automática sí va en v1.0;
- paso 13, el estado de cuenta: la ficha ya muestra los ítems con su estado; se recorta la copia;
- paso 10, el aviso "Visto": mientras tanto, los ajustes del ayudante quedan en la auditoría;
- paso 14, salvo "Cambiar prueba";
- la devolución de sobrante (parte del paso 11): mientras tanto, el sobrante queda por asignar.

### 7.1 Estado de avance de la implementación (al 2026-09-28)

- **Paso 1 (Modelos y migración):** PARCIAL. Los modelos `Prueba`, `Concepto`, `Binomio`, `Inscripcion`, `Cargo`, `Pago` y `Devolucion` están creados en `prisma/schema.prisma` y migrados a PostgreSQL en Railway desde la Fase 1. Restricciones `CHECK` e índices únicos condicionales `WHERE NOT anulado` pendientes de migración SQL específica.
- **Paso 3 (Permisos):** PARCIAL. Acciones base (`inscripciones.ver`, `inscripciones.verDatosPersonales`, `inscripciones.inscribir`, `inscripciones.ajustar`, `inscripciones.administrar`) tipadas y probadas en `src/lib/permisos.ts`. Función de servidor `ocultarDatosInscripcion` pendiente.
- **Pasos 2, 4 al 17:** PENDIENTES. Módulos de dominio (`reglas.ts`, `acciones.ts`, `consultas.ts`, `pagos.ts`, `retiros.ts`), vistas del portal (`/configuracion/pruebas`, `/inscripciones/*`), componentes UI y suite de tests `binomios.test.ts`.

---

## 8. Riesgos

| Riesgo | Tipo | Mitigación |
|---|---|---|
| Un pago de inscripción también se registra como ingreso suelto (doble conteo) | Operativo | "Inscripciones" no está en el selector libre; aviso en las categorías de referencia de los conceptos; aviso de posible duplicado (3.4, 3.6). |
| Un pago se asigna al binomio equivocado | Operativo | Reparto visible antes de guardar; desasignar y reasignar por el administrador con auditoría (3.7). |
| El ayudante registra un pago que no llegó y el ítem se ve pagado | Operativo | Marca "· por validar" y el monto aparte en por validar hasta que el administrador lo valida; si lo anula, el saldo vuelve (3.5). |
| Descuentos o becas sin control | Operativo | Motivo obligatorio, aviso "Visto" con revertir, auditoría (3.3). |
| Dinero que llega sin asignar y se olvida | Operativo | Pestaña y total de por asignar (3.7); indicador del Dashboard. |
| Retiros sin criterio común | Operativo / club | Solo el administrador; retenido y devuelto a la vista; política acordada con el club (t-013). |
| Pruebas y tarifas no definidas a tiempo (t-002) | Plazo | Todo configurable; se puede partir con pruebas provisionales y ajustar tarifas antes de inscribir. Los ítems ya creados se ajustan uno a uno si cambia la tarifa. |
| Menor inscrito en una prueba que no le corresponde por edad | Operativo / deportivo | Aviso por prueba al inscribir y en la vista previa de cambio de fechas; no bloquea (decisión de Rod). |
| Estado de cuenta compartido con datos de más | Normativo | Texto generado en el servidor con solo nombres y montos del sujeto; prueba automática (5.8). |
| Concurrencia: dos pagos o dos inscripciones a la vez | Técnico | Bloqueo de filas, índices únicos parciales, `version` y `claveCliente` (5.1, 5.2). |
| El componente no cabe al 2026-10-04 | Plazo | Recortables identificados en 7; el núcleo (inscribir, pagar, asignar, retirar) va primero. |
| Costo | Costo | Ninguno adicional: misma app, base y volumen. |

---

## 9. Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 0.1 | Primer borrador para revisión | Sesión con Rod: cobro por prueba con lista configurable; cuota fija por binomio automática; pensión y alojamiento como cargos a jinete o club; inscripción sin validación (se valida el dinero); ayudante ajusta con aviso "Visto"; pago por validar descuenta el saldo al registrarse y se muestra "Pagado · por validar"; retiro con devolución total o parcial solo por el administrador; alertas de edad sin bloquear; tarifa fija al inscribir; cambios de prueba o caballo conservan el pago; devoluciones solo por el administrador; "Copiar estado de cuenta" para cobrar; categorías libres de pensión y alojamiento solo para no inscritos |
| 2026-09-27 | 1.0 | Aprobado por Rod sin cambios de contenido. El marco general pasa a v1.3 y Movimientos a v1.1 con los cambios de la sección 6 | Aprobación |
| 2026-09-27 | 1.1 | El hijo Importación desde Excel pasa a v1.1 (§1, §2). §5.1: `importacionId` opcional en `Binomio` e `Inscripcion`. §5.3: `inscribir` acepta transacción externa, `importacionId` y `auditar: false` | Aprobación de Importación desde Excel v1.0 |
| 2026-09-27 | 1.2 | §3.12: la pestaña de `/inscripciones` se refleja en la URL (Dashboard §5.5) | Aprobación de Dashboard v1.0 |
| 2026-09-27 | 1.3 | §2: fila del Formulario de inscripción. §3.12: pestaña Por revisar. §5.3: `registrarPagoInscripciones` acepta `tx` y `respaldoExistente` | Aprobación de Formulario de inscripción v1.0 |
| 2026-09-27 | 1.4 | §3.12: la pestaña Binomios se muestra como tarjeta de dos líneas (UX/UI §3.7) | Aprobación de UX/UI v1.0 |
| 2026-09-28 | 1.5 | Se documenta el estado de avance técnico: modelos Prisma y permisos configurados previamente, detalle de módulos de dominio, pantallas y tests pendientes de ejecución | Diagnóstico de implementación Fase 6 |
