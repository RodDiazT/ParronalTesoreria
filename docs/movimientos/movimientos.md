# Movimientos

Estado: Aprobado · Versión 1.0 · Responsable: Rod (Administrador) · Ejecutor: Claude Code

## 1. Índice

- **Padre:** `docs/marco-general/marco-general-proyecto.md`. Alcance dentro del padre: `Movimiento` y `Respaldo` (§5, §5.1), validación (§6.2), respaldo u observación (§6.3), por cobrar, por pagar y reembolsos (§6.5), auspicios en especie (§6.6), anulación y pantalla de auditoría (§6.8), duplicados y concurrencia (§6.9).
- **Hijos:** `docs/movimientos/movimientos/registro-sin-senal.md` (v1.1): borrador local en el teléfono y cola de envío.
- **Depende de:** `docs/organizacion/organizacion-evento.md` (contexto, `db(ctx)`, `exigirDeLaOrganizacion`, selectores de categoría y contraparte, evento vigente) y `docs/acceso/acceso-roles.md` (`puede`, `exigir`, `esPropio`, `exigirNoPropio`, `resumenPendientesDe`).
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

**Qué es.** El libro de la tesorería. Cada ingreso y cada gasto del evento se registra una vez, desde el celular, con su foto o PDF de respaldo o con una observación que explica por qué no lo tiene. Lo que registra un ayudante queda por validar hasta que un administrador lo revisa. Los compromisos (proveedores a crédito, auspicios prometidos, reembolsos a ayudantes) se registran como pendientes y se marcan pagados cuando el dinero se mueve, completos o por abonos. Nada se borra: se anula con motivo y queda en la auditoría, que este componente muestra.

**Versión:** v1.0 (en uso al 2026-10-04). El registro sin señal es su hijo, en v1.1.

**Conexión con el proyecto.**

| Documento | Relación |
|---|---|
| Marco general | Dueño de los atributos principales del movimiento (§5.1), las reglas §6.2 a §6.9 y los cálculos del dashboard (§6.7). Este documento los aplica y precisa (ver 6, precisiones). |
| Organización y evento | Entrega el evento vigente, `<SelectorCategoria>`, `<SelectorContraparte>` y la fusión de contrapartes. Este documento resuelve lo que le dejó pendiente: contraparte obligatoria (3.2) y validación de fechas (3.2). Agrega a ese documento la marca "Exige contraparte" en `Categoria` (Organización y evento v1.2). |
| Acceso y roles | Entrega la matriz de permisos y las funciones auxiliares. Este documento implementa `resumenPendientesDe` (advertencia al revocar un ayudante) y es dueño de la pantalla de auditoría, donde también se ven las acciones de acceso. |
| Inscripción de binomios | Dueño del `Pago`, de los flujos de pago de inscripción (categoría de sistema "Inscripciones") y de devolución ("Devoluciones"), y de lo "por asignar" de inscripciones. Usa de aquí el registro de ingresos, los respaldos, la validación, la anulación en cascada (3.7) y la clasificación de ingresos sin identificar (3.3). |
| Dashboard | Calcula los indicadores del marco §6.7 sobre los movimientos definidos aquí. No los redefine. |
| Registro sin señal (v1.1) | Reutiliza el formulario y la clave de idempotencia (`claveCliente`, 5.2) para enviar la cola sin duplicar. |
| Conciliación con cartola (v1.1) | Usa `nombreOrigen`, `fechaPago` y `medioPago`, y agrega el enlace a la línea de cartola. |
| Pendientes (v1.1) | Vista consolidada de lo por cobrar y por pagar que aquí se registra. En v1.0 basta con las pestañas del listado (3.8). |
| Cierre y rendición (v1.1) | Cierra el evento y aplica `posteriorAlCierre`. En v1.0 el campo existe y queda en `false`. |

**Fuera de alcance.**

- Flujos de pago y devolución de inscripciones, asignación de pagos y lo por asignar de inscripciones (Inscripción de binomios).
- Registro sin señal (v1.1, hijo).
- Conciliación con cartola, vista consolidada de pendientes, cierre y movimientos posteriores al cierre (v1.1).
- Indicadores y gráficos (Dashboard).
- Presupuesto versus real y notificaciones (futuro).
- Pagar o cobrar de verdad: el portal registra, no mueve dinero (marco §4).
- Validación en lote: se valida de a uno, mirando el respaldo (decisión de Rod).

### Justificación de valor

a. **Problema que reduce o carga que elimina.** Al **ayudante** le elimina guardar boletas en el bolsillo y avisar por mensajes sueltos: registra el gasto con foto en la cancha en menos de un minuto y, si pagó de su bolsillo, queda constancia de que se le debe. Al **administrador** le elimina reconstruir las cuentas al final: ve cada peso con su respaldo, valida o devuelve con un comentario, sabe qué se debe y qué falta cobrar, y tiene la auditoría para rendir.

b. **Métricas del marco (§3) que mueve.** Trazabilidad total (100 % con respaldo u observación; 0 borrados); rendición al tesorero (mediana de validación < 48 h; 0 por validar al cierre); visibilidad en tiempo real (registro con foto < 1 minuto); cuadratura ($0 de diferencia, con fecha y medio de pago de cada peso).

c. **Datos o recursos nuevos.** Respecto del marco §5.1 se agregan `fechaPago` (la caja y la conciliación necesitan cuándo se movió el dinero, distinto de cuándo ocurrió el gasto), `descripcion` (qué se compró, pedido por Rod para la lista y la rendición), `sinIdentificar`, `abonoDeId`, `enviadoAValidarPorId` y `claveCliente` (técnicos, 5.2). En `Categoria`, la marca `exigeContraparte`. Archivos de respaldo en el volumen de Railway, ya previsto (marco §8).

d. **Costo de mantención.** Cero adicional. Misma app, base y volumen. El volumen esperado sigue bajo 1 GB por la compresión en el teléfono.

e. **¿Se resuelve con algo existente?** No. Es el núcleo del portal; hoy solo hay planillas sueltas.

---

## 3. Flujo operativo y experiencia

### 3.1 Registrar un movimiento (ayudante o administrador, desde el celular)

Botón fijo **+ Registrar** en todas las pantallas para quien puede registrar. Primero se elige **Gasto** o **Ingreso** (dos botones grandes). El formulario muestra primero lo imprescindible y pliega lo opcional:

| Campo | Regla |
|---|---|
| Monto | Obligatorio. Entero en CLP, de 1 a 999.999.999, con separador de miles al escribir y teclado numérico. |
| Categoría | Obligatoria, con `<SelectorCategoria tipo>` (Organización y evento §3.4). Excepción: ingreso sin identificar (3.3). |
| Respaldo | Botón **Tomar foto** (abre la cámara) y **Subir archivo** (foto o PDF), varios por movimiento. O la casilla **Sin respaldo**, que exige observación (marco §6.3). |
| ¿Ya se pagó? | **Pagado** (por defecto) o **Pendiente**. En ingresos se lee "¿Ya se recibió?". |
| Fecha | Cuándo ocurrió (la compra, el compromiso, la venta). Por defecto, hoy. |
| Fecha de pago | Solo si está pagado: cuándo se movió el dinero. Por defecto, igual a la fecha. |
| Medio de pago | Solo si está pagado y es en dinero: transferencia, efectivo u otro. Se preselecciona el último que usó esa persona. |
| Contraparte | `<SelectorContraparte tipoMovimiento>` con creación en línea. Obligatoria según 3.2. |
| Nombre de origen | Solo ingresos: titular de la transferencia o quien entregó el efectivo. Obligatorio en ingresos por transferencia; opcional en efectivo u otro. Se prellena con el nombre de la contraparte, si la hay. |
| Pagado por | Solo gastos: **La caja** (por defecto) o **Yo, de mi bolsillo**. El administrador puede elegir además a cualquier miembro activo de la comisión. Ver 3.5. |
| Descripción | Opcional, hasta 140 caracteres ("Pintura vallas pista 2"). |
| Observación | Opcional, hasta 500 caracteres. Obligatoria con **Sin respaldo**. |
| Naturaleza | Solo ingresos, plegado: **Dinero** (por defecto) o **En especie**. Ver 3.6. |

Al tocar **Guardar**:

1. Se valida el formulario en el teléfono y en el servidor (Zod compartido).
2. **Aviso de posible duplicado** (marco §6.9): si hay otro movimiento no anulado del evento con igual tipo, monto, fecha ±1 día y misma contraparte o categoría, se muestran hasta tres con su foto en miniatura: "¿Ya está registrado?". **Es otro, guardar igual** o **Cancelar**. No bloquea.
3. Datos y archivos viajan **juntos** en una sola solicitud. Si falla (mala señal), el formulario conserva todo lo escrito y las fotos ya comprimidas, muestra "No se pudo guardar. Revisa la señal." y el botón **Reintentar**. Nada queda guardado a medias: nunca existe un movimiento cuya foto quedó en el camino (decisión de Rod). Si el teléfono cierra la página, se pierde el borrador; guardarlo en el teléfono es del registro sin señal (v1.1).
4. **Sin duplicar al reintentar:** cada formulario abierto genera una `claveCliente` única. Si la primera solicitud llegó al servidor pero la respuesta se perdió, el reintento con la misma clave devuelve el movimiento ya creado en vez de crear otro.
5. Resultado según quién registra (marco §6.2):
   - **ayudante** → `por_validar`, mensaje "Registrado. Queda por validar.";
   - **administrador** → `validado` al registrarse, con la marca de autovalidado en la auditoría.
6. Vuelve al inicio con el movimiento recién creado arriba y la opción **Registrar otro**.

**Fotos:** se comprimen en el teléfono antes de subir (máx. ~1600 px por lado, JPEG ~0,8). Las fotos HEIC se convierten a JPEG en el teléfono cuando el navegador puede leerlas (Safari en iPhone); si no puede, se pide "Toma la foto con la cámara desde el portal". Los PDF no se comprimen. Máximo 10 MB por archivo después de comprimir (marco §6.3).

### 3.2 Reglas de validez del registro

**Contraparte obligatoria** (decisión de Rod; resuelve lo pendiente de Organización y evento §2):

- en todo movimiento **pendiente**, porque hay que saber a quién cobrar o pagar; excepción: un gasto pagado por un miembro de la comisión (reembolso), donde la deuda es con esa persona y la contraparte es opcional;
- en toda categoría con la marca **Exige contraparte** (el script la deja activa en "Auspicios"; el administrador la cambia en Configuración → Categorías), en dinero o en especie;
- en el resto, opcional (por ejemplo, una compra en efectivo en el almacén).

**Fechas** (decisión de Rod; resuelve lo pendiente de Organización y evento §2):

- **Fecha de pago:** nunca futura. Obligatoria si el movimiento está pagado. No puede ser anterior a la fecha en más de 365 días (evita errores de año).
- **Fecha:** en un movimiento pagado no puede ser futura ni posterior a la fecha de pago. En uno pendiente puede ser futura (fecha comprometida, por ejemplo "el auspiciador paga el 15-nov").
- Sin límite hacia atrás: un gasto de pintura tres semanas antes del concurso se registra con su fecha real (las fechas del evento son informativas, Organización y evento §3.2).

**Otras reglas:**

- `pagadoPor` solo en gastos. Si es una persona, el gasto nace **pendiente** (3.5).
- Medio de pago solo si está pagado y es en dinero.
- Las categorías de sistema "Inscripciones" y "Devoluciones" no se ofrecen en el formulario (Organización y evento §3.4). Sus movimientos se crean y se editan desde los flujos de Inscripción de binomios; en la ficha se ven con un enlace a la inscripción.
- Solo se registra en el evento vigente y con el evento `abierto` (Organización y evento §3.6). Con el evento cerrado, todo es de solo lectura en v1.0.
- Toda referencia (categoría, contraparte, `pagadoPor`, movimiento de origen de un abono) se valida con `exigirDeLaOrganizacion` antes de guardar.

### 3.3 Ingreso sin identificar

Caso: llega una transferencia de $45.000 y nadie sabe si es una inscripción, un auspicio o un error.

1. En el formulario de ingreso, junto a la categoría, el botón **No sé de qué es**. El movimiento se guarda sin categoría, marcado **sin identificar**. Se exige `nombreOrigen` (si es transferencia) y se recomienda la foto del comprobante o de la notificación del banco.
2. Queda `por_validar` aunque lo registre un administrador, y se muestra en la pestaña **Sin identificar**. No suma a la caja (marco §6.7: solo cuentan los validados); aparece en "por validar".
3. Un administrador lo **clasifica**: elige la categoría y, si corresponde, la contraparte; o, cuando exista el flujo, lo **asigna a inscripciones** (Inscripción de binomios, que le pone la categoría "Inscripciones" y crea los `Pago`). Recién clasificado se puede validar.
4. Si resulta ser un error del banco o una devolución a un tercero, se anula con motivo.

La validación rechaza un movimiento sin categoría.

### 3.4 Validar u observar (administrador)

**Aviso dentro del portal:** el menú muestra **Validar · N** y el inicio del administrador una franja "Hay N movimientos por validar ($ total)", mientras haya alguno.

**Bandeja** `/movimientos/validar`, de a uno (decisión de Rod), del más antiguo al más reciente:

- el respaldo en grande (foto con zoom, PDF en visor), con flechas si hay varios;
- los datos del movimiento, quién lo envió a validar y cuándo;
- avisos destacados: **Sin respaldo** (con la observación), **Posible duplicado** (con enlace), **Sin identificar**, **Categoría o contraparte desactivada**, **Marcado pagado por un ayudante** o **Abono**;
- botones **Validar**, **Observar**, **Editar** y **Anular**, y **Anterior / Siguiente** para saltar.

| Acción | Regla |
|---|---|
| Validar | Pasa a `validado`; guarda quién y cuándo. Nunca sobre lo que el mismo administrador envió a validar (`exigirNoPropio`, 5.3). Rechaza si no tiene categoría. |
| Observar | Comentario obligatorio (hasta 300 caracteres), por ejemplo "La boleta no se lee, sube otra foto". Pasa a `observado` y vuelve a quien lo envió. |
| Editar y validar | El administrador corrige (por ejemplo, cambia la categoría desactivada o el monto) y valida en un paso. La auditoría guarda el antes y el después. |
| Anular | Ver 3.7. |

**Observados** (decisión de Rod): quien lo envió ve el comentario en la pestaña **Observados** y en la ficha; corrige y toca **Reenviar**, y vuelve a `por_validar`. Si no responde, el administrador puede corregirlo él mismo (queda `validado`, en auditoría) o anularlo. Nadie más edita un movimiento observado ajeno (marco §2.2).

**Respaldos nuevos en movimientos validados:** la bandeja tiene una segunda sección, **Respaldos nuevos**, con los archivos que un ayudante agregó a un movimiento ya validado (3.9). El administrador los mira y toca **Visto**. No cambian la validación del movimiento.

### 3.5 Pendientes, pagos, abonos y reembolsos

**Pendientes** (marco §6.5):

| Caso | Registro |
|---|---|
| Proveedor que cobrará después | Gasto pendiente con su contraparte. Es por pagar. |
| Auspicio comprometido, no recibido | Ingreso pendiente con su contraparte. Es por cobrar. |
| Gasto pagado por un ayudante de su bolsillo | Gasto con **Pagado por: Yo**. Nace pendiente: es por pagar a esa persona. La boleta de la compra es su respaldo (o sin respaldo con observación). |

**Marcar pagado** (en la ficha y en las pestañas Por cobrar y Por pagar): botón **Marcar pagado** (en ingresos, **Marcar recibido**), que pide:

- **monto** (por defecto, el total pendiente);
- **fecha de pago** (por defecto, hoy);
- **medio de pago**;
- **comprobante**, opcional (la transferencia al proveedor o el reembolso al ayudante).

Según el monto:

- **Pago total** (monto igual al pendiente): el mismo movimiento pasa a `pagado` con esa fecha y medio. Si lo marca un **ayudante**, el movimiento completo vuelve a `por_validar` (decisión de Rod): sale de "por pagar" y aparece en "por validar" hasta que un administrador lo valida, y recién ahí suma a caja. Si lo marca un administrador, queda validado.
- **Abono** (monto menor): se crea un movimiento nuevo **pagado**, enlazado al original (`abonoDeId`), con el mismo tipo, categoría, contraparte y `pagadoPor`, y con el monto del abono (decisión de Rod). El original sigue pendiente. **El abono se descuenta del original al validarse** (decisión de Rod): mientras está `por_validar`, el compromiso completo sigue en por cobrar o por pagar y el abono se ve en "por validar"; al validarlo, el monto del original baja en lo abonado (auditoría con antes y después). Si lo registra un administrador, se valida y se descuenta al instante.
- Monto mayor que el pendiente: se rechaza.

Reglas del abono:

- Mientras un original tiene un abono por validar, no admite otro pago: se muestra "Tiene un abono por validar". Con 5 usuarios esto casi no ocurre y evita que dos pagos simultáneos superen el saldo.
- El **último pago** (monto igual al saldo vigente) no es un abono: es el pago total del mismo original, que queda `pagado` por el saldo. Así el dinero se cuenta una vez: abonos + pago final = compromiso inicial.
- La ficha del original muestra el compromiso inicial (`montoOriginalClp`), los abonos (validados y por validar) y el saldo.
- Anular un abono validado devuelve su monto al original (3.7).

**Reembolsos:** se usan los mismos botones. Al marcar pagado un reembolso, el comprobante es la transferencia o constancia de entrega del efectivo al ayudante. Un ayudante puede marcar pagado su propio reembolso (por ejemplo, si el tesorero le pasó efectivo y él lo registra); igual lo valida un administrador.

**Deshacer un "pagado" equivocado:** un administrador edita el movimiento y lo vuelve a pendiente; queda en auditoría.

### 3.6 Auspicios en especie o canje

- Solo en ingresos, con **Naturaleza: En especie**. El monto es el **valor estimado**, con la ayuda "Valor aproximado de lo recibido".
- Contraparte obligatoria. Sin medio de pago ni nombre de origen.
- Puede quedar **pendiente** (comprometido, por ejemplo premios que llegan la semana del concurso) o **recibido** (se reutiliza `estadoPago`: `pendiente` = comprometido, `pagado` = recibido, con fecha de recepción en `fechaPago`). Decisión de Rod.
- Nunca suma a caja, por cobrar, por pagar ni resultado; se muestra aparte (marco §6.6 y §6.7). Un comprometido en especie tampoco suma a por cobrar.
- Un canje (el auspiciador entrega premios a cambio de publicidad) es un solo ingreso en especie. Si además hubo dinero, son dos movimientos.

### 3.7 Anular

| Quién | Qué puede anular |
|---|---|
| Administrador | Cualquier movimiento no anulado. |
| Ayudante | Solo los que registró él y siguen `por_validar` sin haber sido validados nunca (marco §2.2). |

- Motivo obligatorio (hasta 300 caracteres). El movimiento queda visible, tachado, con motivo, quién y cuándo, y deja de sumar en todo cálculo (marco §6.8).
- **Con pagos de inscripción** (decisión de Rod): se listan las inscripciones que quedarían con saldo y, al confirmar, se anulan en la misma transacción el movimiento y sus `Pago`, cada uno en auditoría. El `Pago` y su anulación los define Inscripción de binomios; aquí se fija la cascada.
- **Abono validado:** su monto vuelve al saldo del original, con auditoría en ambos. Si el original ya está pagado (se pagó el saldo final), primero un administrador lo devuelve a pendiente; hasta entonces la anulación del abono se rechaza con ese aviso.
- **Original con abonos:** se avisa "Tiene N abonos que se mantienen". Anular el original solo anula el saldo pendiente; los abonos son dinero real y siguen vigentes hasta que se anulen uno por uno.
- No se desanula. Si fue un error, se registra de nuevo.

### 3.8 Listado y ficha

**Listado** `/movimientos`, con tarjetas para el celular (fecha, monto con signo visual, categoría, contraparte o descripción, iconos de respaldo, estado de pago y de validación) y pestañas rápidas (decisión de Rod):

| Pestaña | Contenido |
|---|---|
| Todos | Todo lo no anulado, del más reciente al más antiguo por fecha. |
| Por validar | `por_validar`. Para el ayudante, además el filtro "Míos". |
| Observados | `observado`. El ayudante ve primero los suyos. |
| Por cobrar | Ingresos en dinero pendientes y validados, con saldo. |
| Por pagar | Gastos pendientes y validados, incluidos reembolsos, agrupados "A proveedores" y "A la comisión". |
| Sin respaldo | Marcados sin respaldo, con su observación. |
| Sin identificar | Ingresos sin categoría (3.3). |

Filtros combinables: tipo, categoría, contraparte, medio de pago, rango de fechas, quién registró, naturaleza y "mostrar anulados". Arriba, los totales de lo filtrado: ingresos, gastos y neto en dinero validado, y aparte el monto por validar y el valor en especie. Las definiciones de esos totales son las del marco §6.7; el tablero completo es del Dashboard.

**Ficha** `/movimientos/[id]`: todos los datos, los respaldos (miniaturas que abren en grande), el estado de validación con el último comentario, los abonos si los hay, el enlace a la inscripción si es de sistema, los botones según permisos y la **línea de tiempo** de auditoría (3.10).

**Qué ve cada rol** (complementa marco §2.2):

| | Administrador | Ayudante | Observador |
|---|---|---|---|
| Listado y ficha | Sí | Sí, todos los movimientos | Sí |
| Archivos de respaldo | Sí | Sí | **No**: solo ve que existen y cuántos |
| Nombre de origen y observaciones | Sí | Sí | **No** (pueden tener datos de terceros; decisión de Rod) |
| Contacto y RUT de la contraparte | Sí | Sí | No (Organización y evento §3.5) |
| Descripción, categoría, contraparte, montos, estados | Sí | Sí | Sí |
| Línea de tiempo de auditoría | Sí | Solo de movimientos que registró | No |

Lo oculto al observador se quita en el servidor, nunca solo en la interfaz.

### 3.9 Respaldos después de registrar

- Cualquier administrador o ayudante puede **agregar** respaldos a un movimiento no anulado, en cualquier estado (decisión de Rod). Caso típico: la boleta aparece después. Si el movimiento estaba marcado sin respaldo, la marca se quita sola al agregar el primer archivo (la observación se conserva).
- Si un ayudante agrega un respaldo a un movimiento **validado**, la validación no cambia: el archivo queda marcado **nuevo** para que un administrador lo vea (3.4), y en auditoría.
- **Anular un respaldo** (subido por error, foto de otra cosa): el administrador, siempre; el ayudante, solo en movimientos suyos por validar u observados. Motivo obligatorio. El archivo se conserva en el volumen y deja de mostrarse salvo en la auditoría. Si era el único, el movimiento debe quedar con otro respaldo o pasar a sin respaldo con observación en la misma acción.

### 3.10 Auditoría (pantalla)

Este componente es dueño de la pantalla de auditoría (Acceso y roles §2).

- **Línea de tiempo en la ficha:** quién hizo qué y cuándo (registrar, autovalidar, observar con comentario, reenviar, editar con antes y después, marcar pagado, abonar, agregar o anular respaldo, validar, anular con motivo, fusión de contraparte que lo reasignó).
- **Pantalla general** `/auditoria`, solo administradores (decisión de Rod): todos los `RegistroAuditoria` de la organización, del más reciente al más antiguo, con filtros por usuario, acción, entidad y rango de fechas. Incluye las acciones de acceso y de configuración. Cada fila abre el detalle con antes y después y un enlace al registro afectado.
- El ayudante ve la línea de tiempo solo de los movimientos que registró (marco §2.2). El observador no ve auditoría.
- La auditoría no se edita ni se borra desde ninguna pantalla (marco §6.8).

### 3.11 Edición y concurrencia

| Quién | Qué puede editar |
|---|---|
| Ayudante | Movimientos que él envió a validar, mientras estén `por_validar` u `observado`. Editar un observado lo reenvía. |
| Administrador | Cualquier movimiento no anulado, incluidos los validados; queda en auditoría con antes y después (marco §6.2). Si edita uno por validar de un ayudante, puede validarlo en el mismo paso. |

- **No se cambian** el tipo (ingreso o gasto) ni la naturaleza (dinero o especie): se anula y se registra de nuevo.
- Movimientos de sistema ("Inscripciones", "Devoluciones"): el monto y las asignaciones se editan desde Inscripción de binomios.
- Cada edición envía `version`; si otro la cambió antes, se muestra el aviso del marco §6.9 y se recarga (la fusión de contrapartes también sube la versión).

### 3.12 Casos borde revisados

| Caso | Tratamiento |
|---|---|
| Pago parcial de un auspicio o proveedor | Abono enlazado, descontado al validarse (3.5). |
| Transferencia que cubre varios binomios o la paga un club | Flujo de pago de Inscripción de binomios: un movimiento y varios `Pago` (marco §6.4). |
| Transferencia sin identificar | Ingreso sin categoría, por validar hasta clasificarlo (3.3). |
| Efectivo recibido en terreno sin comprobante | Sin respaldo con observación obligatoria; destacado al validar (3.4). |
| Binomio que se retira y pide devolución | Flujo de devolución de Inscripción de binomios; aquí solo la categoría de sistema oculta en el formulario (3.2). |
| Auspicio en especie o canje | Ingreso en especie, puede quedar comprometido; nunca suma a caja (3.6). |
| Gasto pagado por un ayudante (reembolso) | Pagado por "Yo", nace por pagar a esa persona; se marca pagado al devolverle (3.5). |
| Gasto observado por el administrador | Vuelve a quien lo envió; lo corrige y reenvía, o el administrador lo corrige o anula (3.4). |
| Pensión o alojamiento por varios días con tarifa distinta | Si se cobra en la inscripción, lo define Inscripción de binomios. Si es un ingreso suelto, un movimiento por pago con la descripción de las noches. |
| Descuentos, becas o invitados | Se definen en la inscripción; no generan movimiento porque no hay dinero. |
| Mismo gasto registrado por dos personas | Aviso de duplicado al guardar (3.1); si igual pasa, el administrador anula uno al validar. |
| Reintento tras una respuesta perdida | `claveCliente` devuelve el ya creado (3.1). |
| Dos personas editan a la vez | Control por `version` (3.11). |
| Mala señal en la cancha | Fotos comprimidas, envío único con reintento y sin duplicar (3.1); sin señal del todo, v1.1. |
| La boleta aparece después | Se agrega el respaldo; si estaba validado, queda marcado nuevo para el administrador (3.9). |
| Ayudante marca pagado un reembolso a sí mismo | Permitido; lo valida un administrador (3.5). |
| Administrador marcó pagado por error | Lo edita y lo vuelve a pendiente, en auditoría (3.5). |
| Categoría o contraparte desactivada en un movimiento por validar | Aviso en la bandeja; el administrador la cambia al validar o valida igual (Organización y evento §3.7). |
| Se revoca a un ayudante con movimientos abiertos | `resumenPendientesDe` alimenta la advertencia de Acceso y roles §3.5 (5.3). |
| Fecha de pago futura o de hace más de un año | Rechazada (3.2). |
| Gasto de pintura anterior al concurso | Se registra con su fecha real (3.2). |
| Movimientos después del cierre | v1.1 (Cierre y rendición); en v1.0 el evento está abierto. |
| Anular un ingreso con pagos de inscripción | Cascada con aviso de las inscripciones afectadas (3.7). |
| Formulario manipulado con ids de otra organización | Rechazado por `exigirDeLaOrganizacion` (3.2). |
| Archivo que dice ser foto y no lo es | Tipo verificado por contenido en el servidor (5.5). |

---

## 4. Cumplimiento normativo

Aplica: el componente guarda nombres de terceros (`nombreOrigen`, contrapartes), textos libres que pueden contener datos personales, y archivos de respaldo con datos financieros de terceros (nombre, banco y número de cuenta en comprobantes de transferencia). Además alimenta una rendición a un tercero (el club). Lo transversal está en el marco §9; aquí solo lo específico.

- **Normativa y vigencia** (reverificada el 2026-09-27): Ley 19.628, vigente. Ley 21.719, entra en vigencia el **2026-12-01**. El proyecto de prórroga a 2027 (Boletín 18.623-07) ingresó al Senado el 2026-09-01 con urgencia suma y seguía en primer trámite constitucional, sin informe de comisión ni votación, a la última revisión disponible (2026-09-08). La fecha legal no cambia mientras no se apruebe y publique. El diseño la cumple desde el inicio (marco §9.1).
- **Datos regulados en este componente:** `nombreOrigen`; observaciones y descripciones libres; archivos de respaldo; `pagadoPor` (qué miembro de la comisión pagó y se le debe).
- **Base de licitud:** ejecución de la relación de inscripción, auspicio o compra, y necesidad de respaldar la tesorería ante el club (marco §9.2). Para los miembros de la comisión, el consentimiento dado al ingresar (Acceso y roles §3.1).
- **Medidas específicas:**
  - el observador no recibe archivos de respaldo, `nombreOrigen` ni observaciones (tampoco en la API ni en los totales exportables);
  - los archivos se sirven solo por la app tras verificar permiso, con `Cache-Control: private, no-store`, nunca por URL pública ni desde una carpeta estática;
  - tipo de archivo verificado por contenido, sin SVG ni HTML;
  - el formulario no pide RUT, número de cuenta ni banco del titular: basta el nombre; el comprobante puede traerlos y por eso su acceso es restringido;
  - la ayuda del campo observación dice "No escribas números de cuenta ni RUT";
  - todas las consultas pasan por `db(ctx)` y toda referencia por `exigirDeLaOrganizacion`.
- **Derechos de los titulares:** el administrador busca por nombre de origen o contraparte en el listado (acceso), corrige editando (rectificación) y, antes de plazo, puede anular un respaldo con datos de terceros que no sea necesario (supresión parcial). El registro del movimiento se conserva por trazabilidad (marco §9.6).
- **Trazabilidad y conservación:** toda acción queda en `RegistroAuditoria` (5.6). Al vencer el plazo del marco §9.5, se eliminan los archivos de respaldo con datos de terceros y se conserva el libro (montos, fechas, categorías, nombres); esa eliminación es futura y usará la ruta de archivos de 5.5 para ubicarlos.

---

## 5. Especificación de ejecución

Stack heredado del marco §8, sin cambios. Nombres de entidad del marco §5. Columnas en `snake_case` con `@map`.

### 5.1 Modelo de datos (Prisma)

```prisma
enum TipoMovimiento { ingreso gasto }
enum NaturalezaMovimiento { dinero especie }
enum MedioPago { transferencia efectivo otro }
enum EstadoPago { pagado pendiente }
enum EstadoValidacion { por_validar validado observado }

model Movimiento {
  id                     String               @id @default(cuid())
  organizacionId         String
  eventoId               String
  tipo                   TipoMovimiento
  naturaleza             NaturalezaMovimiento @default(dinero)
  montoClp               Int                  // > 0; en un pendiente con abonos, el saldo vigente
  montoOriginalClp       Int                  // monto al registrar; no cambia con abonos
  fecha                  DateTime             @db.Date   // cuándo ocurrió
  fechaPago              DateTime?            @db.Date   // cuándo se movió el dinero
  medioPago              MedioPago?
  estadoPago             EstadoPago
  categoriaId            String?              // null solo si sinIdentificar
  sinIdentificar         Boolean              @default(false)
  contraparteId          String?
  pagadoPorId            String?              // Usuario; null = la caja. Solo gastos
  nombreOrigen           String?              // solo ingresos
  descripcion            String?              // hasta 140
  observacion            String?              // hasta 500
  sinRespaldo            Boolean              @default(false)
  estadoValidacion       EstadoValidacion
  enviadoAValidarPorId   String?              // quien lo dejó por validar (registró, corrigió o marcó pagado)
  validadoPorId          String?
  validadoEn             DateTime?
  comentarioObservacion  String?              // último comentario al observar
  abonoDeId              String?              // movimiento original, si es un abono
  anulado                Boolean              @default(false)
  motivoAnulacion        String?
  anuladoPorId           String?
  anuladoEn              DateTime?
  posteriorAlCierre      Boolean              @default(false) // lo usa Cierre y rendición (v1.1)
  conciliado             Boolean              @default(false) // Conciliación (v1.1) agrega la línea
  claveCliente           String               // idempotencia del formulario
  registradoPorId        String
  version                Int                  @default(1)
  creadoEn               DateTime             @default(now())
  actualizadoEn          DateTime             @updatedAt
  respaldos              Respaldo[]
  @@unique([organizacionId, claveCliente])
  @@index([organizacionId, eventoId, estadoValidacion])
  @@index([organizacionId, eventoId, tipo, estadoPago])
  @@index([organizacionId, eventoId, fecha])
  @@index([abonoDeId])
}

model Respaldo {
  id                String    @id @default(cuid())
  organizacionId    String
  movimientoId      String
  ruta              String    // relativa a RUTA_RESPALDOS
  tipoMime          String    // image/jpeg | image/png | application/pdf
  bytes             Int
  esComprobantePago Boolean   @default(false) // subido al marcar pagado
  subidoPorId       String
  esNuevo           Boolean   @default(false)  // agregado por ayudante a un validado
  vistoPorId        String?
  vistoEn           DateTime?
  anulado           Boolean   @default(false)
  motivoAnulacion   String?
  anuladoPorId      String?
  anuladoEn         DateTime?
  creadoEn          DateTime  @default(now())
  @@index([organizacionId, movimientoId])
}
```

**Cambio en `Categoria`** (dueño: Organización y evento v1.2, §3.4 y §5.1): `exigeContraparte Boolean @default(false)`; el script de carga la deja en `true` para "Auspicios"; editable por el administrador en Configuración → Categorías.

**Restricciones por migración SQL** (`CHECK`):

- `monto_clp > 0 AND monto_original_clp >= monto_clp`;
- `estado_pago <> 'pagado' OR fecha_pago IS NOT NULL`;
- `naturaleza <> 'dinero' OR estado_pago <> 'pagado' OR medio_pago IS NOT NULL`;
- `naturaleza <> 'especie' OR (tipo = 'ingreso' AND medio_pago IS NULL)`;
- `pagado_por_id IS NULL OR tipo = 'gasto'`;
- `nombre_origen IS NULL OR tipo = 'ingreso'`;
- `categoria_id IS NOT NULL OR (sin_identificar AND tipo = 'ingreso')`;
- `estado_validacion <> 'validado' OR categoria_id IS NOT NULL`;
- `NOT sin_respaldo OR observacion IS NOT NULL`;
- `NOT anulado OR (motivo_anulacion IS NOT NULL AND anulado_por_id IS NOT NULL)`.

La regla "al menos un respaldo no anulado o `sinRespaldo`" no cabe en un `CHECK`: la verifica el servidor en cada acción que crea, edita o anula respaldos, dentro de la misma transacción.

### 5.2 Reglas de código

- **Montos:** enteros; el signo lo da `tipo`. Zod: `z.number().int().min(1).max(999_999_999)`.
- **Fechas:** `DATE` manejadas como `AAAA-MM-DD` (Organización y evento §5.1). "Hoy" se calcula en America/Santiago en el servidor.
- **Contraparte obligatoria:** `requiereContraparte(mov, categoria) = (mov.estadoPago === "pendiente" && mov.pagadoPorId == null) || categoria?.exigeContraparte`.
- **`claveCliente`:** UUID generado al abrir el formulario. `registrarMovimiento` hace `findUnique` por `(organizacionId, claveCliente)`; si existe y lo registró el mismo usuario, lo devuelve sin crear otro.
- **Autovalidación:** si `puede(ctx, "validar")` y el movimiento no es sin identificar, nace `validado` con `validadoPorId = usuario`, y la auditoría `crear` lleva `autovalidado: true`.
- **`enviadoAValidarPorId`:** se escribe cada vez que un movimiento pasa a `por_validar` (registrar, reenviar, marcar pagado, abonar). Es el "propio" para editar un por validar u observado y para `exigirNoPropio` al validar (Acceso y roles §5.4, que compara el registro; aquí se le pasa este campo).
- **Marcar pagado:** en una transacción con bloqueo del original (`SELECT … FOR UPDATE`). Rechaza si el original tiene un abono `por_validar` no anulado. Monto igual a `montoClp` → pago total del mismo movimiento. Monto menor → crea el abono (`abonoDeId`). Monto mayor → rechazo.
- **Abono al validar:** en la misma transacción que valida, con bloqueo del original: verifica `abono.montoClp < original.montoClp`, resta, sube `version` del original y registra `aplicar_abono`. Nunca deja el original en 0, porque el último pago es un pago total (3.5).
- **Anular un abono validado:** si el original está `pendiente`, le suma el monto; si está `pagado`, rechaza (3.7).
- **Cálculos:** una sola función `filtroSumable(ctx)` (no anulado y `naturaleza = dinero`) que usan el listado y el Dashboard, con las definiciones del marco §6.7 sin redefinirlas. Como el original solo guarda el saldo, abonos y original nunca suman dos veces.
- **Ocultar al observador:** `ocultarDatosMovimiento(ctx, mov)` quita `nombreOrigen`, `observacion`, `comentarioObservacion` y las rutas de respaldos (deja la cantidad), y aplica `ocultarDatosPersonales` a la contraparte.

### 5.3 Acciones de servidor (`src/dominio/movimientos/`)

Todas con Zod, `obtenerContexto`, `exigir(ctx, accion)`, `exigirDeLaOrganizacion` para referencias, `version` en las ediciones, evento `abierto` y auditoría en la misma transacción.

| Función | Permiso (Acceso y roles §5.4) | Efecto |
|---|---|---|
| `registrarMovimiento(datos, archivos)` | `registrar` | 3.1, 3.2, 3.3. Multipart. Devuelve el existente si la `claveCliente` ya se usó. |
| `buscarPosiblesDuplicados(datos)` | `registrar` | Marco §6.9, hasta 3 candidatos. |
| `editarMovimiento(id, cambios, version)` | `editar_propio_no_validado` (con `esPropio` sobre `enviadoAValidarPorId`) o `editar_validado` | 3.11. Si el ayudante edita un observado, pasa a `por_validar`. |
| `reenviarMovimiento(id, version)` | `editar_propio_no_validado` | `observado` → `por_validar`. |
| `validarMovimiento(id, version, cambios?)` | `validar` + `exigirNoPropio` | 3.4; aplica el abono si corresponde. |
| `observarMovimiento(id, comentario, version)` | `validar` + `exigirNoPropio` | 3.4. |
| `clasificarMovimiento(id, categoriaId, contraparteId?, version)` | `validar` | 3.3. |
| `marcarPagado(id, { montoClp, fechaPago, medioPago, archivo? }, version)` | `marcar_pendiente_pagado` | 3.5: total o abono. |
| `anularMovimiento(id, motivo, version)` | `anular`, o `anular_propio_por_validar` con `esPropio` sobre `registradoPorId` y sin `validadoEn` | 3.7, con cascada a `Pago` cuando exista el modelo. |
| `agregarRespaldo(movimientoId, archivo)` | `registrar` | 3.9. |
| `anularRespaldo(respaldoId, motivo, reemplazo?)` | `anular`, o dueño en por validar u observado | 3.9. |
| `marcarRespaldoVisto(respaldoId)` | `validar` | 3.4. |
| `resumenPendientesDe(usuarioId)` | `gestionar_accesos` | Implementa la función de Acceso y roles §5.3: por validar u observados enviados por esa persona, y reembolsos pendientes a su nombre. |

Consultas: `listarMovimientos(filtros)`, `obtenerMovimiento(id)`, `bandejaPorValidar()`, `contadorPorValidar()`, `lineaDeTiempo(entidad, id)` y `listarAuditoria(filtros)` (esta última, `ver_auditoria`).

### 5.4 Pantallas y componentes

| Ruta o componente | Rol | Contenido |
|---|---|---|
| Botón **+ Registrar** | Administrador y ayudante | Fijo abajo a la derecha, en todas las pantallas. |
| `/movimientos/nuevo?tipo=gasto\|ingreso` | Administrador y ayudante | Formulario de 3.1, una columna, botones grandes, campos opcionales plegados. |
| `/movimientos` | Todos con membresía activa | Listado con pestañas, filtros y totales (3.8). |
| `/movimientos/[id]` | Todos (con lo oculto al observador) | Ficha, respaldos, abonos, acciones y línea de tiempo (3.8, 3.10). |
| `/movimientos/validar` | Administrador | Bandeja de a uno y respaldos nuevos (3.4). |
| `/auditoria` | Administrador | Pantalla general con filtros (3.10). |
| `/api/respaldos/[id]` | Administrador y ayudante | Sirve el archivo tras `puedeVerRespaldos` y aislamiento. |
| `<CapturaRespaldo>` | Administrador y ayudante | Cámara o archivo, compresión, conversión HEIC y vista previa. |
| Menú e inicio | Administrador | Contador **Validar · N** y franja de por validar (3.4). |

Diseño celular primero (marco §7, principio 6): contraste alto para exterior, objetivos táctiles de al menos 44 px, teclado numérico en montos, sin tablas anchas.

### 5.5 Archivos de respaldo

- Ruta: `RUTA_RESPALDOS/movimientos/<organizacionId>/<movimientoId>/<respaldoId>.<ext>`.
- Tipos aceptados por contenido (bytes iniciales): JPEG, PNG y PDF. HEIC se convierte en el teléfono (3.1); el servidor lo rechaza si llega. Máximo 10 MB.
- Compresión en el navegador con `canvas` (sin librerías pagadas): lado mayor 1600 px, JPEG calidad 0,8, orientación EXIF aplicada; se descartan los metadatos EXIF (ubicación).
- Escritura atómica: el archivo se escribe con nombre temporal y se renombra al confirmar la transacción; si la transacción falla, se borra el temporal. Un proceso al iniciar la app limpia temporales de más de un día.
- Respuesta con `Content-Type` guardado, `Content-Disposition: inline`, `Cache-Control: private, no-store` y `X-Content-Type-Options: nosniff`.

### 5.6 Auditoría

Se usa `registrarAuditoria(ctx, …)` del esqueleto (marco §6.8) con `entidad = "Movimiento"` o `"Respaldo"`. Acciones: `crear` (con `autovalidado`), `modificar`, `validar`, `observar`, `reenviar`, `clasificar`, `marcar_pagado`, `registrar_abono`, `aplicar_abono`, `anular` (con la lista de `Pago` anulados en cascada), `agregar_respaldo`, `anular_respaldo`, `marcar_visto`. El detalle guarda antes y después de los campos cambiados, sin copiar el contenido de los archivos.

### 5.7 Pruebas (Vitest)

- **Aislamiento:** con dos organizaciones, ningún usuario lee, cuenta, crea ni modifica movimientos o respaldos de la otra, ni descarga sus archivos; ids de categoría, contraparte o usuario de otra organización se rechazan.
- **Permisos por rol:** cada acción de 5.3 con administrador, ayudante, observador y solicitante según la matriz; el ayudante no valida, no observa, no edita validados ni anula ajenos; nadie valida lo que envió él.
- **Observador:** nunca recibe `nombreOrigen`, observaciones, comentarios ni archivos.
- **Validez:** montos fuera de rango, fecha de pago futura, pagado sin fecha de pago o sin medio, especie en un gasto, `pagadoPor` en un ingreso, sin respaldo sin observación, contraparte faltante en pendientes y en categorías que la exigen, y categorías de sistema en el formulario: todo rechazado.
- **Flujo de validación:** ayudante → `por_validar`; administrador → `validado` con `autovalidado`; observar exige comentario; editar un observado lo reenvía; sin identificar no se valida sin categoría.
- **Marcar pagado:** total por ayudante vuelve a `por_validar` y sale de por pagar; abono por ayudante no descuenta hasta validarse; con un abono por validar, un segundo pago se rechaza; el pago final del saldo deja la suma de abonos + original igual al compromiso inicial; anular un abono validado restituye el saldo y se rechaza si el original ya está pagado.
- **Especie:** no suma en `filtroSumable`, ni pendiente ni recibida.
- **Idempotencia:** dos envíos con la misma `claveCliente` crean un solo movimiento y un solo juego de archivos.
- **Duplicados:** el aviso aparece con igual tipo, monto, fecha ±1 día y categoría o contraparte, y no aparece con anulados.
- **Concurrencia:** `version` desactualizada se rechaza; dos "marcar pagado" simultáneos sobre el mismo original: uno se rechaza.
- **Anulación:** motivo obligatorio; el anulado no suma; cascada a pagos (se completa al existir `Pago`).
- **Respaldos:** tipo falso rechazado; anular el único respaldo exige reemplazo u observación; respaldo agregado por ayudante a un validado queda `esNuevo`.
- **`resumenPendientesDe`:** devuelve los conteos correctos.

---

## 6. Elementos que quedan obsoletos

- **Planillas de gastos, boletas guardadas en sobres y avisos de gastos por mensajería:** reemplazados por el registro con respaldo y la validación.
- **Organización y evento §2, pendientes para Movimientos** (contraparte obligatoria y validación de la fecha): quedan resueltos en 3.2.
- **Organización y evento §5.1, modelo `Categoria`:** se le agrega `exigeContraparte` (y el script la activa en "Auspicios"). **Documento dueño actualizado:** Organización y evento pasa a v1.2 en el mismo commit de aprobación de este documento.
- **Acceso y roles §5.3, `resumenPendientesDe` "devuelve ceros mientras Movimientos no exista":** queda implementada aquí (5.3). No cambia ese documento.
- Código: ninguno, revisado: el repositorio solo tiene documentación.

**Precisiones sobre el marco §5.1, sin cambiar sus reglas:**

- `fecha` se precisa como "cuándo ocurrió" y se agrega `fechaPago` ("cuándo se movió el dinero").
- Se agregan `descripcion`, `sinIdentificar`, `abonoDeId`, `montoOriginalClp`, `enviadoAValidarPorId` y `claveCliente`.
- En un pendiente con abonos, `montoClp` es el saldo vigente y `montoOriginalClp` el compromiso inicial.
- La categoría puede quedar vacía **solo** en un ingreso sin identificar, que no se puede validar sin ella.

El marco lista "atributos principales" y estas son precisiones compatibles que no cambian sus reglas ni sus cálculos. Por eso el marco no se marca para revisión.

---

## 7. Plan de acción

| # | Paso | Depende de |
|---|---|---|
| 1 | Modelos `Movimiento` y `Respaldo`, `exigeContraparte` en `Categoria`, migración con los `CHECK` | Esqueleto técnico; Organización y evento §7 pasos 1 a 7; Acceso y roles §7 paso 4 |
| 2 | Esquemas Zod compartidos y reglas de validez (3.2) con pruebas | 1 |
| 3 | `<CapturaRespaldo>` (cámara, compresión, HEIC) y almacenamiento atómico en el volumen; `/api/respaldos/[id]` | 1 |
| 4 | `registrarMovimiento` con idempotencia, aviso de duplicado, autovalidación y formulario `/movimientos/nuevo` | 2, 3 |
| 5 | Listado con pestañas, filtros y totales; ficha | 4 |
| 6 | Bandeja de validación, observar, reenviar, editar, contador en el menú | 5 |
| 7 | Ingreso sin identificar y clasificar | 6 |
| 8 | Marcar pagado total y abonos | 6 |
| 9 | Anular movimiento y respaldos; agregar respaldos después; respaldos nuevos | 6 |
| 10 | Línea de tiempo en la ficha y `/auditoria` | 5 |
| 11 | `resumenPendientesDe` y conexión con la advertencia de Acceso y roles | 6 |
| 12 | Cascada a `Pago` al anular | Inscripción de binomios implementado |
| 13 | Prueba en celular con un ayudante: registrar un gasto con foto en menos de un minuto | 4 |

Imprescindibles para el 2026-10-04: pasos 1 a 9 y 13. Si el plazo aprieta, la pantalla general `/auditoria` (parte del paso 10) pasa a v1.1: la línea de tiempo en la ficha cubre la trazabilidad diaria. Los abonos (parte del paso 8) pueden recortarse a v1.1 registrando el pago parcial a mano (el administrador reduce el pendiente y registra un pagado), sin cambiar el modelo.

---

## 8. Riesgos

| Riesgo | Tipo | Mitigación |
|---|---|---|
| Registrar con foto toma más de un minuto en la cancha | Experiencia | Campos opcionales plegados, valores por defecto, compresión en el teléfono, botón fijo; prueba cronometrada (7, paso 13). |
| Mala señal: se pierde el registro o se duplica | Técnico / experiencia | Envío único con reintento que conserva el formulario; `claveCliente` idempotente; registro sin señal en v1.1. |
| Doble conteo de un pendiente pagado por abonos | Operativo | El original guarda solo el saldo; el último pago es un pago total; descuento al validar con bloqueo; pruebas (5.7). |
| El ayudante marca pagado algo que no se pagó | Operativo | Vuelve a por validar y no suma a caja hasta que un administrador lo valida. |
| Movimientos quedan sin validar | Operativo | Contador y franja en el menú e inicio; bandeja de a uno; dos administradores. |
| Transferencias sin identificar que se olvidan | Operativo | Pestaña propia, no suman a caja y no se validan sin clasificar. |
| Datos de terceros en respaldos vistos por quien no debe | Normativo | Observador sin archivos, `nombreOrigen` ni observaciones, filtrado en el servidor; archivos fuera de rutas públicas; EXIF descartado. |
| Archivo malicioso subido como respaldo | Técnico | Tipo por contenido, solo JPEG, PNG y PDF, `nosniff`, sin ejecución. |
| Volumen de Railway se llena o se pierde | Técnico / costo | Compresión (~200 a 400 KB por foto); copias según tarea t-007. |
| Anular un pago de inscripción descuadra el estado de inscripciones | Operativo | Cascada en transacción con aviso de las inscripciones afectadas (3.7). |
| El alcance no cabe al 2026-10-04 | Plazo | Recortables identificados: `/auditoria` general y abonos (7). |
| Costo | Costo | Ninguno adicional: misma app, base y volumen. |

---

## 9. Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 0.1 | Primer borrador para revisión | Sesión con Rod: contraparte obligatoria en pendientes (salvo reembolsos) y en categorías marcadas; guardado con foto en un solo envío con reintento; marcar pagado por un ayudante vuelve a por validar; abonos enlazados que se descuentan al validarse; fechas de hecho y de pago; validación de a uno; especie comprometida o recibida; respaldos agregables en cualquier estado; auditoría por movimiento y general; listado con pestañas; nombre de origen obligatorio en transferencias; el administrador corrige observados; ingreso sin identificar; anulación en cascada; descripción corta; observador sin nombre de origen ni observaciones |
| 2026-09-27 | 1.0 | Aprobado por Rod sin cambios de contenido; Organización y evento pasa a v1.2 con la marca `exigeContraparte` | Aprobación |
