# Dashboard

Estado: Aprobado · Versión 1.0 · Responsable: Rod (Administrador) · Ejecutor: Claude Code

## 1. Índice

- **Padre:** `docs/marco-general/marco-general-proyecto.md`. Alcance dentro del padre: cálculos del dashboard (§6.7, que este documento aplica sin redefinir), alcance v1.0 ("Dashboard básico") y v1.1 ("KPIs ampliados") del §4, y métricas de visibilidad y cuadratura del §3.
- **Hijos:** ninguno.
- **Depende de:** `docs/movimientos/movimientos.md` (`filtroSumable`, pestañas del listado, bandeja de validación, `resumenPendientesDe`), `docs/inscripciones/inscripcion-binomios.md` (`estadoItem`, `porCobrarInscripciones`, `totalPorAsignar`, aviso "Visto"), `docs/inscripciones/participantes.md` (`alertasJinete`), `docs/acceso/acceso-roles.md` (`puede`, `exigir`, contador de solicitudes) y `docs/organizacion/organizacion-evento.md` (contexto, `db(ctx)`, evento vigente, categoría de sistema "Aporte inicial"). En v1.1 usa además la función de resumen de `docs/movimientos/conciliacion-cartola.md` (pendiente de documentar).
- **Secciones:**
  1. Índice
  2. Contexto y alcance
  3. Flujo operativo y experiencia
  4. Cumplimiento normativo
  5. Especificación de ejecución
  6. Elementos que quedan obsoletos y cambios a otros documentos
  7. Plan de acción
  8. Riesgos
  9. Control de cambios

---

## 2. Contexto y alcance

**Qué es.** La pantalla de inicio del portal para todos los roles. En un vistazo muestra cuánto dinero hay (en total, en el banco y en efectivo), cuánto entró y salió, qué falta cobrar y pagar, qué está por validar o por asignar y el valor de lo recibido en especie. Al administrador le avisa lo que requiere su acción. Al ayudante le muestra lo suyo pendiente. Cada número abre el listado que lo explica. En v1.1 suma el porcentaje pagado de las inscripciones, los montos por categoría, la evolución de ingresos y gastos, y el estado de la conciliación.

**Versión.** Este documento cubre las dos versiones (decisión de Rod):

| Parte | Versión | Plazo |
|---|---|---|
| Inicio por rol, indicadores del marco §6.7, saldo por medio de pago, traspasos, avisos del administrador, "Lo mío", "Copiar resumen" | v1.0 | En uso el 2026-10-04 |
| % de inscripciones pagadas, ingresos y gastos por categoría, evolución con horizonte configurable, estado de conciliación, evento cerrado | v1.1 | Objetivo 2026-11-14 |

El **saldo por medio de pago** (banco / efectivo) pasa de v1.1 a v1.0 (decisión de Rod), porque la cuadratura del efectivo en la cancha depende de él (marco §13). Exige registrar los **traspasos** entre banco y efectivo (3.4), sin los cuales el desglose no cuadra.

**Conexión con el proyecto.**

| Documento | Relación |
|---|---|
| Marco general | Dueño de las definiciones de §6.7. Este documento las muestra y no las redefine. Agrega a §6.7 las definiciones de saldo por medio de pago y de los KPIs de v1.1, a §5 la entidad `Traspaso` y a §2.2 la acción de registrar traspasos (sección 6). |
| Movimientos | Usa `filtroSumable`, las pestañas y filtros del listado (como destino de cada indicador), la bandeja `/movimientos/validar` y `resumenPendientesDe`. Precisa dos cosas: los filtros del listado se reflejan en la URL y `resumenPendientesDe` se puede pedir para el propio usuario (sección 6). |
| Inscripción de binomios | Toma "por cobrar" y "por asignar" de `porCobrarInscripciones` y `totalPorAsignar`, y el estado de cada ítem de `estadoItem`. Cuenta los avisos "Visto" pendientes. Precisa que la pestaña de `/inscripciones` se refleja en la URL. |
| Participantes | Cuenta los jinetes del evento con alerta de menor sin apoderado o sin autorización, usando `alertasJinete`. |
| Acceso y roles | Usa `puede`, `exigir` y el contador de solicitudes. Suma la acción `registrar_traspaso`. |
| Organización y evento | Usa el evento vigente, `creadoEn` y `cerradoEn` del evento, y la categoría de sistema `aporte_inicial`. |
| Pendientes (v1.1) | Es la vista consolidada de lo por cobrar y por pagar. El Dashboard solo muestra los totales y enlaza a ella cuando exista (antes, a las pestañas del listado). |
| Conciliación con cartola (v1.1) | Debe exponer `resumenConciliacion(ctx, eventoId)` (3.9.4) y considerar los traspasos por transferencia (un giro o un depósito aparece en la cartola). |
| Cierre y rendición (v1.1) | Debe incluir los traspasos en el informe y cuadrar el saldo por medio de pago. El Dashboard muestra el estado del evento (3.10). |

**Fuera de alcance.**

- Presupuesto versus real, notificaciones y alertas por correo (futuro).
- Saldo por persona: el efectivo es un solo fondo, sin importar quién lo tenga en la mano.
- Cualquier cálculo contable (devengado, impuestos) (marco §4).
- Exportar el Dashboard a planilla o PDF (lo hace Cierre y rendición en v1.1).
- Comparación entre eventos (futuro, cuando haya más de uno).

### Justificación de valor

a. **Problema que reduce o carga que elimina.** Al **administrador** le elimina armar las cuentas en una planilla para saber cuánto hay y qué falta. Abre el portal y ve la caja separada en banco y efectivo, lo por cobrar, lo por pagar y lo que espera su acción, con acceso directo a cada lista. Al **ayudante** le muestra qué movimientos suyos siguen pendientes u observados y cuánto le debe la caja, sin preguntarle al tesorero. Al **observador** le da el balance en solo lectura y un resumen copiable.

b. **Métricas del marco (§3) que mueve.** Visibilidad en tiempo real (el saldo al abrir el portal); cuadratura (saldo por medio de pago para comparar con el banco y con el efectivo contado, meta $0); rendición al tesorero (por validar siempre visible, mediana < 48 h y 0 al cierre); control de cobranza (por cobrar y, en v1.1, % pagado, para llegar al 100 % de estado conocido el día del evento).

c. **Datos o recursos nuevos.** Entidad `Traspaso` (3.4). Todo lo demás se calcula sobre datos existentes.

d. **Costo de mantención.** Cero. Consultas agregadas en la misma base; gráficos en SVG propio, sin librerías pagadas ni servicios externos.

e. **¿Se resuelve con algo existente?** En parte: el listado de Movimientos muestra totales de lo filtrado. No hay una vista única con caja, por cobrar, por pagar y por asignar juntos, ni el desglose banco / efectivo.

---

## 3. Flujo operativo y experiencia

### 3.1 Inicio por rol

Ruta `/` (inicio). Es la primera pantalla después de entrar, para los tres roles (decisión de Rod). Encabezado de Organización y evento §3.6 y la hora de cálculo: "Actualizado 15:42".

Orden de los bloques:

| Bloque | Administrador | Ayudante | Observador |
|---|---|---|---|
| 1. Botones **Gasto**, **Ingreso** y **Pago de inscripción** | Sí | Sí | No |
| 2. Avisos (3.5) | Sí | No | No |
| 3. **Lo mío** (3.6) | No | Sí | No |
| 4. Indicadores (3.2 y 3.3) | Sí | Sí | Sí |
| 5. **Copiar resumen** (3.7) | Sí | No | Sí |
| 6. **Más indicadores** (v1.1, 3.9), plegado | Sí | Sí | Sí |

- Los botones del bloque 1 llevan a `/movimientos/nuevo?tipo=gasto`, `/movimientos/nuevo?tipo=ingreso` e `/inscripciones/pago`. Están arriba y son grandes para registrar en menos de un minuto (marco §3). El botón fijo **+ Registrar** de Movimientos §5.4 se mantiene en las demás pantallas.
- Si no hay evento configurado, el inicio muestra el mensaje de Organización y evento §3.6.
- Sin datos, cada indicador muestra $0 y el inicio muestra "Todavía no hay movimientos. Registra el primero con los botones de arriba" (solo a administrador y ayudante).

### 3.2 Indicadores (v1.0)

Todas las definiciones son las del marco §6.7 (solo movimientos no anulados de naturaleza dinero, salvo "En especie"). Cada tarjeta muestra el monto en CLP con separador de miles (`$1.250.000`) y, al tocarla, abre la lista filtrada (decisión de Rod).

| Tarjeta | Contenido | Al tocar |
|---|---|---|
| **Saldo de caja** (destacada) | Saldo de caja del §6.7 y, debajo, el saldo por medio de pago (3.3). | Cada línea abre su lista (3.3). |
| **Ingresos percibidos** | Monto. Si hay movimientos de la categoría de sistema "Aporte inicial", una línea "de lo cual, aporte inicial $X" (decisión de Rod). Es un desglose: no cambia el cálculo. | `/movimientos?tipo=ingreso&estadoPago=pagado&validacion=validado`. La línea del aporte agrega `&categoriaId=…`. |
| **Gastos pagados** | Monto. | `/movimientos?tipo=gasto&estadoPago=pagado&validacion=validado`. |
| **Por cobrar** | Total y dos líneas: "Inscripciones y cargos" (`porCobrarInscripciones`) y "Otros ingresos" (ingresos pendientes validados, como auspicios comprometidos). | Cada línea: `/inscripciones?pestana=por-cobrar` y `/movimientos?pestana=por-cobrar`. |
| **Por pagar** | Total y dos líneas: "A proveedores" y "A la comisión" (reembolsos; la misma división del listado, Movimientos §3.8). | `/movimientos?pestana=por-pagar`. |
| **Resultado proyectado** | Saldo de caja + por cobrar − por pagar. Texto de ayuda: "Lo que quedaría si se cobra y se paga todo lo pendiente". | No navega. |
| **Por validar** (aparte) | Cantidad y monto de movimientos `por_validar` u `observado`. Texto: "No suma en los totales hasta que se valide". | Administrador: `/movimientos/validar`. Ayudante y observador: `/movimientos?pestana=por-validar`. |
| **Por asignar** (aparte) | Monto de `totalPorAsignar`. Se oculta si es $0. | `/inscripciones?pestana=por-asignar`. |
| **En especie** (aparte) | Suma de valores estimados y la línea "de lo cual comprometido $X" si hay especie pendiente. Texto: "No suma a la caja". Se oculta si es $0. | `/movimientos?naturaleza=especie`. |

Reglas de presentación:

- Las tarjetas "aparte" van en una fila separada y en gris, para no confundirlas con dinero disponible (marco §6.7).
- Un monto negativo (saldo o resultado proyectado) se muestra con signo menos y en rojo. No es un error: puede pasar si se pagó algo antes de recibir fondos.
- Al observador se le muestran los mismos montos; los listados de destino ya ocultan lo que no puede ver (Movimientos §3.8, Inscripción de binomios §3.12).

### 3.3 Saldo por medio de pago (v1.0)

Dentro de la tarjeta de saldo de caja:

```
Saldo de caja            $1.250.000
  Banco                  $1.000.000
  Efectivo                 $250.000
```

- **Definición** (se agrega al marco §6.7): para cada medio de pago (`transferencia` = "Banco", `efectivo`, `otro`), los ingresos percibidos con ese medio, menos los gastos pagados con ese medio, más los traspasos vigentes hacia ese medio, menos los traspasos vigentes desde ese medio. La suma de los medios es siempre igual al saldo de caja, porque un traspaso no crea ni quita dinero.
- La línea **Otro** aparece solo si su saldo es distinto de $0.
- Un saldo negativo en un medio se muestra en rojo con la ayuda "¿Falta registrar un traspaso?". Suele significar que se pagó en efectivo con dinero sacado del banco sin registrar el giro.
- Al tocar Banco: `/movimientos?medioPago=transferencia&estadoPago=pagado&validacion=validado`. Efectivo y Otro, igual con su medio. Debajo de la tarjeta, el enlace **Traspasos** abre `/traspasos`.
- **Uso para cuadrar:** el administrador compara Banco con el saldo de la cuenta y Efectivo con lo contado en la caja. Una diferencia indica un movimiento o traspaso sin registrar, o uno por validar.

### 3.4 Traspasos entre banco y efectivo (v1.0)

**Por qué existe.** Sacar $100.000 del banco para la caja chica, o depositar el efectivo recaudado el día del concurso, no es ingreso ni gasto: el dinero de la comisión es el mismo. Si no se registra, Banco queda inflado y Efectivo negativo. Por eso se agrega un registro mínimo que solo mueve el desglose.

**Registrar** (solo administrador; decisión de este documento, porque el traspaso cambia la cuadratura): botón **Nuevo traspaso** en `/traspasos` y en la tarjeta de saldo. Formulario de una columna:

| Campo | Regla |
|---|---|
| Desde | Banco, Efectivo u Otro. |
| Hacia | Distinto de "Desde". |
| Monto | Entero > 0, teclado numérico. |
| Fecha | Hoy por defecto; fecha local. |
| Comprobante | Foto o PDF (comprobante del giro o del depósito), con el mismo `<CapturaRespaldo>` de Movimientos. |
| Observación | Obligatoria si no hay comprobante (misma regla del marco §6.3). |

- Queda vigente al guardarse (lo registra un administrador), con auditoría. No pasa por validación.
- Idempotente por `claveCliente`, como los movimientos.
- **Anular:** solo administrador, con motivo. No se edita: se anula y se registra de nuevo. Nada se borra (marco §6.8).
- **Listado** `/traspasos`: fecha, desde → hacia, monto, icono de comprobante, quién lo registró y los anulados con filtro. Lo ven los tres roles. El observador no ve el comprobante ni la observación (igual que en los movimientos).
- No afecta ingresos, gastos, saldo total, por cobrar, por pagar ni resultado.
- **Evento cerrado (v1.1):** solo un administrador lo registra, marcado `posteriorAlCierre`, igual que un movimiento (marco §6.10).

### 3.5 Avisos del administrador (v1.0)

Franjas arriba de los indicadores, cada una con su contador y enlace. Solo se muestran mientras haya algo que revisar (decisión de Rod):

| Aviso | Condición | Enlace | Dueño de la regla |
|---|---|---|---|
| "Hay N solicitudes de acceso por revisar" | Solicitudes pendientes | `/usuarios` | Acceso y roles §3.3 |
| "Hay N movimientos por validar ($X)" | `por_validar` (no se cuentan los observados, que esperan al ayudante) | `/movimientos/validar` | Movimientos §3.4 |
| "Hay $X recibidos sin asignar a inscripciones" | `totalPorAsignar` > 0 | `/inscripciones?pestana=por-asignar` | Inscripción de binomios §3.7 |
| "Hay N ajustes de inscripción por revisar" | Ítems con `avisoPendiente` | `/movimientos/validar` (sección Ajustes de inscripción) | Inscripción de binomios §3.3 |
| "Hay N jinetes inscritos con alertas de menor" | Jinetes con binomio vigente en el evento y alerta `menor_sin_apoderado` o `falta_autorizacion` | `/participantes?pestana=jinetes&alertas=1` | Participantes §3.4 |

- Las franjas de solicitudes y de por validar son las mismas que ya definen Acceso y roles y Movimientos para el inicio del administrador. Este documento las ubica, no las duplica.
- Las transferencias sin identificar no tienen franja propia: están dentro de "por validar" (Movimientos §3.3).
- Orden fijo: primero lo que bloquea a otros (solicitudes, por validar), luego dinero (por asignar), luego control (ajustes, menores).

### 3.6 "Lo mío" del ayudante (v1.0)

Bloque para el ayudante, debajo de los botones (decisión de Rod):

- **Por validar:** N movimientos enviados por él por $X → `/movimientos?pestana=por-validar&mios=1`.
- **Observados:** cada uno con monto, descripción y el comentario del administrador, y el botón **Corregir** → ficha del movimiento. Se destacan en naranja: son los que el ayudante debe resolver.
- **Te deben:** reembolsos pendientes a su nombre por $X → `/movimientos?pestana=por-pagar&pagadoPor=yo`.
- Si todo está en cero: "No tienes nada pendiente".

Los datos salen de `resumenPendientesDe` de Movimientos, pedida para el propio usuario (sección 6).

### 3.7 Copiar resumen (v1.0)

Botón **Copiar resumen** para administrador y observador (decisión de Rod). Copia al portapapeles un texto para WhatsApp, solo con totales y sin nombres de personas:

```
Tesorería · Concurso de Ejemplo
Al 27-09-2026 15:42

Saldo de caja: $1.250.000
· Banco: $1.000.000
· Efectivo: $250.000
Ingresos percibidos: $2.300.000 (aporte inicial $300.000)
Gastos pagados: $1.050.000
Por cobrar: $820.000
Por pagar: $140.000
Resultado proyectado: $1.930.000

Aparte:
Por validar: 3 movimientos, $95.000
Por asignar: $30.000
En especie: $400.000
```

- El texto se arma en el servidor con los mismos valores de la pantalla. Los nombres del club y del evento son datos (marco §7, principio 5).
- Las líneas en $0 de "Aparte", la línea "Otro" y la del aporte se omiten igual que en la pantalla.
- Si el navegador no permite copiar, se muestra el texto en una hoja inferior para seleccionarlo a mano.
- No se registra en auditoría: no contiene datos personales.

### 3.8 Actualización y señal baja

- El inicio se calcula en cada visita, en el servidor, sin caché (5 usuarios; marco §7, principio 7). Los valores son los de ese momento.
- Botón **Actualizar** junto a la hora, y en el celular, deslizar hacia abajo.
- La página es liviana: solo texto y números en v1.0; los gráficos de v1.1 se cargan al desplegar "Más indicadores".
- Sin conexión, el navegador muestra la última página cargada; la hora "Actualizado" indica cuándo se calculó. El registro sin señal es de v1.1 (su propio documento).

### 3.9 Más indicadores (v1.1)

Bloque plegado al final del inicio, con cuatro secciones. Se carga al desplegarlo.

#### 3.9.1 % de inscripciones pagadas

Se mide por monto y por cantidad (decisión de Rod), sobre los ítems del evento con `estadoItem`:

| Medida | Cálculo |
|---|---|
| Por monto | Suma de `pagado` / suma de `monto` de inscripciones y cargos, excluidos los anulados y los retirados. Texto: "$1.800.000 de $2.400.000 (75 %)", con la línea "de lo cual por validar $X". |
| Por cantidad | Inscripciones (sin cargos) con estado `pagado` o `becado` / inscripciones vigentes (sin anuladas ni retiradas). Texto: "42 de 60 inscripciones (70 %)". Las que tienen la marca "· por validar" cuentan como pagadas y se indican aparte: "3 por validar". |

- Barra de progreso para cada medida. Al tocar: `/inscripciones?pestana=por-cobrar`.
- Sin inscripciones: "Todavía no hay inscripciones".

#### 3.9.2 Ingresos y gastos por categoría

Dos tablas, Ingresos y Gastos (decisión de Rod), con una fila por categoría que tenga algún monto:

| Columna | Ingresos | Gastos |
|---|---|---|
| Percibido / Pagado | Ingresos `pagado` y `validado` en dinero | Gastos `pagado` y `validado` en dinero |
| Por cobrar / Por pagar | Ingresos `pendiente` validados en dinero. En la fila de la categoría de sistema "Inscripciones" se suma `porCobrarInscripciones`. | Gastos `pendiente` validados |
| En especie | Valor estimado (solo ingresos) | — |

- Los totales de cada columna son iguales a los indicadores de 3.2 (ingresos percibidos, por cobrar, gastos pagados, por pagar, en especie). Una prueba lo verifica (5.7).
- Lo por validar no entra en las tablas. Nota al pie: "No incluye $X por validar".
- Orden: el configurado para las categorías (Organización y evento). Las categorías de sistema aparecen con su nombre vigente.
- Al tocar una fila: `/movimientos?categoriaId=…`.

#### 3.9.3 Evolución de ingresos y gastos

Gráfico de barras con ingresos y gastos por periodo (decisión de Rod), sin línea de saldo:

- **Qué se suma:** ingresos percibidos y gastos pagados (validados, en dinero), según su **fecha de pago** (cuándo se movió el dinero; Movimientos §3.5). Los traspasos no aparecen.
- **Horizonte configurable** (decisión de Rod). Opciones: **Todo el evento** (por defecto), **Últimos 30 días**, **Últimos 7 días** y **Rango** (desde y hasta).
- **"Todo el evento"** va desde la fecha de creación del evento (`Evento.creadoEn`, en fecha local) hasta la fecha de cierre (`Evento.cerradoEn`) o hasta hoy si sigue abierto (decisión de Rod). Si hay un movimiento con fecha de pago anterior a la creación (por ejemplo, un gasto de agosto registrado después), el inicio se adelanta a esa fecha para que nada quede fuera. Si hay movimientos posteriores al cierre, el fin se extiende hasta el último.
- **Agrupación automática** (decisión de Rod): por día si el horizonte tiene hasta 31 días; por semana (de lunes a domingo) si es más largo.
- Los periodos sin movimientos se muestran vacíos, sin saltarlos.
- Al tocar una barra se muestran sus montos (ingresos, gastos y neto del periodo). No navega.
- Debajo, los totales del horizonte elegido: ingresos, gastos y neto.
- La opción elegida se recuerda en la URL (`?horizonte=30d`), no en el navegador.
- SVG propio, accesible (cada barra con su texto), colores con contraste en exterior. Sin librería de gráficos.

#### 3.9.4 Estado de conciliación (solo administrador)

Aparece cuando Conciliación con cartola esté implementada (decisión de Rod):

- **Transferencias sin conciliar:** movimientos vigentes en dinero, pagados y validados, con medio `transferencia` y sin línea de cartola asociada. Cantidad y monto.
- **Líneas de cartola sin movimiento:** cantidad y monto, separadas en ingresos no registrados y cargos no registrados (marco §6.13).
- Enlace a la pantalla de conciliación.
- Los valores salen de `resumenConciliacion(ctx, eventoId)`, que define y exporta Conciliación con cartola. El Dashboard no recalcula.

### 3.10 Evento cerrado o rendido (v1.1)

- El inicio muestra una etiqueta "Evento cerrado el 30-11-2026" o "Rendido el …" junto al nombre.
- Los botones de registro se ocultan para el ayudante (solo el administrador registra después del cierre; marco §6.10).
- Los indicadores incluyen los movimientos posteriores al cierre (son dinero real). Si hay alguno, una línea bajo el saldo: "Incluye $X registrados después del cierre".
- Los avisos siguen apareciendo si hay algo pendiente (por ejemplo, por asignar).

### 3.11 Qué ve cada rol

| Elemento | Administrador | Ayudante | Observador |
|---|---|---|---|
| Botones de registro | Sí | Sí (no con evento cerrado) | No |
| Avisos | Sí | No | No |
| Lo mío | No | Sí | No |
| Indicadores de 3.2 y saldo por medio | Sí | Sí | Sí |
| Traspasos: registrar y anular | Sí | No | No |
| Traspasos: listado | Sí | Sí | Sí, sin comprobante ni observación |
| Copiar resumen | Sí | No | Sí |
| % pagadas, por categoría y evolución (v1.1) | Sí | Sí | Sí |
| Estado de conciliación (v1.1) | Sí | No | No |

### 3.12 Casos borde revisados

| Caso | Tratamiento |
|---|---|
| Pago parcial o en cuotas de una inscripción | Baja por cobrar al registrarse; en % pagadas cuenta el monto pagado, no la inscripción como pagada (3.9.1). |
| Una transferencia cubre varios binomios o la paga un club | Suma una vez a ingresos percibidos; el reparto solo mueve por cobrar (marco §6.4). |
| Transferencia sin identificar | Está en "por validar" y no suma a la caja hasta clasificarla (Movimientos §3.3). |
| Efectivo recibido en terreno sin comprobante | Suma a Efectivo al validarse; el ayudante lo ve en "Lo mío" mientras está por validar. |
| Efectivo depositado en el banco después del concurso | Traspaso Efectivo → Banco con el comprobante del depósito (3.4). |
| Giro del banco para caja chica | Traspaso Banco → Efectivo (3.4). |
| Efectivo negativo | En rojo con la ayuda "¿Falta registrar un traspaso?" (3.3). |
| Binomio que se retira con devolución | La devolución es un gasto pagado; lo retenido sigue en la caja. En % pagadas, el retirado sale del cálculo (3.9.1). |
| Auspicio en especie o canje | Solo en "En especie", nunca en caja ni resultado (marco §6.6). |
| Reembolso a un ayudante | En por pagar ("A la comisión") y en "Te deben" del ayudante (3.6). Cuando la caja paga, sale de por pagar al validarse. |
| Pendiente marcado pagado por un ayudante | Sale de por pagar y aparece en por validar; suma a caja al validarse (Movimientos §3.5). |
| Abono por validar | El compromiso completo sigue en por cobrar o por pagar y el abono aparece en por validar (Movimientos §3.5). |
| Descuento o beca | Baja el monto del ítem y con ello por cobrar; el becado cuenta como pagado en % por cantidad. El ajuste de un ayudante genera aviso (3.5). |
| Menor sin apoderado inscrito | Aviso al administrador (3.5); nunca bloquea. |
| Movimiento duplicado registrado por dos personas | Se ve dos veces hasta que se anule uno; el aviso de duplicado es de Movimientos (marco §6.9). |
| Dos traspasos iguales por doble toque | Idempotencia por `claveCliente` (5.3). |
| Movimientos después del cierre | Suman y se indican bajo el saldo (3.10). |
| Señal baja en la cancha | Página liviana, hora de cálculo visible y botón Actualizar (3.8). |
| Aporte inicial registrado | Suma a ingresos y a caja; línea "de lo cual, aporte inicial" (3.2). |
| Evento sin movimientos | Todo en $0 con mensaje de inicio (3.1). |
| Horizonte "Rango" con fecha de inicio posterior a la de fin | Se rechaza con "La fecha de inicio debe ser anterior a la de fin". |
| Rango de más de 1 año | Se agrupa por semana; no hay límite práctico para un evento. |

---

## 4. Cumplimiento normativo

Lo transversal está en el marco §9. Lo específico de este componente:

- **Normativa y vigencia** (reverificada el 2026-09-27): Ley 19.628, vigente. Ley 21.719, entra en vigencia el **2026-12-01**. El proyecto de prórroga a 2027 (Boletín 18.623-07) sigue en la Comisión de Constitución del Senado, en primer trámite, sin informe de comisión ni votación al 2026-09-24, con urgencia suma renovada el 2026-09-22. Mientras no se apruebe y publique, la fecha vigente es el 2026-12-01. El diseño la cumple desde el inicio (marco §9.1).
- **Datos personales que trata.** Solo agregados. Los únicos nombres visibles son los del propio ayudante ("Lo mío", que ya es suyo) y los de quien registró un traspaso (usuarios de la comisión, visibles para todos en `/comision`; Acceso y roles §3.6).
- **Menores.** El aviso de alertas de menores muestra solo un contador al administrador; el detalle está en Participantes, con sus restricciones.
- **Observador.** Ve montos y contadores, nunca comprobantes, observaciones, alertas ni datos personales. No ve los avisos.
- **Copiar resumen.** Solo totales, sin nombres; apto para compartir con el directorio del club.
- **Comprobantes de traspasos.** Pueden mostrar números de cuenta: se guardan y sirven con las mismas restricciones que los respaldos de movimientos (marco §9.4) y se conservan con ellos (marco §9.5).
- **Sin IA.** El Dashboard no envía datos a la API de Gemini.

---

## 5. Especificación de ejecución

Stack heredado del marco §8, sin cambios. Código en `src/dominio/dashboard/`. Toda consulta con `db(ctx)` (Organización y evento §5.2).

### 5.1 Modelo de datos (Prisma)

```prisma
model Traspaso {
  id                String     @id @default(cuid())
  organizacionId    String
  eventoId          String
  fecha             DateTime   @db.Date
  desde             MedioPago
  hacia             MedioPago
  montoClp          Int
  observacion       String?
  archivoRuta       String?    // relativa a RUTA_RESPALDOS/traspasos/…
  archivoTipoMime   String?
  claveCliente      String
  posteriorAlCierre Boolean    @default(false)
  anulado           Boolean    @default(false)
  anuladoMotivo     String?
  anuladoPorId      String?
  anuladoEn         DateTime?
  registradoPorId   String
  version           Int        @default(1)
  creadoEn          DateTime   @default(now())
  @@unique([organizacionId, claveCliente])
  @@index([organizacionId, eventoId])
  @@map("traspaso")
}
```

Restricciones `CHECK` (migración SQL):

- `monto_clp > 0`;
- `desde <> hacia`;
- `archivo_ruta IS NOT NULL OR (observacion IS NOT NULL AND length(trim(observacion)) > 0)`;
- `anulado = false OR (anulado_motivo IS NOT NULL AND anulado_por_id IS NOT NULL AND anulado_en IS NOT NULL)`.

`MedioPago` es el enum de Movimientos §5.1. No se crean tablas para los indicadores: todo se calcula.

### 5.2 Funciones de cálculo (`src/dominio/dashboard/calculos.ts`)

Todas reciben `ctx` y `eventoId`, son de solo lectura y se prueban con datos de ejemplo.

| Función | Devuelve | Base |
|---|---|---|
| `indicadores(ctx, eventoId)` | `{ ingresosPercibidos, aporteInicial, gastosPagados, saldoCaja, porCobrar: { total, inscripciones, otros }, porPagar: { total, proveedores, comision }, resultadoProyectado, porValidar: { cantidad, monto }, porAsignar, especie: { total, comprometido } }` | `filtroSumable` (Movimientos §5.2), `porCobrarInscripciones` y `totalPorAsignar` (Inscripción de binomios §5.2). Consultas agregadas en SQL (`groupBy`/`$queryRaw` con `db(ctx)`), ejecutadas en paralelo. |
| `saldoPorMedio(ctx, eventoId)` | `{ transferencia, efectivo, otro }` | Marco §6.7 (fila nueva). Traspasos no anulados. Invariante: la suma es igual a `saldoCaja`. |
| `avisosAdministrador(ctx, eventoId)` | `{ solicitudes, porValidar: { cantidad, monto }, porAsignar, ajustesPorVer, jinetesConAlertaMenor }` | Contador de solicitudes (Acceso y roles), movimientos `por_validar`, `totalPorAsignar`, ítems con `avisoPendiente`, `alertasJinete` sobre jinetes con binomio vigente en el evento. |
| `loMio(ctx, eventoId)` | `{ porValidar: { cantidad, monto }, observados: [{ id, montoClp, descripcion, comentario }], reembolsosPendientes }` | `resumenPendientesDe(ctx.usuarioId)` más el detalle de observados. |
| `textoResumen(ctx, eventoId, ahora)` | `string` | Formato de 3.7, desde `indicadores` y `saldoPorMedio`. |
| `porcentajePagado(ctx, eventoId)` (v1.1) | `{ monto: { pagado, total, porValidar }, cantidad: { pagadas, total, porValidar } }` | `estadoItem` (3.9.1). |
| `porCategoria(ctx, eventoId)` (v1.1) | `{ ingresos: Fila[], gastos: Fila[], porValidar }` | 3.9.2. |
| `rangoPorDefecto(evento, primeraFechaPago, ultimaFechaPago, hoy)` (v1.1) | `{ desde, hasta }` | 3.9.3. Función pura. |
| `agrupacion(desde, hasta)` (v1.1) | `"dia" \| "semana"` | ≤ 31 días → día. Función pura. |
| `evolucion(ctx, eventoId, { desde, hasta })` (v1.1) | `{ agrupacion, periodos: [{ inicio, ingresos, gastos }], totales }` | Por `fechaPago`, periodos vacíos incluidos. Semana ISO (lunes). |
| `resumenConciliacion(ctx, eventoId)` (v1.1) | La define Conciliación con cartola. | 3.9.4. |

Reglas:

- **Fechas:** `fechaPago` y `fecha` son `DATE` locales. `Evento.creadoEn` y `cerradoEn` son instantes UTC que se convierten a fecha America/Santiago antes de comparar (marco §6.1).
- **Montos:** enteros CLP; porcentajes redondeados al entero más cercano solo para mostrar.
- **Un solo cálculo:** la pantalla, el resumen copiable y las pruebas usan las mismas funciones. Ninguna pantalla suma por su cuenta.

### 5.3 Acciones de servidor

Todas con Zod, `obtenerContexto`, `exigir(ctx, accion)` y `exigirDeLaOrganizacion`.

| Función | Permiso | Efecto |
|---|---|---|
| `registrarTraspaso(datos, archivo?)` | `registrar_traspaso` | 3.4. Multipart. Si el evento está `cerrado`, marca `posteriorAlCierre`. Devuelve el existente si la `claveCliente` ya se usó. Auditoría en la misma transacción. |
| `anularTraspaso(id, motivo, version)` | `registrar_traspaso` | 3.4. Auditoría con antes y después. |
| `copiarResumen()` | `ver_dashboard` y rol administrador u observador | Devuelve `textoResumen`. El ayudante recibe 403. |

El archivo del traspaso se comprime en el navegador con `<CapturaRespaldo>` (Movimientos §5.4), se guarda en `RUTA_RESPALDOS/traspasos/<organizacionId>/<id>.<ext>` y se sirve por `/api/traspasos/[id]/archivo` tras `puedeVerRespaldos` y el aislamiento, igual que `/api/respaldos/[id]`.

### 5.4 Pantallas y rutas

| Ruta o componente | Rol | Contenido |
|---|---|---|
| `/` | Todos con membresía activa | Inicio de 3.1. Server Component con `dynamic = "force-dynamic"`. Solicitante → `/solicitud` (middleware de Acceso y roles). |
| `/traspasos` | Todos con membresía activa | Listado (3.4); botón **Nuevo traspaso** para administrador. |
| `/traspasos/nuevo` | Administrador | Formulario de 3.4. |
| `/api/traspasos/[id]/archivo` | Administrador y ayudante | Comprobante del traspaso. |
| `<TarjetaIndicador>` | Todos | Monto, líneas de desglose, ayuda y enlace. |
| `<FranjaAviso>` | Administrador | 3.5. |
| `<BloqueLoMio>` | Ayudante | 3.6. |
| `<BotonCopiarResumen>` | Administrador y observador | 3.7, con respaldo de hoja inferior. |
| `<MasIndicadores>` (v1.1) | Todos | Carga diferida de 3.9. |
| `<GraficoBarras>` (v1.1) | Todos | SVG propio, accesible. |

Diseño celular primero (marco §7, principio 6): una columna, montos grandes, contraste alto, objetivos táctiles de al menos 44 px, sin tablas anchas (las tablas de 3.9.2 se muestran como tarjetas en pantallas angostas).

### 5.5 Filtros de los listados en la URL

Los destinos de 3.2, 3.5 y 3.6 exigen que los listados acepten sus pestañas y filtros como parámetros de URL. Contrato mínimo:

| Listado | Parámetros |
|---|---|
| `/movimientos` | `pestana` (`todos`, `por-validar`, `observados`, `por-cobrar`, `por-pagar`, `sin-respaldo`, `sin-identificar`), `mios=1`, `tipo`, `estadoPago`, `validacion`, `medioPago`, `naturaleza`, `categoriaId`, `pagadoPor=yo` |
| `/inscripciones` | `pestana` (`binomios`, `por-prueba`, `cargos`, `por-cobrar`, `por-asignar`, `retiros`) |
| `/participantes` | `pestana`, `alertas=1` |

Cambiar un filtro en pantalla actualiza la URL. Esto se registra como precisión en Movimientos (v1.2) e Inscripción de binomios (v1.2) (sección 6). Participantes ya tiene el filtro "Con alertas"; solo se expone en la URL, como detalle de implementación.

### 5.6 Auditoría

Con `registrarAuditoria` (marco §6.8). Entidad `Traspaso`, acciones `crear` y `anular`, con antes y después. Ver el Dashboard y copiar el resumen no se auditan (sin datos personales ni cambios).

### 5.7 Pruebas (Vitest)

- **Indicadores:** con un conjunto de datos de ejemplo (ingresos y gastos pagados y pendientes, validados, por validar y observados, anulados, especie comprometida y recibida, abonos, reembolsos, pagos de inscripción repartidos, sobrante por asignar, devoluciones y aporte inicial), cada indicador coincide con el cálculo a mano del marco §6.7.
- **Invariantes:** `saldoCaja = ingresosPercibidos − gastosPagados`; `resultadoProyectado = saldoCaja + porCobrar − porPagar`; suma de `saldoPorMedio` = `saldoCaja`, con y sin traspasos y con traspasos anulados; totales de `porCategoria` = indicadores de 3.2.
- **Exclusiones:** anulados, especie y por validar no suman a caja; un abono por validar no descuenta; un pendiente marcado pagado por un ayudante sale de por pagar y entra en por validar.
- **Traspasos:** monto 0 y desde = hacia rechazados; sin comprobante ni observación rechazado; ayudante y observador reciben 403 al registrar o anular; `claveCliente` repetida devuelve el existente; con evento cerrado queda `posteriorAlCierre`.
- **Avisos:** cada contador con datos que lo activan y con cero; un menor sin apoderado sin binomio en el evento no cuenta.
- **Lo mío:** solo lo propio del ayudante; otro ayudante no ve lo ajeno.
- **Roles:** el observador no recibe avisos, "Lo mío" ni comprobantes; el ayudante recibe 403 en `copiarResumen`.
- **Aislamiento:** datos de otra organización nunca entran en ningún cálculo (prueba del marco §13).
- **v1.1:** `porcentajePagado` con becados, retirados, anulados y pagos por validar; `rangoPorDefecto` con movimientos antes de la creación y después del cierre; `agrupacion` en 31 y 32 días; `evolucion` con periodos vacíos y semanas que cruzan meses; fechas en America/Santiago sin corrimiento de un día.

---

## 6. Elementos que quedan obsoletos y cambios a otros documentos

**Obsoleto:** nada del código (no existe todavía). En el marco, la línea "saldo por medio de pago (banco / efectivo)" de v1.1 (§4) y la mitigación "en v1.1 saldo por medio de pago" (§13) quedan reemplazadas por su versión v1.0.

**Cambios aplicados en esta aprobación:**

| Documento | Cambio | Nueva versión |
|---|---|---|
| Marco general | §2.2: fila "Registrar y anular traspasos entre medios de pago" (solo administrador). §4: el saldo por medio de pago pasa a v1.0 y los KPIs ampliados de v1.1 se precisan (ingresos y gastos por categoría, evolución con horizonte configurable, estado de conciliación). §5: entidad `Traspaso`. §6.7: filas de saldo por medio de pago y de los KPIs de v1.1. §13: mitigación de cuadratura en v1.0. | 1.5 |
| Movimientos | §3.8: los filtros y pestañas del listado se reflejan en la URL (Dashboard §5.5). §5.3: `resumenPendientesDe` también se permite para el propio usuario. | 1.2 |
| Inscripción de binomios | §3.12: la pestaña de `/inscripciones` se refleja en la URL (Dashboard §5.5). | 1.2 |
| Acceso y roles | §5.4: acción `registrar_traspaso` en la tabla de permisos (solo administrador). | 1.2 |

**Para documentos pendientes:** Conciliación con cartola debe exponer `resumenConciliacion` y tratar los traspasos por transferencia; Cierre y rendición debe incluir los traspasos y el saldo por medio de pago en el informe; Pendientes (v1.1) reemplaza los destinos de "Por cobrar" y "Por pagar" cuando exista.

---

## 7. Plan de acción

| # | Paso | Versión | Depende de |
|---|---|---|---|
| 1 | Modelo `Traspaso`, migración con `CHECK` y acción `registrar_traspaso` en `permisos.ts` | v1.0 | Esqueleto (marco §12, paso 3) |
| 2 | `indicadores` y `saldoPorMedio` con pruebas de invariantes | v1.0 | 1; Movimientos (`filtroSumable`); Inscripción de binomios (`porCobrarInscripciones`, `totalPorAsignar`) |
| 3 | Inicio `/` con botones, tarjetas y enlaces | v1.0 | 2 |
| 4 | Parámetros de URL en `/movimientos`, `/inscripciones` y `/participantes` | v1.0 | Listados de cada componente |
| 5 | Traspasos: registrar, anular, listado y comprobante | v1.0 | 1 |
| 6 | Avisos del administrador | v1.0 | 2, 4 |
| 7 | "Lo mío" del ayudante | v1.0 | 2; `resumenPendientesDe` |
| 8 | Copiar resumen | v1.0 | 2 |
| 9 | Prueba en celular con datos reales | v1.0 | 3 a 8 (2026-10-04) |
| 10 | `porcentajePagado` y `porCategoria` con pruebas | v1.1 | 9 |
| 11 | `rangoPorDefecto`, `agrupacion`, `evolucion` y `<GraficoBarras>` | v1.1 | 9 |
| 12 | `<MasIndicadores>` con carga diferida | v1.1 | 10, 11 |
| 13 | Estado de conciliación | v1.1 | Conciliación con cartola implementada |
| 14 | Evento cerrado en el inicio | v1.1 | Cierre y rendición |

**Si falta tiempo para el 2026-10-04** (marco §13), se recorta en este orden, de lo último a lo primero: copiar resumen (8), "Lo mío" (7), avisos (6; las franjas de solicitudes y por validar ya las exigen sus documentos). Nunca se recortan los indicadores, el saldo por medio de pago ni los traspasos (2, 3, 5).

---

## 8. Riesgos

| Riesgo | Tipo | Mitigación |
|---|---|---|
| El Dashboard calcula distinto que el listado o la rendición | Técnico | Funciones únicas (`filtroSumable`, `estadoItem`, 5.2) y pruebas de invariantes (5.7). |
| El desglose banco / efectivo no cuadra porque no se registran los giros o depósitos | Operativo | Traspasos (3.4); saldo negativo en rojo con ayuda (3.3); revisar la cuadratura cada semana y el día del concurso. |
| Se confunde "por validar" o "en especie" con dinero disponible | Experiencia | Tarjetas aparte en gris con texto de ayuda (3.2). |
| Resultado proyectado leído como dinero seguro | Experiencia | Texto de ayuda "Lo que quedaría si se cobra y se paga todo lo pendiente". |
| El ayudante tarda en registrar porque el inicio es largo | Experiencia | Botones de registro arriba y botón fijo **+ Registrar** (3.1). |
| Carga lenta con señal baja | Experiencia | Solo texto en v1.0, gráficos diferidos, hora de cálculo visible (3.8). |
| Resumen copiado con datos desactualizados | Operativo | Lleva fecha y hora de cálculo. |
| Comprobante de traspaso con datos bancarios visible al observador | Normativo | Servido solo tras `puedeVerRespaldos` (5.3). |
| La conciliación se retrasa y el bloque 3.9.4 queda vacío | Plazo | El bloque solo aparece cuando la conciliación existe; el resto de v1.1 no depende de ella. |
| Sobrediseño | Costo | Sin caché, sin librería de gráficos, sin tablas nuevas de indicadores (marco §7, principio 7). |

---

## 9. Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 1.0 | Documento aprobado sin borrador previo, por pedido de Rod | Sesión con Rod: el documento cubre v1.0 y v1.1; el Dashboard es el inicio para todos, con botones de registro para administrador y ayudante; el saldo por medio de pago pasa a v1.0, con traspasos entre banco y efectivo solo por el administrador; cada indicador abre su lista filtrada; línea "de lo cual, aporte inicial"; bloque "Lo mío" del ayudante; avisos de por asignar, ajustes por ver y alertas de menores para el administrador; "Copiar resumen" para administrador y observador; % pagadas por monto y por cantidad; ingresos y gastos por categoría; evolución de ingresos y gastos con horizonte configurable (por defecto, desde la creación del evento hasta su cierre) y agrupación automática; estado de conciliación para el administrador |
