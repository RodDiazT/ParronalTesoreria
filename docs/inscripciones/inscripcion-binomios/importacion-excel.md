# Importación desde Excel

Estado: Aprobado · Versión 1.0 · Responsable: Rod (Administrador) · Ejecutor: Claude Code

## 1. Índice

- **Padre:** `docs/inscripciones/inscripcion-binomios.md`. Alcance dentro del padre: la carga masiva de binomios e inscripciones, con los jinetes, apoderados, caballos y clubes que requieren, desde una planilla, usando `inscribir` (padre §5.3). Aplica la regla del marco §6.12, de la que este documento es el detalle.
- **Hijos:** ninguno.
- **Depende de:** `docs/inscripciones/participantes.md` (datos de cada entidad, `buscarParecidos`, `edadEnEvento`, `alertasJinete`, `normalizarTelefono`, funciones de creación). Además usa `docs/organizacion/organizacion-evento.md` (contexto, evento vigente, `db(ctx)`, `exigirDeLaOrganizacion`, `normalizarNombre`, `validarRut`, `registrarAuditoria`) y `docs/acceso/acceso-roles.md` (acción `importar_excel` de la tabla única de permisos).
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

**Qué es.** La forma de cargar de una vez los binomios inscritos que lleguen en planillas, en vez de inscribirlos uno a uno. Tiene dos partes:

1. **Plantilla descargable.** El portal genera una planilla Excel con el formato correcto y las pruebas del evento, lista para enviarla a las otras comisiones o clubes para que la completen.
2. **Importar una planilla.** El administrador sube la plantilla completa **o cualquier otra planilla**. El portal reconoce su propia plantilla solo. Para cualquier otro formato, la IA propone qué columna es cada dato y el administrador lo confirma, o lo elige a mano. Antes de guardar hay una vista previa con lo nuevo, lo que ya existe, lo que se parece a algo existente, los errores y las advertencias. Nada se guarda sin confirmación.

La importación crea o vincula clubes, jinetes, apoderados, caballos, binomios e inscripciones, con la cuota automática por binomio, igual que al inscribir a mano. **No crea pagos ni movimientos** (marco §6.12). Si la planilla dice quién pagó, eso queda como una lista de pagos informados para registrar después, cada uno con su respaldo.

**Versión:** **v1.1** (objetivo 2026-11-14, límite 2026-11-21). Decisión de Rod: todavía no hay inscritos que cargar y el mapeo de columnas con IA es más trabajo, así que sale del núcleo del 2026-10-04. Es una desviación del marco §4 y §12, declarada en la sección 6. Mientras no esté implementada, los binomios se inscriben a mano (Inscripción de binomios §3.2).

**Pendiente del club:** todavía no se sabe cómo llegarán las inscripciones de las otras comisiones o clubes (tarea t-014). Por eso el portal acepta cualquier formato y además ofrece una plantilla propia para estandarizar.

**Conexión con el proyecto.**

| Documento | Relación |
|---|---|
| Marco general | Dueño de §6.12 (que este documento amplía) y de §6.13, §8 y §9.4 para la IA. Al aprobarse este documento, el marco sube a **v1.4** (sección 6): la importación pasa a v1.1, acepta cualquier formato con mapeo asistido por IA, la IA del proyecto pasa a ser la **API de Gemini de pago** (también para la conciliación) y el §9.4 autoriza a Google como encargado para este uso. |
| Inscripción de binomios (padre) | Usa `inscribir` (§5.3) para crear binomios, inscripciones y la cuota automática, y el índice único de binomio en prueba para detectar "Ya inscrito". Los ítems conservan la tarifa vigente (§3.1). Pasa a **v1.1**: `inscribir` acepta una transacción externa, y `Binomio` e `Inscripcion` guardan la importación que los creó (sección 6). |
| Participantes | Usa las reglas de datos de §3.1, las alertas de §3.4 (no bloquean), el aviso de parecidos de §3.5 con `buscarParecidos`, y el bloqueo por RUT repetido. Las creaciones pasan por las mismas funciones y validaciones. |
| Organización y evento | Evento vigente `abierto`, `normalizarNombre`, `validarRut`, `db(ctx)`, `exigirDeLaOrganizacion`, `registrarAuditoria`. |
| Acceso y roles | Acción `importar_excel`, solo para el administrador (marco §2.2). El aviso de privacidad pasa a **v1.1** para mencionar al proveedor de IA como encargado (sección 6). |
| Movimientos | Sin dependencia directa: la importación no crea movimientos. Los pagos informados se registran después con el flujo de Inscripción de binomios §3.6. |
| Conciliación con cartola (v1.1) | Usará la misma capa de IA (5.5) con Gemini. |
| Formulario de inscripción (v1.1) | Es la otra vía de entrada. Comparte la resolución de duplicados de 3.6. |

**Fuera de alcance.**

- Crear pagos, movimientos o respaldos de pago desde la planilla (marco §6.12).
- Crear pruebas o conceptos desde la planilla: se configuran antes (Inscripción de binomios §3.1).
- Cargos manuales (pensión, alojamiento): se agregan desde la ficha del jinete o del club.
- Registrar la autorización del apoderado de menores de 14 años: se registra a mano en la ficha, con su fecha (Participantes §3.4).
- Sincronizar con la planilla: una segunda importación solo agrega lo nuevo. No da de baja ni modifica inscripciones existentes.
- Editar celdas dentro de la vista previa: si una fila tiene un error, se corrige la planilla y se vuelve a subir, o se inscribe a mano.
- Formato `.xls` antiguo, Google Sheets en línea y archivos `.ods`: se pide guardar como `.xlsx` o `.csv`.
- Importar movimientos o cartolas (Conciliación con cartola, v1.1).

### Justificación de valor

a. **Problema que reduce o carga que elimina.** Al **administrador** le evita tipear uno por uno los binomios que lleguen en planillas de otras comisiones (decenas de filas, cada una con jinete, caballo, club y pruebas), con el riesgo de duplicar jinetes o equivocarse de prueba. La vista previa le muestra de una vez qué es nuevo, qué ya existía y qué falta (menores sin apoderado, fechas de nacimiento, pagos informados). La plantilla le da un formato común para pedir las inscripciones. El **ayudante** no importa, pero se beneficia: encuentra los binomios ya cargados al registrar pagos en la cancha.

b. **Métricas del marco (§3) que mueve.** Control de cobranza (todas las inscripciones con estado de pago conocido antes del evento, porque entran al portal apenas llega la planilla); cuadratura (sin jinetes ni binomios duplicados que partan los saldos); trazabilidad (cada importación queda en auditoría con su archivo original).

c. **Datos o recursos nuevos.** Una entidad `Importacion` con el archivo original, el mapeo y el resumen (desviación declarada frente al marco §5, sección 6). No se piden datos personales nuevos: solo los de Participantes §3.1. Recurso nuevo: la **API de Gemini de pago** (clave `GEMINI_API_KEY`, tarea t-015), necesaria para reconocer planillas de formato libre. Sin ella, el mapeo se hace a mano y la plantilla se reconoce igual.

d. **Costo de mantención.** Infraestructura: cero, porque usa la misma app, base y volumen. IA: pago por uso de Gemini. Cada importación envía los encabezados y hasta 20 filas: del orden de miles de tokens, es decir, fracciones de centavo de dólar por planilla con un modelo Flash. Con una alerta de presupuesto de USD 5 en Google Cloud (t-015), queda dentro de la meta del marco §3. Rompe el "costo incremental cero" del principio 8 solo en esa excepción, que el marco ya admitía para la IA.

e. **¿Se resuelve con algo existente?** No. Inscribir a mano (Inscripción de binomios §3.2) sirve para casos sueltos, pero no para planillas de decenas de filas, y no detecta duplicados entre la planilla y lo existente de una vez. Un script asistido (el plan B del marco §13) no sirve para planillas que lleguen de a poco y de distintas comisiones.

---

## 3. Flujo operativo y experiencia

Escala esperada: planillas de **1 a 100 filas**, pocas importaciones en total (una por comisión o club que envíe su lista). Límites técnicos: 5 MB por archivo, 1.000 filas y 60 columnas.

**Quién:** solo el **administrador** (acción `importar_excel`, marco §2.2). El ayudante y el observador no ven el menú ni las rutas (403 en el servidor). Solo con el evento vigente `abierto` y con al menos una prueba activa.

**Pantalla:** `/inscripciones/importar`, con cuatro pasos visibles: **Archivo → Columnas → Vista previa → Resultado**. Está pensada para el computador (tablas), pero funciona en el celular con tarjetas.

### 3.1 Plantilla descargable

Botón **Descargar plantilla** en `/inscripciones/importar` y en la pestaña Binomios de `/inscripciones`. Genera en el servidor un `.xlsx` con el nombre `Inscripcion <nombre del evento>.xlsx`, desde las pruebas activas del evento vigente. **No contiene datos personales**, así que se puede enviar libremente.

**Hoja "Inscripciones"** (una fila por binomio; los encabezados van en la fila 1 y se congelan):

| Columna | Obligatoria | Formato y ayuda (nota en la celda del encabezado) |
|---|---|---|
| Club | Sí | Club o sociedad que representa el binomio en este evento. |
| Jinete / amazona | Sí | Nombre completo. |
| Fecha de nacimiento | No | `dd-mm-aaaa`. Sirve para las pruebas por edad. |
| RUT jinete | No | Con o sin puntos, con guion. |
| Contacto jinete | No | Teléfono o correo. En menores puede ser el del apoderado. |
| Caballo | Sí | Nombre del caballo. |
| Club del caballo | No | Solo si es distinto del club del binomio. |
| Una columna por cada prueba activa, con su nombre | Al menos una marcada | Se marca con **X** la prueba en que corre el binomio. |
| Apoderado 1: nombre, teléfono, relación | Solo menores | Relación: Madre, Padre, Tutor legal, Otro familiar u Otro (lista desplegable). |
| Apoderado 2: nombre, teléfono, relación | No | Igual que el anterior. |
| Pago informado | No | Monto que la comisión informa como pagado. **No registra el pago**: sirve para la lista de pagos por registrar (3.8). |
| Observaciones | No | No se importa. Se muestra en la vista previa para que la lea el administrador. |

- Si un jinete corre con dos caballos, va en dos filas (son dos binomios).
- Las columnas de pruebas van en el orden configurado. La celda de la tarifa no se incluye, para que la tarifa la ponga siempre el portal (3.7).
- Relación con lista desplegable. Fecha con formato de celda de fecha.

**Hoja "Instrucciones":** cómo completarla, la lista de pruebas con tarifa y límites de edad, la fecha de referencia de edad del evento, qué hacer con menores (apoderado obligatorio y, en menores de 14, autorización del apoderado que la comisión debe pedir y guardar, t-012) y el **texto breve de privacidad** para quien entrega los datos (marco §9.6; sección 4).

**Marca de plantilla:** una hoja oculta `_portal` guarda el identificador del formato (`plantilla-inscripcion`, versión 1) y el `eventoId`, más la lista de pruebas con su id. Así el portal la reconoce sin IA, aunque cambien los nombres de las pruebas.

### 3.2 Subir el archivo (paso "Archivo")

1. **Elegir archivo**: `.xlsx` o `.csv`, hasta 5 MB. Un `.xls`, `.ods` u otro formato se rechaza con el mensaje "Guárdalo como .xlsx o .csv y vuelve a subirlo".
2. El servidor lee el archivo (5.3) y crea una `Importacion` en estado `en_revision`, con el archivo guardado en el volumen (5.2). Si el libro tiene varias hojas, se elige cuál importar; por defecto, la primera hoja visible con datos (o "Inscripciones" si es la plantilla).
3. **Archivo repetido:** si el mismo archivo (mismo `sha256`) ya se importó en este evento, aviso "Este archivo ya se importó el <fecha>. Lo ya inscrito saldrá como «Ya inscrito»". No bloquea.
4. En CSV se detecta el separador (`;` o `,`) y la codificación (UTF-8 o Latin-1).

Una importación en revisión se puede retomar desde el historial (3.10). Si no se confirma en **7 días**, vence: su archivo se elimina y queda solo la línea en el historial (minimización, sección 4). También se puede **Descartar** en cualquier paso.

### 3.3 Reconocer el formato y las columnas (paso "Columnas")

El portal busca el mapeo en este orden y se queda con el primero que encuentra:

| Origen | Cuándo | Qué hace |
|---|---|---|
| **Plantilla** | La hoja `_portal` existe y es de este evento | Mapeo directo, sin IA. Si la plantilla es de otro evento, se trata como planilla libre y se avisa. |
| **Importación anterior** | Los encabezados son idénticos a los de una importación confirmada antes | Reutiliza ese mapeo y esas equivalencias. |
| **IA** | La IA está habilitada (5.5) | Propone el mapeo completo (3.4). |
| **Manual** | Ninguno de los anteriores, o la IA falló | Propone solo lo que reconoce por el nombre del encabezado ("Jinete", "Amazona", "Caballo", "Club", "F. Nac.", etc.) y el resto queda por elegir. |

**Qué se mapea:**

- **Fila de encabezados** (por defecto, la primera fila con texto) y filas que se ignoran (títulos, totales).
- **Forma de la planilla:**
  - *Por binomio*: una fila por binomio y una columna por prueba, con una marca (X, Sí, 1, ✓ o el monto). Se eligen las columnas de pruebas y cuál es la marca.
  - *Por inscripción*: una fila por binomio y prueba, con una columna "Prueba". Las filas del mismo jinete y caballo se juntan en un binomio.
- **Campos** de la tabla de 3.1. Cada campo apunta a una columna, o a varias que se unen con un espacio (por ejemplo "Nombres" + "Apellidos").
- **Formato de fecha**: `dd-mm-aaaa` (por defecto), `mm-dd-aaaa` o `aaaa-mm-dd`. Las fechas con formato de celda de Excel se leen sin ambigüedad.
- **Club por defecto** para las filas sin club (por ejemplo, el club de la comisión que envió la planilla, o "Particular", Participantes §3.8). Si no se elige y hay filas sin club, esas filas quedan con error.

**Pantalla:** una lista de campos. Cada uno tiene un selector de columna y debajo **tres valores de ejemplo** tomados del archivo, para comprobar a simple vista. Si el mapeo lo propuso la IA, aparece la etiqueta "Propuesto por IA" junto a cada campo y el aviso "Revisa cada columna antes de seguir". Los campos obligatorios sin columna impiden avanzar. **Siguiente** guarda el mapeo en la `Importacion`.

**Equivalencias** (en el mismo paso, abajo):

- **Pruebas:** cada valor distinto que aparece en la planilla ("Inf.", "Infantil A", "Escuela") se asigna **una vez** a una prueba activa del evento, o se marca **No importar**. Si coincide exacto con el nombre de una prueba (con `normalizarNombre`), se asigna solo. La IA propone las demás. Nunca se crea una prueba desde aquí (decisión de Rod).
- **Relación del apoderado:** cada valor distinto ("mamá", "papá", "tío") se asigna a una de las cinco relaciones de Participantes §3.1. Un valor sin asignar deja al apoderado sin crear en esas filas, con una advertencia.
- **Marca de prueba** (solo en la forma por binomio): qué valores cuentan como marcado. Por defecto, cualquier celda no vacía distinta de "no", "0" o "-".

### 3.4 Mapeo con IA

- **Qué recibe la IA** (decisión de Rod: filas completas): los encabezados, **las primeras 20 filas de datos completas** (incluidos nombres, fechas y teléfonos, también de menores), la lista de valores distintos de cada columna de hasta 50 valores y 40 caracteres (para las equivalencias de pruebas y relaciones), y los nombres de las pruebas activas y de las cinco relaciones. **No recibe** el archivo, ni las filas siguientes, ni datos del portal (jinetes, clubes o montos existentes). Tampoco recibe la columna Observaciones.
- **Qué devuelve:** solo una propuesta estructurada: fila de encabezados, forma, columna de cada campo, columnas de pruebas y marca, formato de fecha, equivalencias de pruebas y relaciones, y una nota breve por campo. **La IA nunca escribe ni corrige datos de las filas**: la lectura de cada fila la hace el portal, de forma determinista, con el mapeo confirmado (principio 9 del marco).
- La respuesta se valida con un esquema (5.5). Una columna o prueba inexistente se descarta, y ese campo queda sin mapear.
- **Si la IA no está configurada, tarda más de 20 segundos o falla**, el paso sigue en modo **manual**, con el aviso "No se pudo usar la IA. Elige las columnas a mano". La importación nunca depende de la IA (decisión de Rod).
- La llamada queda registrada en la `Importacion` (origen `ia`, modelo, fecha y cantidad de filas enviadas), pero no se guarda el texto enviado.

### 3.5 Lectura de las filas

Con el mapeo confirmado, el servidor convierte cada fila en una **fila normalizada** (5.4):

- Textos recortados, espacios múltiples reducidos y largos de Participantes §3.1 (un nombre de más de 120 caracteres es error).
- **Fecha de nacimiento** según el formato elegido o la celda de fecha de Excel. Si no se reconoce, es futura o la edad queda bajo 4 o sobre 90 años: **advertencia** y se importa **sin fecha** ("Fecha no reconocida: se importa sin fecha"), porque la fecha es opcional (Participantes §3.1).
- **RUT** con `validarRut`. Si es inválido: advertencia y se importa sin RUT.
- **Teléfono del apoderado** con `normalizarTelefono`. Un apoderado con nombre y sin teléfono no se crea (el teléfono es obligatorio) y queda una advertencia.
- **Pruebas** según la forma y las equivalencias. Una fila sin ninguna prueba (o solo con pruebas "No importar") es **error**.
- **Monto informado de la prueba** (si la planilla trae montos por prueba o un total) y **pago informado:** se leen como enteros en CLP (se aceptan `$`, puntos y espacios). Nunca crean dinero (3.7, 3.8).

### 3.6 Resolver quién es quién

Cada club, jinete, caballo y apoderado de la planilla se resuelve contra lo que ya existe en la organización, con `buscarParecidos` (Participantes §3.5). Decisión de Rod: **se vincula solo si coincide exacto; si solo se parece, decide el administrador.**

| Entidad | Coincidencia exacta (se vincula sola) | Parecido (decide el administrador) |
|---|---|---|
| Club | Mismo RUT, o mismo nombre normalizado | Nombre parecido (regla de Organización y evento §3.5) |
| Jinete | Mismo RUT; o mismo nombre normalizado, sin fechas de nacimiento distintas | Nombre parecido, o mismo nombre con fecha de nacimiento distinta |
| Caballo | Mismo nombre normalizado **y** mismo club | Mismo nombre en otro club, o nombre parecido |
| Apoderado | Mismo teléfono (últimos 9 dígitos) y mismo nombre normalizado | Mismo teléfono o nombre parecido |

- **Registros desactivados:** una coincidencia con un registro desactivado nunca se vincula sola. Se muestra como parecido marcado "desactivado", con la opción de **Reactivar y vincular** o **Crear nuevo**.
- **RUT repetido:** si el RUT coincide con un registro activo, es coincidencia exacta y se vincula, aunque el nombre difiera. La diferencia de nombre se muestra como advertencia.
- **Dentro del mismo archivo:** las filas con la misma clave (mismo nombre normalizado, o mismo RUT) son la misma entidad y se crea una sola vez. Si dos nombres del archivo solo se parecen ("Juan Perez" y "Juan A. Pérez"), se avisa "En la planilla hay nombres parecidos" y el administrador elige entre **Es el mismo** y **Son distintos**.
- **Datos que difieren de lo existente:** al vincular, la importación **completa los campos vacíos** del registro existente (fecha de nacimiento, RUT, contacto) y **nunca sobrescribe** uno lleno. Si la planilla trae otro valor, advertencia "La planilla trae otra fecha de nacimiento (dd-mm-aaaa); no se cambia". Los apoderados de la planilla se vinculan al jinete si no lo estaban.
- **Club del binomio:** es la columna Club (o el club por defecto). Si el jinete ya existe con otro club, el jinete conserva su club y el binomio queda con el de la planilla, igual que "representa a otro club este año" (Inscripción de binomios §3.10). Un jinete nuevo se crea con ese club. El caballo nuevo se crea con "Club del caballo" o, si está vacío, con el club del binomio.
- **Ya inscrito** (decisión de Rod): si el binomio resuelto (jinete y caballo existentes) ya está inscrito en esa prueba en el evento, la inscripción se **omite** y se muestra "Ya inscrito". Si el binomio existe pero no en esa prueba, se agrega la prueba al binomio existente, sin cargar otra cuota (Inscripción de binomios §3.4).

### 3.7 Vista previa (paso "Vista previa")

Arriba, los contadores: **filas**, **binomios nuevos**, **inscripciones nuevas**, **ya inscritas (se omiten)**, **con error (no se importan)**, **con advertencia** y **por decidir**, más el **total a cobrar** que se generará (tarifas vigentes más la cuota automática).

Debajo, las filas agrupadas por binomio, con filtros por estado. Cada binomio muestra:

- jinete, caballo y club, cada uno con su etiqueta: **Nuevo**, **Existente** (con enlace a la ficha), **Parecido: elegir** o **Desactivado: elegir**;
- las pruebas con su tarifa vigente y "Ya inscrito" en las que corresponda;
- errores (en rojo) y advertencias (en ámbar).

| Tipo | Casos | Efecto |
|---|---|---|
| **Error** | Falta el jinete, el caballo o el club (sin club por defecto); ninguna prueba; nombre demasiado largo; fila ilegible | La fila no se importa. |
| **Advertencia** | Menor sin apoderado; menor de 14 (recordatorio de registrar la autorización a mano); sin fecha de nacimiento; fecha o RUT no reconocidos (se importan sin ellos); apoderado sin teléfono o sin relación reconocida; no cumple la edad de la prueba o edad sin dato (Inscripción de binomios §3.2); monto de la planilla distinto de la tarifa; dato que difiere de lo registrado; nombres parecidos dentro del archivo | Se importa igual (marco §6.12 y Participantes §3.4). |
| **Por decidir** | Parecidos con registros existentes o dentro del archivo, y registros desactivados | Hay que elegir antes de confirmar. Botón **Resolver todo como nuevo** para los que quedan, con confirmación. |

**Montos** (decisión de Rod): todas las inscripciones se crean con la **tarifa vigente** de su prueba. Si la planilla trae otro monto, la advertencia muestra ambos ("Planilla $20.000 · tarifa $25.000"), y después de importar se ajusta a mano con motivo (Inscripción de binomios §3.3).

**Confirmar:** botón **Importar N inscripciones** (deshabilitado mientras haya algo por decidir), con una hoja de confirmación que repite los contadores.

- Todo se crea en **una transacción** (5.6). Si algo falla, no se crea nada y la importación queda en revisión con el error.
- **Cambios entre la vista previa y la confirmación:** si otra persona creó un jinete o inscribió un binomio entretanto, la resolución se recalcula al confirmar. Si cambió, no se importa y se vuelve a la vista previa con el aviso "Hubo cambios desde que abriste la vista previa. Revísala de nuevo".
- **Doble toque o reintento:** la confirmación es idempotente por `Importacion`: una importación confirmada devuelve su resultado sin volver a crear nada.

### 3.8 Resultado (paso "Resultado")

- Resumen: clubes, jinetes, apoderados y caballos creados y vinculados; binomios e inscripciones creados; filas omitidas y con error; total a cobrar generado.
- **Pagos informados por registrar** (decisión de Rod): lista de binomios cuya fila traía un pago informado, con el monto y el botón **Registrar pago** que abre el formulario de Inscripción de binomios §3.6 con el jinete y sus ítems. El pago se registra con su respaldo u observación, como cualquier otro. La lista **no suma a ningún indicador** y se marca "Registrado" cuando ese binomio tiene un pago vigente posterior a la importación, o a mano con **Quitar de la lista**.
- **Montos distintos de la tarifa:** lista con el enlace para ajustar cada ítem.
- **Menores con alertas:** enlace a Participantes con el filtro "Con alertas".
- **Filas con error:** lista con número de fila y motivo, y el botón **Descargar filas con error** (`.xlsx` con esas filas y una columna "Motivo"), para corregirlas y volver a subirlas.

Las listas quedan guardadas en la importación y se pueden ver después desde el historial.

### 3.9 Anular lo importado

Si una importación se hizo mal (por ejemplo, las pruebas se mapearon al revés), el administrador toca **Anular lo importado** en su detalle, escribe un motivo y confirma. En una transacción:

- se anulan (no se borran, marco §6.8) las inscripciones creadas por esa importación que **no tengan pagos vigentes**, con `anularItem` de Inscripción de binomios. La cuota automática sigue su regla (§3.4);
- las que tienen pagos se listan y se dejan como están: se resuelven con retiro o cambio de prueba (Inscripción de binomios §3.8, §3.9);
- los binomios creados que quedan sin ítems vigentes se anulan;
- los clubes, jinetes, caballos y apoderados creados **no se tocan**: pueden estar en uso. Si sobran, el administrador los desactiva o fusiona (Participantes §3.6, §3.7).

Queda en auditoría como una acción `anular_importacion` con la lista de lo anulado. No se deshace. Para volver a cargar, se importa de nuevo.

### 3.10 Historial de importaciones

`/inscripciones/importaciones` (solo administrador): fecha, quién, nombre del archivo, estado (`en revisión`, `confirmada`, `descartada`, `vencida`, `anulada`), origen del mapeo (plantilla, anterior, IA, manual), filas, inscripciones creadas y omitidas. El detalle muestra el resumen y las listas de 3.8, y permite:

- **Descargar el archivo original** (respaldo de la importación, marco §6.12);
- **Eliminar el archivo original**, cuando un titular pide la supresión de sus datos (sección 4). La importación y lo creado quedan; se registra `eliminar_archivo_importacion` en auditoría.

### 3.11 Casos borde revisados

| Caso | Tratamiento |
|---|---|
| Una planilla por club, cada una con su formato | Mapeo con IA o manual por archivo; el mapeo se recuerda si los encabezados se repiten (3.3). |
| La planilla usa otros nombres de prueba ("Inf.") | Equivalencia una vez por valor; nunca se crean pruebas (3.3). |
| Una fila por binomio con X por prueba, o una fila por prueba | Ambas formas (3.3). |
| Nombres y apellidos en columnas separadas | Un campo puede unir varias columnas (3.3). |
| Planilla con título, filas vacías o totales al final | Fila de encabezados elegible y filas sin jinete ni caballo se ignoran sin error (3.3, 3.5). |
| Jinete con varios caballos | Una fila por binomio; el jinete se crea una vez (3.6). |
| Caballo con varios jinetes | Dos binomios; el caballo se crea una vez si coincide nombre y club (3.6). |
| Inscripción en varias pruebas | Varias marcas en la fila, o varias filas en la forma por inscripción (3.3). |
| Jinete ya existente con otro club | El jinete conserva su club; el binomio usa el de la planilla (3.6). |
| Jinete o caballo duplicado respecto de lo existente | Exacto se vincula; parecido lo decide el administrador (3.6). Si igual se duplica, se fusiona (Participantes §3.7). |
| El mismo jinete escrito distinto dentro del archivo | Aviso "nombres parecidos" con Es el mismo / Son distintos (3.6). |
| Dos caballos con el mismo nombre en clubes distintos | No se vinculan solos; se decide (3.6). |
| Menor de edad sin apoderado | Advertencia, se importa (3.7; Participantes §3.4). |
| Menor de 14 | Advertencia de registrar la autorización a mano; la plantilla recuerda pedirla (3.1). |
| Categorías por edad y jinete que no cumple o sin fecha | Advertencia, se importa (3.7). |
| Fecha de nacimiento en formato mes-día o mal escrita | Formato elegible; si no se reconoce, se importa sin fecha con advertencia (3.3, 3.5). |
| Descuentos, becas o invitados en la planilla | Se importa con tarifa vigente; la diferencia queda listada para ajustar con motivo (3.7, 3.8). |
| La planilla dice que pagó | Lista de pagos informados; el pago se registra con respaldo (3.8). |
| Pago parcial, o una transferencia que cubre varios binomios o la paga un club | Se registra después con el reparto de Inscripción de binomios §3.6, desde la lista o la ficha del club. |
| Transferencia sin identificar | No es de este componente (Movimientos §3.3). |
| Pensión o alojamiento en la planilla | No se importa; se agrega como cargo desde la ficha (fuera de alcance). La columna se puede ver en Observaciones. |
| Se sube dos veces la misma planilla, o una versión actualizada | Aviso de archivo repetido; lo ya inscrito sale "Ya inscrito" y se omite; solo entra lo nuevo (3.2, 3.6). |
| La planilla actualizada ya no trae un binomio (se retiró) | No se da de baja: se retira a mano (Inscripción de binomios §3.8). |
| Dos administradores importan a la vez, o alguien inscribe durante la vista previa | Se recalcula al confirmar; si cambió, se vuelve a la vista previa (3.7). Índice único de binomio en prueba como última defensa (Inscripción de binomios §5.1). |
| Doble toque al confirmar o respuesta perdida | Idempotente por importación (3.7). |
| Importación equivocada | Anular lo importado sin pagos (3.9). |
| La IA propone mal una columna | Valores de ejemplo a la vista y confirmación obligatoria; la IA no escribe datos (3.3, 3.4). |
| La IA no responde o no hay clave | Modo manual (3.4). |
| Plantilla de otro evento | Se trata como planilla libre con aviso (3.3). |
| Una prueba desactivada después de descargar la plantilla | Su columna queda sin equivalencia y se marca "No importar" o se asigna a otra (3.3). |
| Evento cerrado (v1.1) | No se importa: solo con el evento `abierto` (inicio de 3; Organización y evento §3.6). |
| Uso desde el celular con señal baja | Pensado para el computador; en el celular funciona, pero la subida y la IA requieren conexión. Cada paso queda guardado en la importación y se retoma (3.2). |
| Archivo `.xls`, `.ods` o Google Sheets | Se pide guardarlo como `.xlsx` o `.csv` (3.2). |
| Gasto pagado por un ayudante, auspicio en especie, gasto observado, movimientos después del cierre | No son de este componente (Movimientos). |

---

## 4. Cumplimiento normativo

Aplica: el componente recibe en bloque datos personales de jinetes (incluidos **menores de edad**), apoderados y clubes, guarda el archivo original y **envía parte de esos datos a un proveedor de IA fuera de Chile**. Lo transversal está en el marco §9. Aquí solo va lo específico.

**Normativa y vigencia (verificada el 2026-09-27).** Ley 19.628, vigente. Ley 21.719: entra en vigencia el **2026-12-01**. El proyecto de prórroga a 2027 (Boletín 18.623-07) sigue en primer trámite en la Comisión de Constitución del Senado, sin informe ni votación al 2026-09-24, aunque el Ejecutivo renovó la urgencia el 2026-09-22. El diseño cumple la Ley 21.719 desde el inicio (marco §9.1).

**Datos tratados.** Los de Participantes §3.1 y el marco §9.2, sin datos nuevos. El archivo original puede traer **más columnas** de las que se importan (por ejemplo, domicilio o datos de salud que una comisión haya incluido por su cuenta). Esas columnas no se importan ni se muestran, salvo Observaciones, que solo se muestra y no se guarda en ninguna entidad. Sí quedan en el archivo original guardado.

**Base de licitud.** La del marco §9.2: la relación de inscripción al concurso y, en menores de 14, la autorización del apoderado, que la comisión obtiene al recibir la inscripción y registra en el portal con su fecha (marco §9.3, Participantes §3.4). La plantilla incluye el texto breve de privacidad y el recordatorio de pedir esa autorización (3.1).

**Encargado de tratamiento: Google (API de Gemini).** Decisión de Rod: la IA recibe **filas completas**, incluidos datos de menores (3.4). Para que esto sea admisible:

- **Solo el nivel de pago.** Los términos adicionales de la API de Gemini, revisados el 2026-09-27, dicen que en los servicios gratuitos Google usa el contenido enviado para mejorar sus productos, que pueden leerlo revisores humanos y que no deben enviarse datos personales. En los servicios de pago, Google no usa los prompts ni las respuestas para mejorar sus productos, y los registra por un tiempo limitado solo para detectar abusos. Por eso la IA solo se activa con la facturación habilitada (t-015) **y** la variable `GEMINI_NIVEL_PAGO=confirmado`, que se configura después de verificarla (5.5). Sin esa variable, el portal no llama a Gemini y el mapeo es manual.
- **Minimización:** se envían los encabezados y **como máximo 20 filas**, nunca el archivo completo ni datos del portal. La columna Observaciones no se envía. El texto enviado no se guarda en el portal ni en los registros de la app.
- **Transferencia internacional:** Google procesa los datos fuera de Chile. Se ampara en los términos de Google para servicios de pago, que lo obligan a tratar los datos solo para prestar el servicio. Esto queda declarado en el aviso de privacidad (Acceso y roles v1.1) y en el marco §9.4 (v1.4). La Ley 21.719 exige, para transferir datos a otro país, garantías adecuadas. Si al entrar en vigencia la Agencia exige cláusulas específicas, se revisa este punto (riesgo en 8).
- **Interés superior de los menores:** el envío se limita a lo necesario para reconocer columnas, y la IA no toma decisiones sobre las personas: solo propone un mapeo que confirma el administrador (principio 9 del marco).

**Acceso.** Solo el administrador importa, ve la vista previa, el historial y el archivo original (acción `importar_excel`). El ayudante y el observador reciben 403 en todas las rutas de este componente. Lo creado se ve después con las reglas de Participantes §3.9 e Inscripción de binomios §3.12.

**Conservación.**

- **Archivo de una importación confirmada:** es el respaldo de la importación (marco §6.12). Se conserva como los demás respaldos: hasta la rendición aprobada más 1 año (marco §9.5), y se elimina con ellos.
- **Archivo de una importación descartada o vencida (7 días sin confirmar):** se elimina de inmediato del volumen. Queda solo la línea del historial, sin el archivo y sin las filas.
- **Vista previa y filas normalizadas:** viven en la `Importacion` mientras está en revisión y se eliminan al confirmar, descartar o vencer. Se conserva solo el resumen de 3.8 (nombres, montos y números de fila, sin fechas de nacimiento, RUT ni contactos).

**Derechos de los titulares.** Además de lo que ofrece Participantes para cada registro, el administrador puede **Eliminar el archivo original** de una importación cuando un titular pide la supresión (3.10). El registro de la importación y lo creado se conservan según las reglas de cada entidad.

**Registro y trazabilidad.** Una sola acción de auditoría por importación (marco §6.12), más las de anular lo importado y eliminar el archivo (5.8).

---

## 5. Especificación de ejecución

Stack heredado del marco §8, más la API de Gemini de pago (marco v1.4). Código en `src/dominio/inscripciones/importacion/`, con la capa de IA en `src/lib/ia/`. Columnas en `snake_case` con `@map`.

### 5.1 Modelo de datos (Prisma)

```prisma
enum EstadoImportacion { en_revision confirmada descartada vencida anulada }
enum OrigenMapeo { plantilla anterior ia manual }

model Importacion {
  id                 String            @id @default(cuid())
  organizacionId     String
  eventoId           String
  estado             EstadoImportacion @default(en_revision)
  nombreArchivo      String
  rutaArchivo        String?           // relativa a RUTA_RESPALDOS; null si se eliminó
  tipoArchivo        String            // "xlsx" | "csv"
  tamanoBytes        Int
  sha256             String
  hoja               String?
  totalFilas         Int
  origenMapeo        OrigenMapeo?
  mapeo              Json?             // MapeoImportacion (5.4), validado con Zod
  firmaEncabezados   String?           // sha256 de los encabezados normalizados (reutilizar mapeo)
  iaModelo           String?
  iaFilasEnviadas    Int?
  iaUsadaEn          DateTime?
  trabajo            Json?             // filas normalizadas, resolución y decisiones; se vacía al cerrar
  firmaResolucion    String?           // sha256 de la resolución mostrada (3.7)
  resumen            Json?             // 3.8, sin fechas, RUT ni contactos
  error              String?
  creadoPorId        String
  creadoEn           DateTime          @default(now())
  venceEn            DateTime          // creadoEn + 7 días
  confirmadoPorId    String?
  confirmadoEn       DateTime?
  anuladoPorId       String?
  anuladoEn          DateTime?
  motivoAnulacion    String?
  version            Int               @default(1)
  actualizadoEn      DateTime          @updatedAt
  @@index([organizacionId, eventoId, creadoEn])
  @@index([organizacionId, sha256])
  @@index([organizacionId, firmaEncabezados])
}
```

**Cambios en Inscripción de binomios §5.1** (v1.1 de ese documento): campo opcional `importacionId String?` en `Binomio` e `Inscripcion`, con índice `@@index([importacionId])`. Lo usan "Anular lo importado" (3.9) y la ficha del binomio, que muestra "Importado el <fecha>".

**Restricciones por migración SQL:**

- `CHECK` en `importacion`: `estado <> 'confirmada' OR (confirmado_por_id IS NOT NULL AND confirmado_en IS NOT NULL)`; `estado <> 'anulada' OR motivo_anulacion IS NOT NULL`; `tamano_bytes BETWEEN 1 AND 5242880`.
- Clave foránea de `binomio.importacion_id` e `inscripcion.importacion_id` a `importacion.id`.

`Importacion` lleva `organizacionId` y pasa por `db(ctx)` (Organización y evento §5.2).

### 5.2 Archivos

- **Ruta:** `RUTA_RESPALDOS/importaciones/<organizacionId>/<importacionId>.<xlsx|csv>`, en el mismo volumen que los respaldos (marco §8), fuera de rutas públicas.
- **Descarga:** `/api/importaciones/[id]/archivo`, solo con `importar_excel` y de la misma organización. Sirve con `Content-Disposition: attachment` y el nombre original.
- **Vencimiento:** al abrir `/inscripciones/importar` o el historial, `vencerImportaciones(ctx)` pasa a `vencida` las `en_revision` con `venceEn` pasado, elimina su archivo y vacía `trabajo`. Sin tareas programadas (marco §7, principio 7).
- **Eliminar archivo:** borra el archivo y deja `rutaArchivo = null`.

### 5.3 Lectura y escritura de planillas

- Librería: **`exceljs`**, para leer `.xlsx` y `.csv` y para generar la plantilla con validación de datos, hojas ocultas y notas en celdas (marco §8: librería en el servidor, sin servicios externos). Para el CSV, detección de separador y codificación propia: se prueba UTF-8 y, si hay caracteres inválidos, Latin-1.
- `leerLibro(buffer, tipo)` → `{ hojas: [{ nombre, visible, filas: Celda[][] }], marcaPortal? }`. Las celdas de fecha se entregan como `Date` y el resto como texto. Límites: 1.000 filas y 60 columnas por hoja. Si se superan, error "La planilla supera el máximo".
- `generarPlantilla(ctx, evento)` → `Buffer` según 3.1. La hoja `_portal` es `veryHidden` y contiene `{ formato: "plantilla-inscripcion", version: 1, eventoId, pruebas: [{ id, columna }] }`.
- `generarFilasConError(importacion)` → `.xlsx` con las filas originales con error y la columna "Motivo".

### 5.4 Funciones de dominio (con pruebas)

```ts
type Campo =
  | "club" | "jinete" | "fechaNacimiento" | "rutJinete" | "contactoJinete"
  | "caballo" | "clubCaballo" | "prueba" | "montoPrueba" | "pagoInformado"
  | "apoderado1Nombre" | "apoderado1Telefono" | "apoderado1Relacion"
  | "apoderado2Nombre" | "apoderado2Telefono" | "apoderado2Relacion"
  | "observaciones";

type MapeoImportacion = {
  hoja: string;
  filaEncabezados: number;          // 1-based
  filasIgnoradas: number[];
  forma: "por_binomio" | "por_inscripcion";
  campos: Partial<Record<Campo, number[]>>;       // índices de columna; varias se unen con espacio
  columnasPrueba?: Record<number, string | null>; // por_binomio: columna → pruebaId o null (no importar)
  valoresMarca?: string[];                         // por_binomio
  equivalenciasPrueba?: Record<string, string | null>; // por_inscripcion: valor → pruebaId o null
  equivalenciasRelacion: Record<string, RelacionApoderado | null>;
  formatoFecha: "dma" | "mda" | "amd";
  clubPorDefectoId?: string;
};
```

- `detectarMapeo(ctx, libro, hoja)`: aplica el orden de 3.3 (plantilla → anterior por `firmaEncabezados` → IA → manual) y devuelve `{ mapeo, origen, notas }`.
- `mapeoPorEncabezados(encabezados, pruebas)`: el modo manual: sinónimos fijos en español ("jinete", "amazona", "binomio", "caballo", "ejemplar", "club", "sociedad", "f. nac", "fecha de nacimiento", "rut", "teléfono", "celular", "apoderado", "pagado", "abono") y coincidencia exacta de pruebas con `normalizarNombre`.
- `normalizarFilas(filas, mapeo, pruebas)` → `{ filas: FilaNormalizada[], errores, advertencias }`, según 3.5. Es **determinista y pura**: toda la lectura de datos pasa por aquí, nunca por la IA.
- `resolverFilas(ctx, filasNormalizadas, evento)` → `Resolucion`: agrupa por binomio, aplica 3.6 con `buscarParecidos` y el índice de binomios e inscripciones vigentes del evento, y calcula el total con las tarifas vigentes y la cuota automática. Carga una vez las listas de clubes, jinetes, caballos y apoderados de la organización (escala de Participantes §3) y resuelve en memoria.
- `firmarResolucion(resolucion)` → `sha256` de una forma canónica (ids resueltos, pruebas y omitidas).
- `aplicarDecisiones(resolucion, decisiones)`: aplica "vincular a X", "crear nuevo", "reactivar y vincular", "es el mismo" y "son distintos". Rechaza si queda algo por decidir.

### 5.5 Capa de IA (`src/lib/ia/`)

Capa que no depende del proveedor, para que la use también Conciliación con cartola (v1.1):

```ts
export function iaHabilitada(): boolean; // GEMINI_API_KEY presente y GEMINI_NIVEL_PAGO === "confirmado"
export async function sugerir<T>(tarea: string, entrada: unknown, esquema: ZodType<T>,
  opciones?: { timeoutMs?: number }): Promise<T | null>; // null si deshabilitada, error, timeout o respuesta inválida
```

- **Implementación Gemini:** SDK oficial `@google/genai`, `generateContent` con salida JSON estructurada (`responseMimeType: "application/json"` y el esquema derivado del Zod), temperatura 0. Modelo en `GEMINI_MODELO`, por defecto un modelo Flash vigente al implementar, para no fijar en el código un nombre que Google retire. Timeout de 20 s, un reintento ante error 5xx o 429, y después `null`.
- **Tarea `mapear_planilla`:** instrucción fija en el código (en español) con la descripción de los campos de 5.4, las dos formas, los formatos de fecha y la regla "no inventes columnas; si no estás seguro, deja el campo vacío". Entrada según 3.4. La salida se valida con el Zod de `MapeoImportacion` y cada índice de columna o `pruebaId` se verifica contra el archivo y el evento: lo que no calza se descarta.
- **Sin registros del contenido:** no se escribe en logs ni en la base el texto enviado ni la respuesta cruda. Solo se guarda en `Importacion` el modelo, la cantidad de filas enviadas y la fecha.
- **Variables de entorno** (reemplazan a `ANTHROPIC_API_KEY` del marco): `GEMINI_API_KEY`, `GEMINI_NIVEL_PAGO` (`confirmado` solo después de verificar la facturación, t-015) y `GEMINI_MODELO` (opcional).

### 5.6 Acciones de servidor

Todas con Zod, `obtenerContexto`, `exigir(ctx, "importar_excel")`, evento vigente `abierto`, `exigirDeLaOrganizacion` sobre cada id recibido y `version` en las transiciones.

| Función | Efecto |
|---|---|
| `descargarPlantilla()` | 3.1. Audita `descargar_plantilla`. |
| `subirArchivo(archivo)` | 3.2: valida tipo y tamaño, calcula `sha256`, guarda el archivo, lee el libro y crea la `Importacion`. Devuelve hojas y aviso de repetido. |
| `elegirHoja(id, hoja, version)` | Llama a `detectarMapeo` y guarda la propuesta. |
| `guardarMapeo(id, mapeo, version)` | Valida el mapeo (obligatorios presentes, columnas existentes, pruebas del evento), normaliza, resuelve y guarda `trabajo` y `firmaResolucion`. Devuelve la vista previa. |
| `decidir(id, decisiones, version)` | Aplica decisiones de 3.6 y recalcula contadores. |
| `confirmarImportacion(id, firmaResolucion, version)` | 5.7. |
| `descartarImportacion(id, version)` | Estado `descartada`, elimina el archivo y vacía `trabajo`. |
| `anularLoImportado(id, motivo, version)` | 3.9. |
| `eliminarArchivoImportacion(id)` | 3.10. |
| `quitarPagoInformado(id, binomioId)` | Marca la línea de 3.8. |

Consultas: `listarImportaciones()`, `detalleImportacion(id)` y `vistaPrevia(id, filtros)`.

### 5.7 Confirmación

En **una transacción** (`db(ctx).$transaction`, nivel `Serializable` y un reintento ante conflicto de serialización):

1. Bloquea la `Importacion` (`SELECT … FOR UPDATE`). Si ya está `confirmada`, devuelve su `resumen` sin hacer nada (idempotencia). Si no está `en_revision` o venció, la rechaza.
2. Recalcula `resolverFilas` + `aplicarDecisiones` con los datos actuales y compara la firma con `firmaResolucion`. Si difiere, lanza `VistaPreviaDesactualizada` (3.7).
3. Crea, en este orden y con las **mismas funciones internas** de Participantes (validaciones Zod y reglas de 3.1), pasando `tx`: clubes, caballos, jinetes (con completado de campos vacíos en los existentes), apoderados y vínculos. Las reactivaciones decididas usan `reactivar<Entidad>`.
4. Por cada binomio, llama a `inscribir(tx, ctx, { jineteId, caballoId, clubId, pruebas, claveCliente: "imp:<importacionId>:<n>", importacionId })` (Inscripción de binomios §5.3, que en v1.1 acepta la transacción y el `importacionId`). La cuota automática y los avisos de edad salen de ahí. Una prueba ya inscrita a esta altura es error de firma (paso 2).
5. Guarda `resumen` (3.8), estado `confirmada`, `confirmadoPorId`, `confirmadoEn`, y vacía `trabajo`.
6. Registra **un** `RegistroAuditoria` (5.8).

**No** llama a `registrarPagoInscripciones` ni a ninguna función de Movimientos. Una prueba automática lo verifica (5.9).

### 5.8 Auditoría

Con `registrarAuditoria` (marco §6.8), entidad `Importacion`:

- `importar`: **una sola acción** por importación (marco §6.12), con nombre y `sha256` del archivo, origen del mapeo, contadores e ids creados y vinculados por entidad. Las creaciones internas de los pasos 3 y 4 de 5.7 **no** generan registros propios, porque este los reemplaza; `inscribir` y las funciones de Participantes reciben la opción `auditar: false` solo desde aquí.
- `anular_importacion` (con los ids anulados y los que se dejaron por tener pagos), `eliminar_archivo_importacion`, `descargar_plantilla`, `descartar_importacion` y `usar_ia` (modelo y filas enviadas, sin contenido).

### 5.9 Pantallas

| Ruta o componente | Contenido |
|---|---|
| `/inscripciones/importar` | Botón Descargar plantilla y subida del archivo (3.1, 3.2). |
| `/inscripciones/importar/[id]` | Pasos Columnas, Vista previa y Resultado según el estado (3.3 a 3.8). |
| `/inscripciones/importaciones` | Historial y detalle (3.9, 3.10). |
| `<MapeoColumnas>` | Campos con selector, ejemplos y etiqueta "Propuesto por IA"; equivalencias. |
| `<VistaPreviaImportacion>` | Contadores, filtros y grupos por binomio, con las decisiones; en el celular, tarjetas. |
| Entrada en el menú | "Importar" dentro de Inscripciones, solo con `importar_excel`. |

### 5.10 Pruebas (Vitest)

- **Permisos y aislamiento:** ayudante, observador y solicitante reciben 403 en todas las acciones y rutas; ids de otra organización o de otro evento (club por defecto, pruebas, registros a vincular) se rechazan; `Importacion` no se lee desde otra organización.
- **Lectura:** `.xlsx` con celdas de fecha, texto y fórmulas; CSV con `;` y con `,`, en UTF-8 y Latin-1; límites de tamaño, filas y columnas; `.xls` rechazado.
- **Plantilla:** la plantilla generada se reconoce sin IA y produce el mapeo exacto; plantilla de otro evento se trata como libre; no contiene datos personales.
- **Formas y mapeo:** por binomio con distintas marcas; por inscripción agrupando filas; columnas unidas; equivalencias de pruebas y relaciones; reutilización por `firmaEncabezados`.
- **Normalización:** fechas `dma`, `mda`, `amd` y seriales de Excel; fecha inválida, futura o con edad fuera de rango → advertencia e importación sin fecha; RUT inválido → sin RUT; teléfono normalizado; fila sin prueba → error; filas vacías ignoradas.
- **Resolución:** exacto por RUT y por nombre; jinete con fecha distinta → parecido; caballo con mismo nombre en otro club → parecido; desactivado nunca se vincula solo; agrupación dentro del archivo; completa campos vacíos y no sobrescribe; club del binomio distinto del club del jinete existente; "Ya inscrito" se omite; prueba nueva a binomio existente sin cuota nueva.
- **Confirmación:** crea todo o nada; idempotente; `VistaPreviaDesactualizada` si otro usuario inscribió entretanto; cuota automática una vez por binomio; tarifa vigente aunque la planilla traiga otro monto; **no crea `Movimiento`, `Pago`, `Respaldo` de movimiento ni `Devolucion`**; un solo `RegistroAuditoria` de `importar`.
- **Anular lo importado:** anula solo lo sin pagos, deja lo pagado listado, anula binomios vacíos y no toca participantes.
- **IA:** con `iaHabilitada() === false` no hay llamada de red (se simula el SDK y se verifica que no se invoca); sin `GEMINI_NIVEL_PAGO=confirmado`, tampoco; como máximo 20 filas enviadas y sin la columna Observaciones; respuesta inválida o con columnas inexistentes → se descarta y queda manual; timeout → manual; no se guarda el contenido enviado.
- **Conservación:** una importación vencida o descartada elimina su archivo y vacía `trabajo`; `resumen` no contiene fechas de nacimiento, RUT ni contactos.

---

## 6. Elementos que quedan obsoletos

**Marco general, desviaciones declaradas.** Al aprobarse este documento, el marco sube a **v1.4**:

- **§4 y §12:** la importación sale de v1.0 y pasa a v1.1. El paso 8 del plan se reemplaza y el paso 11 deja de incluir "importar los binomios existentes". El núcleo del 2026-10-04 queda en acceso, movimientos, participantes e inscripciones y dashboard. §11 y §13 (orden de prioridad) se ajustan igual.
- **§6.12:** se amplía con la plantilla para terceros, cualquier formato con mapeo asistido por IA, fechas y RUT no reconocidos como advertencia (se importa sin ellos, coherente con Participantes), "Ya inscrito" que se omite y la lista de pagos informados. El detalle vive aquí.
- **§5:** se agrega la entidad `Importacion`.
- **§3, §7 (principio 8), §8 y §9.4:** la IA del proyecto pasa de la API de Claude a la **API de Gemini de pago**, para la importación y la conciliación (decisión de Rod: un solo proveedor). `ANTHROPIC_API_KEY` se reemplaza por `GEMINI_API_KEY`, `GEMINI_NIVEL_PAGO` y `GEMINI_MODELO`. §9.4: Google actúa como encargado, con lo que se le envía en cada caso (5.5 y marco §6.13). La meta de costo de IA se mantiene (< USD 5 en todo el evento), ahora para ambos usos.

**Acceso y roles** (pasa a v1.1 en el mismo commit): el aviso de privacidad (§3.8) declara que algunos datos se procesan con un proveedor de IA (Google) que actúa por encargo de la comisión, con transferencia fuera de Chile. Sube `AVISO_PRIVACIDAD_VERSION`, así que todos los usuarios lo vuelven a aceptar.

**Inscripción de binomios** (pasa a v1.1 en el mismo commit): §1 y §2 marcan este hijo como v1.1; §5.1 agrega `importacionId` a `Binomio` e `Inscripcion`; §5.3, `inscribir` acepta una transacción externa, el `importacionId` y la opción de no auditar cuando la llama la importación.

**Participantes:** sus funciones de creación se usan con una transacción externa y sin auditoría propia desde la importación (5.7, 5.8). Es un detalle de implementación, sin cambio de reglas: no requiere nueva versión.

**Conciliación con cartola (pendiente):** cuando se documente, usa la capa de IA de 5.5 con Gemini, en vez de la API de Claude.

**Planillas de inscritos de cada comisión:** dejan de ser el registro. La plantilla del portal pasa a ser el formato común para pedirlas (t-014).

**Tareas:** t-014 (club): definir con el club cómo recibirán las inscripciones las otras comisiones o clubes y enviarles la plantilla. t-015 (desarrollo): activar la facturación de la API de Gemini en el proyecto de Google Cloud, crear la clave, configurar una alerta de presupuesto de USD 5 y entregar la clave a Claude Code fuera del repositorio.

Código: ninguno, revisado: el repositorio solo tiene documentación.

---

## 7. Plan de acción

| # | Paso | Depende de |
|---|---|---|
| 1 | Modelo `Importacion`, `importacionId` en `Binomio` e `Inscripcion`, migración y `CHECK` | Inscripción de binomios paso 1 |
| 2 | `inscribir` y las funciones de creación de Participantes con `tx` externa y `auditar: false` | Inscripción de binomios paso 6; Participantes paso 5 |
| 3 | `leerLibro` con `exceljs` y CSV; `generarPlantilla` y descarga | 1 |
| 4 | `normalizarFilas` y `mapeoPorEncabezados`, con pruebas | 3 |
| 5 | `resolverFilas`, `aplicarDecisiones` y firma, con pruebas | 4; Participantes paso 2 (`buscarParecidos`) |
| 6 | Pantallas Archivo, Columnas (manual) y Vista previa | 5 |
| 7 | `confirmarImportacion` con transacción, idempotencia y auditoría única | 2, 5 |
| 8 | Resultado, pagos informados, filas con error e historial | 7 |
| 9 | Capa de IA con Gemini y tarea `mapear_planilla`, con pruebas simuladas | Tarea t-015; 4 |
| 10 | Anular lo importado, eliminar archivo y vencimiento | 7 |
| 11 | Prueba completa con la plantilla y con dos planillas reales de comisiones | 8, 9; tarea t-014 |

Todo es v1.1: meta de implementación ≤ 2026-10-25, para usarlo cuando lleguen las listas y antes del objetivo del 2026-11-14. Si el plazo aprieta, el paso 9 (IA) se recorta sin cambiar el modelo: la plantilla se reconoce sola y el resto se mapea a mano. El paso 10 es recortable, salvo el vencimiento.

---

## 8. Riesgos

| Riesgo | Tipo | Mitigación |
|---|---|---|
| La IA mapea mal una columna y se cargan datos cruzados (fecha como RUT, prueba equivocada) | Operativo | Ejemplos visibles por campo, confirmación obligatoria, la IA no escribe datos, vista previa completa y "Anular lo importado" (3.3, 3.4, 3.9). |
| Se usa una clave de Gemini del nivel gratuito con datos de menores | Normativo | La IA solo se activa con `GEMINI_NIVEL_PAGO=confirmado`, que se pone después de verificar la facturación (t-015); prueba automática (5.10). |
| Transferencia internacional objetada al entrar en vigencia la Ley 21.719 | Normativo | Envío mínimo (20 filas), declarado en el aviso; si la Agencia exige otras garantías, se deja `GEMINI_NIVEL_PAGO` sin configurar y la importación sigue en modo manual sin cambiar el modelo. |
| Costo de IA mayor al esperado | Costo | Una llamada por archivo, solo con planillas libres; la plantilla y los mapeos repetidos no la usan; alerta de presupuesto de USD 5 (t-015). |
| Google retira el modelo configurado | Técnico | `GEMINI_MODELO` por variable de entorno; si falla, modo manual. |
| Duplicados de jinetes o caballos por nombres escritos distinto | Operativo | Exacto se vincula, parecido se decide, agrupación dentro del archivo, fusión posterior (3.6). |
| Una comisión incluye datos que el portal no pide (salud, domicilio) | Normativo | Esas columnas no se importan ni se envían a la IA salvo en las 20 filas de muestra; el archivo vence a los 7 días si no se confirma y se puede eliminar a pedido (sección 4). La plantilla evita el problema. |
| Planillas con datos personales circulando por WhatsApp o correo entre comisiones | Normativo | Fuera del portal. La hoja de instrucciones incluye el texto de privacidad y la recomendación de enviarlas solo al administrador (3.1, t-014). |
| Importar crea montos que no calzan con lo acordado por el club (descuentos) | Operativo | Tarifa vigente siempre; diferencias listadas para ajustar con motivo (3.7, 3.8). |
| Pagos informados en la planilla que nunca se registran | Operativo | Lista persistente en el resultado y el historial; el por cobrar sigue alto hasta registrarlos (3.8). |
| El componente no está listo cuando lleguen las listas | Plazo | Inscripción manual disponible desde v1.0; la IA es recortable (7). |
| Formatos imposibles (celdas combinadas, varios binomios en una celda) | Experiencia | Elegir fila de encabezados y unir columnas; lo que no se lee sale como error con descarga de filas para corregir (3.3, 3.8). |

---

## 9. Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 1.0 | Primera versión, aprobada por Rod. Pasa a v1.1 porque no hay inscritos que cargar; plantilla descargable completa por binomio para otras comisiones; acepta cualquier planilla con mapeo propuesto por IA (Gemini de pago, filas completas) o manual; equivalencias de pruebas sin crear pruebas; vínculo automático solo ante coincidencia exacta; lo ya inscrito se omite; pagos de la planilla como lista por registrar; tarifa vigente siempre. Marco general a v1.4, Acceso y roles a v1.1 e Inscripción de binomios a v1.1 | Sesión con Rod y aprobación directa |
