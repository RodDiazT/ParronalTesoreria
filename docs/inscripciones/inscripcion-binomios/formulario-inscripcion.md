# Formulario de inscripción

Estado: En revisión · Versión 0.1 · Responsable: Rod (Administrador) · Ejecutor: Claude Code

## 1. Índice

- **Padre:** `docs/inscripciones/inscripcion-binomios.md`. Alcance dentro del padre: la vía de entrada pública de inscripciones. El jinete, su apoderado o quien lo inscribe envía **un binomio** con sus pruebas (y, si ya pagó, el comprobante) por un enlace sin login. Lo enviado queda como `SolicitudInscripcion` por revisar, y un administrador o ayudante la acepta (se crean o vinculan los participantes, se inscribe con `inscribir` y, si trae comprobante, se registra el pago en la misma aceptación) o la rechaza. Aplica el marco §4 (v1.1), §9.3 (autorización del apoderado en el formulario) y §9.4 (solo envío, límite de envíos).
- **Hijos:** ninguno.
- **Depende de:** `docs/inscripciones/participantes.md` (datos de cada entidad, `buscarParecidos`, `edadEnEvento`, `alertasJinete`, creación de participantes), `docs/inscripciones/inscripcion-binomios/importacion-excel.md` (reglas de resolución de §3.6, que se comparten), `docs/movimientos/movimientos.md` (respaldos, `registrarMovimientoSistema`, validación), `docs/organizacion/organizacion-evento.md` (contexto, evento vigente, `db(ctx)`, `exigirDeLaOrganizacion`, `normalizarNombre`) y `docs/acceso/acceso-roles.md` (acciones `revisar_formulario` y `configurar`, middleware y aviso de privacidad).
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

**Qué es.** Un enlace que el administrador comparte (por WhatsApp, en redes o con las otras comisiones). Quien lo abre, sin iniciar sesión, completa los datos de **un jinete, un caballo y las pruebas** en que se inscribe ese binomio; ve el total estimado y los datos para transferir; si ya transfirió, adjunta el comprobante. Al enviar recibe un número de solicitud. Nada entra al portal hasta que una persona de la comisión revisa la solicitud, la corrige si hace falta, decide si cada jinete, caballo y club ya existe y la acepta o la rechaza.

**Versión:** v1.1 (objetivo 2026-11-14, límite 2026-11-21). El plan del marco §12 lo ubica en el paso 12 (documentar e implementar a más tardar el 2026-10-18), después del núcleo v1.0. Si el plazo aprieta, los recortables están en la sección 7.

**Pendiente del club:** los datos de la cuenta para transferir y hasta cuándo se reciben inscripciones por este medio (tarea t-016, nueva). Mientras no estén, el enlace se puede configurar sin instrucciones de pago y sin fecha de cierre.

**Conexión con el proyecto.**

| Documento | Relación |
|---|---|
| Marco general | Dueño de §4 (formulario en v1.1), §9.3 (casilla de autorización del apoderado para menores de 14) y §9.4 (solo envío y límite de envíos). Este documento es el dueño del detalle. Al aprobarse, el marco sube a **v1.6** (sección 6): se precisa qué muestra el formulario (configuración del evento, nunca registros) y se agrega en §9.2 el remitente como titular. |
| Inscripción de binomios (padre) | Al aceptar se llama a `inscribir` (§5.3) dentro de la transacción de la aceptación, con la tarifa vigente y la cuota automática. Si se registra el pago, se usa `registrarPagoInscripciones` en la misma transacción. El padre pasa a **v1.3** (sección 6): `registrarPagoInscripciones` acepta una transacción externa y un respaldo ya guardado. |
| Participantes | Crea o vincula clubes, jinetes, apoderados y caballos con las mismas funciones y validaciones (§3.1, §3.2), registra la autorización del apoderado (§3.4) y respeta quién puede reactivar o completar datos (§3.4, §3.5, §3.6). Sin cambios en ese documento. |
| Importación desde Excel | Comparte las reglas de coincidencia de §3.6 (exacta se vincula sola, parecida decide una persona). La regla por entidad pasa a una función común (5.4). Importación sube a **v1.1** solo para registrar ese uso compartido (sección 6). |
| Movimientos | El comprobante adjunto pasa a ser el `Respaldo` del movimiento de pago. `registrarMovimientoSistema` acepta un archivo ya guardado en el volumen. Movimientos pasa a **v1.3** (sección 6). La regla de validación no cambia: el pago que acepta un ayudante queda por validar. |
| Acceso y roles | Acción `revisar_formulario` (ya existe: administrador y ayudante) y `configurar` para el enlace. El middleware deja pasar la ruta pública del formulario, y el aviso de privacidad agrega los datos del formulario. Acceso y roles pasa a **v1.3** (sección 6). |
| Dashboard | Agrega el aviso "Inscripciones por revisar" al administrador y al ayudante. Dashboard pasa a **v1.1** (sección 6). |
| Organización y evento | Usa el evento vigente `abierto` (nombre, fechas, lugar, logo y nombre del club, que se muestran en el formulario). Sin cambios. |
| Cierre y rendición (v1.1) | Al cerrar el evento, el enlace se desactiva y las solicitudes por revisar quedan vencidas (3.9). |

**Fuera de alcance.**

- Inscribir más de un binomio por envío (decisión de Rod): un jinete con dos caballos envía dos veces. Los clubes que inscriben a muchos usan la plantilla de Importación desde Excel.
- Pagos en línea, links de pago o verificación automática del comprobante (marco §4).
- Correos o mensajes automáticos al remitente (decisión de Rod): la confirmación es la pantalla final; si se rechaza o falta algo, la comisión lo contacta por el teléfono o correo que dejó.
- Consultar el estado de una solicitud o de una inscripción desde el formulario: el formulario solo recibe (marco §9.4).
- Cargos manuales (pensión, alojamiento): se agregan después desde la ficha (Inscripción de binomios §3.4).
- Mostrar al público cualquier registro del portal (clubes, jinetes, caballos, inscritos): el club y el caballo se escriben como texto libre.
- Guardar un borrador en el teléfono del remitente: si cierra la página antes de enviar, pierde lo escrito.
- IA: este componente no la usa.

### Justificación de valor

a. **Problema que reduce o carga que elimina.** Al **administrador** le elimina transcribir inscripciones que llegan por WhatsApp o por teléfono, con datos incompletos o mal escritos: el jinete o su apoderado los escribe una vez y la comisión solo revisa. También le trae el comprobante junto con la inscripción, en vez de buscarlo en un chat. Al **ayudante** le permite aceptar solicitudes desde el celular y, en la misma pantalla, registrar el pago con el comprobante ya adjunto. Para los menores de 14, la autorización del apoderado queda registrada con fecha y con la casilla que marcó (marco §9.3), sin pedir un mensaje aparte.

b. **Métricas del marco (§3) que mueve.** Control de cobranza (inscripciones y pagos entran antes del concurso con su comprobante); trazabilidad (cada inscripción por formulario guarda lo enviado, quién la aceptó y qué se corrigió); cumplimiento (autorización del apoderado con evidencia).

c. **Datos o recursos nuevos.** Entidades `SolicitudInscripcion` (ya prevista en el marco §5) y `EnlaceFormulario` (configuración del enlace por evento). Datos personales nuevos: solo los del **remitente** (nombre, teléfono o correo, relación con el jinete), necesarios para contactarlo, y una huella de su IP para el límite de envíos, que se borra sola (4). El resto son los datos de Participantes. Archivos: el comprobante, en el mismo volumen.

d. **Costo de mantención.** Cero. Misma app, base y volumen (marco §8). Sin servicios de correo, sin captcha de terceros y sin IA.

e. **¿Se resuelve con algo existente?** No. Un Google Forms externo pondría los datos de menores en otra herramienta sin las reglas del portal, obligaría a transcribir y separaría el comprobante de la inscripción. La importación desde Excel sirve para lotes de otros clubes, pero no para que cada familia inscriba desde su celular.

---

## 3. Flujo operativo y experiencia

Escala esperada: **50 binomios o menos** en total (Participantes §3), de los que una parte llegará por formulario. La bandeja cabe en una pantalla.

### 3.1 Configurar el enlace (administrador)

Pantalla **Configuración → Formulario de inscripción** (`/configuracion/formulario`). Hay **un enlace por evento** (decisión de Rod), del evento vigente `abierto`.

| Campo | Regla |
|---|---|
| Activo | Sí o no. Al crear el enlace queda desactivado hasta que el administrador lo activa. |
| Cierre | Fecha y hora opcionales (America/Santiago). Pasado ese momento, el formulario muestra "Inscripciones cerradas" aunque siga activo. |
| Instrucciones de pago | Texto opcional de hasta 600 caracteres, por ejemplo banco, tipo y número de cuenta, titular, RUT y correo para el aviso de transferencia. Se muestra en el formulario y en la pantalla final. Lo escribe el administrador con los datos que entregue el club (t-016). |
| Mensaje inicial | Texto opcional de hasta 400 caracteres que aparece arriba del formulario ("Inscripciones hasta el 14-11. Consultas al +56 9…"). |

- **URL:** `https://<portal>/inscribirse/<token>`, con un token aleatorio de 32 bytes (base64url). En la base se guarda solo su hash SHA-256, así que una copia de la base no permite reconstruir el enlace. El enlace completo se muestra una vez al crearlo o regenerarlo, con **Copiar enlace** y **Compartir por WhatsApp**, y queda visible en la pantalla mientras el administrador no lo regenere (se guarda cifrado con `AUTH_SECRET`; ver 5.2).
- **Regenerar enlace:** crea un token nuevo y el anterior deja de funcionar al instante ("Este enlace ya no es válido"). Sirve si el enlace se filtró a quien no debía o empezó a recibir basura. Confirmación previa: "Quienes tengan el enlace anterior no podrán inscribirse".
- **Vista previa:** botón que abre el formulario tal como lo ve el público, sin poder enviar.
- Todo cambio queda en auditoría (`EnlaceFormulario`: `crear`, `modificar`, `activar`, `desactivar`, `regenerar_enlace`).

### 3.2 Llenar el formulario (público, sin login)

Una sola página, una columna, pensada para el celular, con secciones que se despliegan en orden. Arriba: nombre del club, logo, nombre del evento, fechas y lugar (datos de configuración, no registros) y el mensaje inicial.

1. **Quién inscribe.** "Soy el jinete / Soy el apoderado del jinete / Inscribo en nombre de otro (club, comisión)". Nombre (obligatorio) y **teléfono o correo** (al menos uno, decisión de Rod). Si elige "apoderado", sus datos prellenan el apoderado del paso 3.
2. **Jinete.** Nombre (obligatorio), club que representa (texto libre, obligatorio), fecha de nacimiento (**opcional**, decisión de Rod), contacto y RUT (opcionales, plegados). Con la fecha, se muestra la edad a la fecha de referencia del evento ("12 años al 21-11-2026"). Sin fecha, la nota "Sin fecha no podemos confirmar las pruebas por edad".
3. **Apoderado** (solo si la fecha indica menor de 18). Nombre, teléfono y relación (madre, padre, tutor legal, otro familiar, otro), **obligatorios** en el formulario (ver nota). Se puede agregar un segundo apoderado.
4. **Autorización** (solo si la fecha indica menor de 14). Casilla obligatoria para enviar: "Soy el apoderado de este jinete y autorizo a la comisión organizadora a tratar sus datos para inscribirlo y administrar la tesorería del concurso" (marco §9.3). Si quien llena no es el apoderado, el texto pide que lo haga el apoderado.
5. **Caballo.** Nombre (obligatorio) y club del caballo (texto libre; por defecto, el del jinete).
6. **Pruebas.** Casillas con nombre y tarifa de las pruebas activas del evento, en el orden configurado. Si la fecha indica que el jinete no cumple la edad de una prueba, la casilla muestra "Según la fecha de nacimiento, esta prueba no corresponde a su edad"; **no bloquea**, igual que en el portal (Inscripción de binomios §3.2), y quien revisa lo ve. Al menos una prueba.
7. **Total estimado.** Pruebas marcadas + conceptos activos que se cobran por binomio (la cuota, Inscripción de binomios §3.4) = total. Leyenda: "Total estimado. La comisión confirma el monto al aceptar tu inscripción". Debajo, las instrucciones de pago, si están configuradas.
8. **Pago.** "¿Ya transferiste?" No / Sí. Si es Sí: monto transferido (obligatorio), fecha de la transferencia (obligatoria, no futura) y **comprobante** (foto o PDF, obligatorio), con la misma compresión en el teléfono que Movimientos §3.1 (máximo 10 MB después de comprimir; JPEG, PNG o PDF).
9. **Observaciones** (opcional, hasta 300 caracteres): "¿Algo que la comisión deba saber? No incluyas datos de salud". 
10. **Privacidad.** Texto breve (4) con enlace al aviso completo y casilla obligatoria "Leí el aviso de privacidad".
11. **Enviar.** Un solo envío con datos y archivo, con reintento que conserva lo escrito y no duplica (5.3).

**Nota sobre el apoderado obligatorio:** en el portal, un menor sin apoderado se guarda con alerta (Participantes §3.4). En el formulario, si la fecha indica menor de 18, se pide el apoderado para poder enviar, porque es el único momento en que la comisión tiene al alcance a la familia y el marco §6.11 dice que se exige. Sin fecha, no se pide nada y, al aceptar, el jinete queda con la alerta "Sin fecha de nacimiento" (decisión de Rod).

**Validación:** Zod compartido entre el navegador y el servidor. Nombres de 2 a 80 caracteres, teléfono con `normalizarTelefono` (Participantes), correo con formato válido, RUT con `validarRut` si viene (un RUT inválido se rechaza en el formulario con "Revisa el RUT o déjalo en blanco"), montos enteros de 1 a 999.999.999.

### 3.3 Pantalla final (público)

"Recibimos tu solicitud **N° 12**". Resumen de lo enviado (jinete, caballo, pruebas, total estimado y, si informó pago, el monto), las instrucciones de pago y el texto "La comisión revisará tu inscripción y te contactará si falta algo". Botón **Copiar resumen** (texto plano para guardarlo o reenviarlo). Sin correos (decisión de Rod). El número es correlativo por evento y no permite consultar nada.

**Qué no dice nunca** (marco §9.4): si el jinete, el caballo o el club ya existen, si ya estaba inscrito, si hay otras solicitudes o cuántas. La respuesta es la misma para cualquier envío válido.

### 3.4 Enlace inválido, inactivo o cerrado (público)

| Situación | Qué ve |
|---|---|
| Token inexistente o regenerado | "Este enlace ya no es válido. Pide el enlace actualizado a la comisión." |
| Enlace desactivado, pasada la hora de cierre, o evento no `abierto` | "Las inscripciones por este medio están cerradas. Contacta a la comisión." Con el nombre del evento, sin más datos. |
| Límite de envíos superado (5.3) | "Recibimos muchos envíos desde esta conexión. Intenta más tarde o contacta a la comisión." |

Si el enlace se cierra mientras alguien llena el formulario, al enviar ve el mensaje de cerrado y lo escrito se conserva en la página para que pueda copiarlo.

### 3.5 Bandeja de solicitudes (administrador y ayudante)

Pestaña **Por revisar** en `/inscripciones`, junto a las del padre (Inscripción de binomios §3.12), con contador. También aparece en el Dashboard como aviso (sección 6). Pestañas internas: **Por revisar**, **Aceptadas**, **Rechazadas** y **Vencidas**.

Cada tarjeta muestra folio, fecha de envío, jinete, caballo, pruebas, total estimado, si trae comprobante ("Con comprobante $X") y marcas:

- **Posible repetida:** otra solicitud por revisar o aceptada del evento con el mismo jinete y caballo (nombres normalizados), o un binomio vigente con ese par. Enlace a la otra.
- **Menor:** edad y, si corresponde, "Autorización marcada".
- **Fuera de edad:** alguna prueba no corresponde a la edad.

El observador no ve esta pestaña ni las solicitudes (marco §2.2: no revisa formularios y no ve datos personales).

### 3.6 Revisar y corregir

Al abrir una solicitud (`/inscripciones/solicitudes/[id]`) se ve, en una columna:

1. **Lo enviado**, con opción **Ver original** (lo que escribió el remitente, siempre conservado).
2. **Remitente** con botones **Llamar**, **WhatsApp** (`wa.me` con el teléfono) o **Correo**, según lo que dejó.
3. **Quién es quién.** Para el club del jinete, el jinete, cada apoderado, el caballo y el club del caballo, la propuesta con las reglas de Importación desde Excel §3.6 (decisión de Rod):
   - **Coincidencia exacta:** se muestra "Vincular a <registro existente>" ya elegido.
   - **Parecido:** "¿Es alguno de estos?" con hasta tres opciones (Participantes §3.5) y **Crear nuevo**. Hay que decidir para poder aceptar.
   - **Sin coincidencias:** "Se creará nuevo".
   - **Desactivado:** el administrador puede **Reactivar y vincular**. El ayudante ve "Existe desactivado: pide al administrador que lo reactive" y puede crear uno nuevo (luego se fusiona), igual que en Participantes §3.5.
   - **RUT repetido:** si el RUT del jinete o del club coincide con un registro activo, se vincula a ese registro aunque el nombre difiera (se muestra la diferencia).
4. **Corregir** (decisión de Rod): quien revisa puede editar nombres, club, fecha de nacimiento, contacto, RUT, apoderados, caballo y pruebas (quitar o agregar). Cada cambio se guarda en `corregido` y lo enviado queda intacto. Si una corrección cambia la edad a menor de 14 y el remitente no marcó la autorización, la aceptación deja al jinete con la alerta "Falta autorización del apoderado" (no se inventa una autorización).
5. **Montos.** Cada prueba con la **tarifa vigente** hoy (decisión de Rod) y la cuota automática si el binomio no la tiene. Si la tarifa cambió desde el envío, se muestra "El remitente vio $X; la tarifa actual es $Y". Quien revisa puede ajustar el monto de una prueba con motivo (Inscripción de binomios §3.3; si es un ayudante, genera el aviso "Visto").
6. **Ya inscrito:** si el binomio resuelto ya está inscrito en una prueba marcada, esa prueba se muestra "Ya inscrito" y se omite (igual que Importación §3.6).
7. **Pago** (si la solicitud trae comprobante). Ver 3.7.

Las correcciones y decisiones se guardan al tocar **Guardar revisión** (con `version`), para poder dejarla a medias y seguir después o que la termine otra persona.

**Datos del existente que difieren.** Al vincular, lo que trae la solicitud **no sobrescribe** un campo lleno del registro existente (se muestra como advertencia). Los campos vacíos del existente (fecha de nacimiento, contacto, RUT) se completan **solo si acepta un administrador**, porque completar esos datos es edición (Participantes §3.6); si acepta un ayudante, quedan como advertencia "La solicitud trae la fecha de nacimiento que falta: pásasela al administrador". Agregar un apoderado y registrar la autorización sí los puede hacer el ayudante (Participantes §3.4).

### 3.7 Aceptar (con o sin pago)

Botón **Aceptar**. Si la solicitud trae comprobante, antes del botón aparece la sección **Registrar pago** (decisión de Rod: en la misma aceptación), marcada por defecto y con:

- monto (prellenado con el declarado, editable), fecha de pago (la declarada), medio de pago "Transferencia", nombre de origen (prellenado con el nombre del remitente, editable) y observación opcional;
- el comprobante como respaldo, con vista previa para compararlo;
- el reparto automático sobre los ítems que se crean (Inscripción de binomios §3.6, `repartirMonto`); lo que sobra queda por asignar en el mismo movimiento.

Si quien revisa ve que el comprobante no corresponde (monto ilegible, otra persona, otra fecha), desmarca **Registrar pago** y acepta solo la inscripción. El comprobante queda en la solicitud para registrarlo después a mano, desde la ficha, con el flujo normal (el archivo se puede descargar desde la solicitud).

**En una transacción** (5.6):

1. Crea o vincula clubes, caballo, jinete y apoderados, y los vínculos jinete-apoderado.
2. Si el jinete tiene menos de 14 y el remitente marcó la autorización, registra `autorizacionApoderadoFecha` = fecha de envío de la solicitud, con quien acepta como `autorizacionRegistradaPorId` (Participantes §3.4). Si el jinete existente ya tenía una fecha, no se cambia.
3. Llama a `inscribir` con las pruebas no omitidas: binomio (nuevo o existente), inscripciones con la tarifa vigente o el monto ajustado, y cuota automática.
4. Si **Registrar pago** está marcado, llama a `registrarPagoInscripciones` con el comprobante como respaldo. El movimiento queda **validado** si acepta un administrador y **por validar** si acepta un ayudante (Movimientos §3.1; el ayudante no valida lo suyo).
5. Marca la solicitud `aceptada`, con quien aceptó, cuándo, el binomio y, si hubo pago, el movimiento.
6. Auditoría: un registro `aceptar` en la solicitud más los que dejan `inscribir`, la creación de participantes y el pago con sus propias funciones.

Resultado: "Aceptada. Binomio <jinete> – <caballo> inscrito en N pruebas. Total $X" y, si hubo pago, "Pago $Y registrado". Enlaces a la ficha del binomio y a **Contactar al remitente** (WhatsApp con un texto prellenado: "Hola, tu inscripción N° 12 fue aceptada. Total $X, pagado $Y"). El texto no incluye datos de otros binomios.

Si algo cambió desde que se guardó la revisión (otra persona inscribió ese binomio, alguien aceptó otra solicitud que creó el mismo jinete, una prueba se desactivó), la aceptación se rechaza con "La solicitud cambió; revísala de nuevo" y se recalcula la propuesta (5.6).

### 3.8 Rechazar

Botón **Rechazar** con motivo obligatorio (hasta 200 caracteres): "Solicitud repetida", "Datos falsos", "Inscrito por otra vía", etc. No crea nada. La solicitud queda `rechazada`, visible en su pestaña, y se ofrece **Contactar al remitente** (el texto de WhatsApp no se prellena con el motivo, para que quien escribe decida qué decir).

- **Rechazada con comprobante:** si trae comprobante, se muestra el aviso "Esta solicitud informó un pago de $X. Si el dinero llegó, regístralo o devuélvelo". Un rechazo no mueve dinero.
- **Reabrir:** el administrador puede devolver una rechazada a por revisar (con motivo) mientras sus datos no se hayan eliminado (4).
- **Solicitudes basura:** "Rechazar como basura" rechaza sin exigir motivo escrito y elimina de inmediato los datos personales y el comprobante (solo administrador, para no perder pagos reales por error).

### 3.9 Vencer y cerrar

- Cuando el evento deja de estar `abierto` (Cierre y rendición), el enlace deja de recibir envíos y las solicitudes por revisar pasan a `vencida`. Una vencida con comprobante muestra el mismo aviso de pago de 3.8. Las vencidas siguen las reglas de conservación de las rechazadas (4).
- No hay vencimiento por tiempo mientras el evento está abierto: la bandeja es corta y el contador en el Dashboard mantiene visible lo pendiente.

### 3.10 Casos borde revisados

| Caso | Qué pasa |
|---|---|
| Jinete con dos caballos | Dos envíos. La segunda solicitud vincula al mismo jinete y no repite la cuota por binomio (es otro binomio, y la cuota es por binomio). |
| Un caballo con dos jinetes | Dos solicitudes, dos binomios. El caballo se vincula al existente por nombre y club. |
| La misma solicitud enviada dos veces (doble toque, mala señal) | La `claveCliente` del formulario evita duplicarla (5.3). Si el remitente la llenó de nuevo, la marca "Posible repetida" y el "Ya inscrito" al aceptar la segunda lo resuelven; se rechaza la sobrante. |
| Un club paga por transferencia a varios binomios | Cada familia no adjunta nada. El pago del club se registra en el portal con el flujo normal (Inscripción de binomios §3.6, reparto entre varios). |
| Comprobante de un monto que cubre a dos hermanos | Se acepta la primera con el pago; lo que sobra queda por asignar. Al aceptar la segunda, sin pago, se asigna lo por asignar desde la pestaña del padre (§3.7). |
| Comprobante que no corresponde o ilegible | Se acepta sin pago (3.7) y se contacta al remitente. |
| El dinero llega pero la solicitud se rechaza | Aviso en el rechazo (3.8). Se registra como pago de quien corresponda o se devuelve con el flujo del padre. |
| Transferencia informada que después aparece en la cartola | La conciliación (v1.1) la cruza con el movimiento creado al aceptar, como cualquier otro. |
| Menor de 14 sin casilla porque no puso fecha | Se acepta y el jinete queda con las alertas "Sin fecha de nacimiento" (y, cuando se complete la fecha, "Falta autorización del apoderado"). |
| Remitente escribe datos de salud en observaciones | La leyenda lo desaconseja. Quien revisa puede **Borrar observaciones** antes de aceptar; se borran de lo enviado y de lo corregido, con auditoría sin copiar el texto. |
| Club escrito distinto ("Club Parronal", "Parronal", "CEP") | La propuesta de parecidos lo muestra; quien revisa elige. |
| Prueba desactivada después del envío | Se muestra "Prueba no disponible" y queda fuera; quien revisa puede cambiarla por otra. |
| Tarifa cambiada después del envío | Se usa la vigente y se muestra la diferencia (3.6). |
| Dos personas revisan la misma solicitud a la vez | `version` en la solicitud: la segunda en guardar o aceptar recibe "La solicitud cambió". |
| Robot o envío masivo | Campo trampa, tiempo mínimo y límites por IP y por enlace (5.3). El administrador puede regenerar el enlace o desactivarlo. |
| Alguien prueba nombres para averiguar si un jinete está inscrito | La respuesta es siempre la misma pantalla con folio (3.3). |
| Uso desde el celular en la cancha con señal baja | Un solo envío con reintento; la foto se comprime antes; lo escrito se conserva si falla. |
| El remitente pide borrar sus datos | El administrador edita o suprime desde la solicitud o desde Participantes (4). |

---

## 4. Cumplimiento normativo

Aplica: el componente recibe **sin login** datos personales de jinetes, incluidos **menores de edad**, de apoderados y del remitente, y comprobantes con datos bancarios de terceros. Lo transversal está en el marco §9. Aquí solo va lo específico.

**Normativa y vigencia (verificada el 2026-09-27).** Ley 19.628, vigente. Ley 21.719: entra en vigencia el **2026-12-01**. El proyecto de prórroga a 2027-12-01 (Boletín 18.623-07) sigue en primer trámite en el Senado, sin aprobar ni publicar. El diseño cumple la Ley 21.719 desde el inicio (marco §9.1), incluida la regla de que los datos de menores de 14 años se tratan con la autorización de sus padres o representantes.

**Datos tratados.**

| Titular | Datos | Nota |
|---|---|---|
| Remitente | Nombre, teléfono o correo, relación con el jinete | Nuevo en el marco §9.2 (sección 6). Solo para contactarlo por esta solicitud. |
| Jinete, apoderado, club, caballo | Los de Participantes §3.1 | Sin datos nuevos. No se piden domicilio ni salud (marco §9.3). |
| Terceros en el comprobante | Nombre, banco y cuenta que aparezcan | Igual que los respaldos de Movimientos: acceso restringido. |
| Conexión | Huella de la IP (hash con clave secreta) | Solo para el límite de envíos. Nunca se guarda la IP en claro y la huella se elimina a las 24 horas (5.3). |

**Base de licitud.** La del marco §9.2: la relación de inscripción al concurso, que la inicia el propio remitente. En menores de 14, la autorización del apoderado con la casilla del paso 4 (marco §9.3), guardada con la solicitud aceptada como evidencia (texto de la casilla, versión y fecha). La aceptación del aviso de privacidad queda con su versión (`AVISO_PRIVACIDAD_VERSION`, Acceso y roles §3.8).

**Texto breve de privacidad** (paso 10; adaptado del aviso de Acceso y roles, que es el dueño):

> La comisión organizadora del concurso usa estos datos solo para inscribir al binomio y administrar y rendir la tesorería del evento. No se publican ni se ceden a terceros. Se conservan hasta un año después de que el club aprueba la rendición del evento; si la inscripción no se acepta, se eliminan a los 30 días. No incluyas datos de salud. Para acceder, corregir o suprimir los datos, escribe a la comisión. [Aviso completo]

**Medidas de protección** (además del marco §9.4):

- **Solo envío:** la ruta pública no lee ningún registro de participantes, inscripciones ni movimientos. Solo lee la configuración del enlace, del evento, de las pruebas y conceptos activos, y el nombre y logo de la organización. Una prueba automática lo verifica (5.9).
- **Respuesta uniforme:** mismo mensaje y mismo tiempo aproximado de respuesta para todo envío válido (3.3).
- **Límites:** campo trampa, tiempo mínimo de llenado y límites de envíos (5.3).
- **Archivos:** tipo verificado por contenido, máximo 10 MB, guardado fuera de rutas públicas, servido solo con `revisar_formulario` (5.2).
- **Acceso interno:** solo administrador y ayudante ven solicitudes y comprobantes. El observador no (marco §2.2).
- **Token del enlace:** hash en la base y regeneración inmediata (3.1).

**Conservación.**

- **Aceptada:** lo enviado y lo corregido se conservan como evidencia de la inscripción y de la autorización del apoderado, con la misma regla de los demás datos: hasta la rendición aprobada más 1 año (marco §9.5). El comprobante pasa a ser el respaldo del movimiento, si se registró el pago; si no, se conserva en la solicitud con la misma regla.
- **Rechazada o vencida:** a los **30 días** de rechazarse o vencer se eliminan lo enviado, lo corregido, los datos del remitente y el comprobante. Quedan el folio, las fechas, el estado, quién la rechazó y el motivo. "Rechazar como basura" elimina de inmediato. Propuesta de este documento para cumplir la minimización; el plazo de 30 días permite reabrir un rechazo equivocado.
- **Huella de IP:** se elimina a las 24 horas.
- La eliminación se hace al abrir la bandeja, sin tareas programadas (igual que Importación §5.2).

**Derechos de los titulares.** El remitente o el apoderado los ejerce escribiendo a la comisión (marco §9.6). Sobre una solicitud, el administrador puede corregir lo corregido, borrar observaciones y **Eliminar datos de la solicitud** (sobre una rechazada o vencida, o sobre una aceptada cuyo titular pide supresión, dejando lo creado en Participantes para tratarlo con sus propias reglas). Auditoría sin copiar los valores eliminados.

**Registro y trazabilidad.** Auditoría de configuración del enlace, revisión, aceptación, rechazo, reapertura y eliminación de datos (5.8). Los envíos públicos no generan auditoría por sí mismos: la solicitud es su propio registro.

---

## 5. Especificación de ejecución

Stack heredado del marco §8. Código en `src/dominio/inscripciones/formulario/`. Columnas en `snake_case` con `@map`.

### 5.1 Modelo de datos (Prisma)

```prisma
enum EstadoSolicitud { por_revisar aceptada rechazada vencida }
enum RemitenteRol { jinete apoderado otro }

model EnlaceFormulario {
  id                  String    @id @default(cuid())
  organizacionId      String
  eventoId            String    @unique           // uno por evento
  tokenHash           String    @unique           // sha256 del token
  tokenCifrado        String                      // token cifrado con AUTH_SECRET, para mostrar el enlace
  activo              Boolean   @default(false)
  cierraEn            DateTime?
  instruccionesPago   String?                     // hasta 600
  mensajeInicial      String?                     // hasta 400
  creadoPorId         String
  version             Int       @default(1)
  creadoEn            DateTime  @default(now())
  actualizadoEn       DateTime  @updatedAt
  @@index([organizacionId])
}

model SolicitudInscripcion {
  id                      String          @id @default(cuid())
  organizacionId          String
  eventoId                String
  folio                   Int             // correlativo por evento
  estado                  EstadoSolicitud @default(por_revisar)
  claveCliente            String          // idempotencia del envío
  enviado                 Json?           // DatosSolicitud (5.4) tal como llegó; null si se eliminó
  corregido               Json?           // DatosSolicitud con correcciones; null si no hay
  decisiones              Json?           // quién es quién (5.4)
  remitenteNombre         String?
  remitenteRol            RemitenteRol?
  remitenteTelefono       String?
  remitenteCorreo         String?
  autorizacionMarcada     Boolean         @default(false)
  autorizacionTexto       String?         // texto de la casilla mostrado
  avisoPrivacidadVersion  String
  totalEstimadoClp        Int             // lo que vio el remitente
  pagoDeclaradoClp        Int?
  pagoDeclaradoFecha      DateTime?       @db.Date
  comprobanteRuta         String?         // relativa a RUTA_RESPALDOS; null si no hay o se eliminó
  comprobanteMime         String?
  comprobanteBytes        Int?
  ipHuella                String?         // hmac de la IP; se borra a las 24 h
  enviadoEn               DateTime        @default(now())
  posibleRepetidaDeId     String?
  revisadoPorId           String?         // último que guardó la revisión
  resueltoPorId           String?         // quien aceptó, rechazó o dejó vencida
  resueltoEn              DateTime?
  motivoRechazo           String?
  binomioId               String?         // resultado de aceptar
  movimientoId            String?         // pago registrado al aceptar
  datosEliminadosEn       DateTime?
  version                 Int             @default(1)
  actualizadoEn           DateTime        @updatedAt
  @@unique([eventoId, folio])
  @@unique([organizacionId, claveCliente])
  @@index([organizacionId, eventoId, estado])
  @@index([ipHuella, enviadoEn])
}
```

**Restricciones por migración SQL:**

- `CHECK`: `estado <> 'aceptada' OR (resuelto_por_id IS NOT NULL AND binomio_id IS NOT NULL)`; `estado <> 'rechazada' OR motivo_rechazo IS NOT NULL`; `remitente_telefono IS NOT NULL OR remitente_correo IS NOT NULL OR datos_eliminados_en IS NOT NULL`; `pago_declarado_clp IS NULL OR pago_declarado_clp BETWEEN 1 AND 999999999`; `comprobante_bytes IS NULL OR comprobante_bytes BETWEEN 1 AND 10485760`.
- Claves foráneas de `binomio_id` a `binomio.id` y de `movimiento_id` a `movimiento.id`.
- **Folio:** se asigna en la transacción del envío con `SELECT COALESCE(MAX(folio), 0) + 1 … FOR UPDATE` sobre el `EnlaceFormulario` del evento (bloqueo de la fila del enlace, que serializa los envíos; con esta escala no hay contención).

Ambos modelos llevan `organizacionId` y pasan por `db(ctx)` en todo lo interno. La ruta pública es la única que los escribe sin contexto de usuario (5.3).

### 5.2 Archivos y token

- **Comprobante:** `RUTA_RESPALDOS/solicitudes/<organizacionId>/<solicitudId>.<ext>`, mismo volumen, fuera de rutas públicas. Tipos por contenido (bytes iniciales): JPEG, PNG y PDF; HEIC se convierte en el teléfono o se rechaza, igual que Movimientos §5.
- **Descarga:** `/api/solicitudes/[id]/comprobante`, solo con `revisar_formulario` y de la misma organización.
- **Al registrar el pago:** el archivo se **copia** a la ruta de respaldos del movimiento antes de la transacción y se crea el `Respaldo` en ella (5.6). Si la transacción falla, se borra la copia. Si confirma, se borra el archivo de la solicitud y `comprobanteRuta` apunta al respaldo (`respaldo:<id>`) para que la solicitud siga mostrándolo.
- **Token:** `crypto.randomBytes(32)` en base64url. `tokenHash = sha256(token)`. `tokenCifrado` con AES-256-GCM y una clave derivada de `AUTH_SECRET` (HKDF, contexto `"enlace-formulario"`), solo para volver a mostrar el enlace al administrador.

### 5.3 Ruta pública y envío

- **Rutas:** página `/inscribirse/[token]` y acción de servidor `enviarSolicitud`. El middleware de Acceso y roles §5.5 las excluye de la exigencia de sesión (sección 6). No usan `obtenerContexto`: resuelven la organización y el evento desde el enlace con `resolverEnlacePublico(token)`, que busca por `tokenHash` y devuelve **solo** la configuración pública (5.4). Todo el resto de las consultas de la ruta usa un cliente acotado a esa organización (`db` con el `organizacionId` del enlace).
- **Idempotencia:** el formulario genera una `claveCliente` (UUID) al abrirse. Si llega de nuevo, se responde con el mismo folio sin crear otra.
- **Campo trampa:** un campo de texto oculto con CSS y `autocomplete="off"`. Si viene con contenido, se responde la pantalla final con un folio falso de la forma `N° —` y no se guarda nada.
- **Tiempo mínimo:** la página incluye un sello de tiempo firmado (HMAC con `AUTH_SECRET`). Si se envía antes de 8 segundos o con el sello inválido o de más de 24 horas, se trata como el campo trampa.
- **Límites** (contados en la base, sin memoria ni servicios externos): por huella de IP, 5 solicitudes por hora y 20 por día; por enlace, 200 por día. La huella es `HMAC-SHA256(AUTH_SECRET, ip)`, tomando la IP del encabezado que entrega Railway. Superado el límite, mensaje de 3.4 y nada se guarda.
- **Transacción del envío:** valida con Zod (`esquemaSolicitudPublica`), verifica que el enlace esté activo, antes del cierre y con el evento `abierto`, que cada `pruebaId` sea una prueba activa del evento, calcula `totalEstimadoClp` con las tarifas vigentes y la cuota, guarda el archivo, bloquea el enlace, asigna folio, calcula `posibleRepetidaDeId` y crea la solicitud. Si falla después de guardar el archivo, lo borra.
- **Tamaño:** cuerpo máximo de 11 MB en esta ruta.

### 5.4 Funciones de dominio (con pruebas)

```ts
type DatosSolicitud = {
  remitente: { rol: RemitenteRol; nombre: string; telefono?: string; correo?: string };
  jinete: { nombre: string; club: string; fechaNacimiento?: string; contacto?: string; rut?: string };
  apoderados: { nombre: string; telefono: string; relacion: RelacionApoderado }[]; // 0 a 2
  caballo: { nombre: string; club: string };
  pruebas: { pruebaId: string; montoClp?: number; motivo?: string }[]; // monto y motivo solo en corregido
  observaciones?: string;
};

type Decisiones = Record<"clubJinete" | "jinete" | "caballo" | "clubCaballo" | `apoderado${0 | 1}`,
  { accion: "vincular" | "crear" | "reactivar_vincular"; id?: string }>;
```

- `resolverEnlacePublico(token)` → `{ enlace, evento: { nombre, fechas, lugar, fechaReferenciaEdad }, organizacion: { nombre, logo }, pruebas: [{ id, nombre, tarifaClp, edadMinima, edadMaxima }], conceptosBinomio: [{ nombre, tarifaClp }] } | null`. Nada más.
- `esquemaSolicitudPublica(evento)`: Zod de 3.2, incluidas las reglas condicionales por edad (apoderado si menor de 18 con fecha; casilla si menor de 14 con fecha; al menos teléfono o correo; comprobante obligatorio si informa pago).
- `coincidenciaParticipante(listas, entidad, datos)`: la regla por entidad de Importación desde Excel §3.6 (exacta, parecidos, desactivado, RUT). Se extrae del código de Importación (`resolverFilas` la usa) para que ambas vías compartan una sola implementación. Usa `buscarParecidos` (Participantes §5).
- `proponerSolicitud(ctx, solicitud)` → `{ propuesta: Decisiones, parecidos, advertencias, pruebas: [{ pruebaId, tarifaVigente, tarifaVista, yaInscrito, disponible, avisoEdad }], cuota, total }`. Carga una vez las listas de la organización y resuelve en memoria.
- `firmarPropuesta(propuesta)` → `sha256` canónico de ids resueltos, pruebas y omitidas, para detectar cambios entre la revisión y la aceptación (igual que Importación §5.4).
- `posibleRepetida(ctx, eventoId, jinete, caballo)` → id de otra solicitud o binomio con el mismo par normalizado.
- `purgarSolicitudes(ctx)`: borra lo de 4 (rechazadas y vencidas con más de 30 días, huellas de IP con más de 24 horas) y deja `datosEliminadosEn`. Se llama al abrir la bandeja.
- `vencerSolicitudesDelEvento(tx, eventoId)`: la llama Cierre y rendición al cerrar el evento (3.9).

### 5.5 Acciones de servidor (internas)

Todas con Zod, `obtenerContexto`, `exigir(ctx, accion)`, evento vigente `abierto`, `exigirDeLaOrganizacion` sobre cada id recibido y `version`.

| Función | Permiso | Efecto |
|---|---|---|
| `crearEnlace()`, `editarEnlace(datos, version)`, `activarEnlace`, `desactivarEnlace`, `regenerarEnlace(version)` | `configurar` | 3.1. |
| `guardarRevision(id, { corregido?, decisiones? }, version)` | `revisar_formulario` | 3.6. Rechaza `reactivar_vincular` si no tiene `participantes.administrar`. |
| `aceptarSolicitud(id, { firma, pago? }, version)` | `revisar_formulario` e `inscripciones.inscribir` | 3.7 y 5.6. |
| `rechazarSolicitud(id, motivo, version)` | `revisar_formulario` | 3.8. |
| `rechazarComoBasura(id, version)` | `revisar_formulario` y `inscripciones.administrar` | 3.8, elimina datos y archivo. |
| `reabrirSolicitud(id, motivo, version)` | `revisar_formulario` e `inscripciones.administrar` | 3.8. |
| `borrarObservaciones(id, version)` | `revisar_formulario` | 3.10. |
| `eliminarDatosSolicitud(id, version)` | `inscripciones.administrar` | 4. |

Consultas: `listarSolicitudes(estado)`, `contadorPorRevisar()`, `detalleSolicitud(id)` (con `proponerSolicitud`). Todas exigen `revisar_formulario`.

### 5.6 Aceptación

En **una transacción** (`db(ctx).$transaction`, nivel `Serializable`, un reintento ante conflicto de serialización):

1. Bloquea la solicitud (`SELECT … FOR UPDATE`). Si ya está `aceptada` con la misma `version`, devuelve el resultado (idempotencia). Si no está `por_revisar`, la rechaza.
2. Recalcula `proponerSolicitud` con los datos actuales y `corregido`, aplica `decisiones` y compara con la `firma` recibida. Si difiere, lanza `SolicitudDesactualizada` (3.7).
3. Crea o vincula, pasando `tx` y con las **mismas funciones internas** de Participantes: clubes, caballo, jinete (completando campos vacíos solo si `ctx` tiene `participantes.administrar`, 3.6), apoderados y vínculos; reactivaciones con `reactivar<Entidad>`; autorización según 3.7, paso 2.
4. `inscribir(tx, ctx, { jineteId, caballoId, clubId, pruebas, claveCliente: "sol:<solicitudId>" })` (Inscripción de binomios §5.3). El `clubId` del binomio es el club del jinete resuelto.
5. Si viene `pago`: `registrarPagoInscripciones(tx, ctx, { montoClp, fechaPago, medio: "transferencia", nombreOrigen, observacion, claveCliente: "sol-pago:<solicitudId>" }, { respaldoExistente: rutaCopiada }, reparto)` con el reparto automático sobre los ítems creados en el paso 4. Validación según el rol (Movimientos §3.1).
6. Actualiza la solicitud: `aceptada`, `resueltoPorId`, `resueltoEn`, `binomioId`, `movimientoId`, `ipHuella = null`.
7. `registrarAuditoria` con acción `aceptar` y los ids creados o vinculados.

Después de confirmar: borra el archivo original de la solicitud si se copió (5.2).

### 5.7 Permisos

Se usan acciones existentes: `revisar_formulario` (administrador y ayudante, marco §2.2), `configurar` (administrador), `inscripciones.inscribir`, `inscripciones.administrar` y `participantes.administrar`. No se agregan acciones.

### 5.8 Auditoría

Con `registrarAuditoria` (marco §6.8). Entidades `EnlaceFormulario` y `SolicitudInscripcion`. Acciones: `crear`, `modificar`, `activar`, `desactivar`, `regenerar_enlace`, `guardar_revision`, `aceptar`, `rechazar`, `rechazar_basura`, `reabrir`, `borrar_observaciones`, `eliminar_datos`, `vencer`. En las que eliminan datos no se copian los valores eliminados. El envío público no se audita: la solicitud es su registro.

### 5.9 Pantallas

| Ruta o componente | Acceso | Contenido |
|---|---|---|
| `/inscribirse/[token]` | Público | Formulario de 3.2, pantalla final de 3.3 y mensajes de 3.4. Sin menú, sin enlaces al portal salvo `/privacidad`. |
| `/configuracion/formulario` | Administrador | 3.1, con copiar, compartir, regenerar y vista previa. |
| Pestaña **Por revisar** en `/inscripciones` | Administrador y ayudante | Bandeja de 3.5 con contador. |
| `/inscripciones/solicitudes/[id]` | Administrador y ayudante | Revisión, aceptación y rechazo (3.6 a 3.8). |
| `<CompresorArchivo>` | Público e interno | El mismo componente de Movimientos §3.1. |

Celular primero (marco §7, principio 6): una columna, botones de al menos 44 px, teclado numérico en montos, `type="tel"` y `type="email"` en contacto, `type="date"` en fechas.

### 5.10 Pruebas (Vitest)

- **Solo envío:** `resolverEnlacePublico` y `enviarSolicitud` no leen ninguna tabla de participantes, inscripciones ni movimientos (se verifica con un cliente espía); la respuesta para un jinete existente y uno nuevo es idéntica.
- **Enlace:** token inválido, regenerado, inactivo, cerrado por hora y evento no abierto responden según 3.4; el token no se guarda en claro.
- **Validación:** apoderado obligatorio con fecha de menor de 18; casilla obligatoria con fecha de menor de 14; sin fecha no pide apoderado; teléfono o correo; comprobante obligatorio si informa pago; prueba de otro evento o inactiva rechazada.
- **Abuso:** campo trampa y tiempo mínimo no guardan nada y responden igual; límites por IP y por enlace; idempotencia por `claveCliente`.
- **Folio:** correlativo sin repetirse con envíos concurrentes.
- **Resolución:** exacta vincula, parecido exige decisión, desactivado solo lo reactiva el administrador, RUT repetido vincula; misma función que Importación.
- **Aceptar:** crea o vincula y llama a `inscribir` una sola vez; tarifa vigente; "Ya inscrito" omitido; autorización registrada con la fecha de envío solo si la casilla se marcó; el ayudante no completa campos vacíos del existente; con pago, un movimiento de "Inscripciones" con el comprobante como respaldo, validado si acepta un administrador y por validar si acepta un ayudante; sobrante por asignar; firma distinta lanza `SolicitudDesactualizada`; si falla el pago, no queda nada creado ni archivo copiado.
- **Rechazar y conservar:** rechazo con motivo; basura elimina de inmediato; purga a los 30 días deja folio, estado y motivo; huella de IP eliminada a las 24 horas.
- **Aislamiento y permisos:** con dos organizaciones, un enlace de una no crea nada en la otra; el observador recibe 403 en bandeja, detalle y comprobante; el ayudante no regenera ni configura el enlace.

---

## 6. Elementos que quedan obsoletos

**Marco general, desviaciones declaradas.** Al aprobarse este documento, el marco sube a **v1.6**:

- **§4 (v1.1) y §9.4:** "el formulario no muestra ningún dato del portal" se precisa como "no muestra ni confirma ningún registro (participantes, inscripciones, pagos); muestra solo la configuración del evento (nombre, fechas, lugar, logo y nombre del club, pruebas y conceptos con sus tarifas e instrucciones de pago)". Se agrega "un binomio por envío, con comprobante opcional que se registra como pago al aceptar".
- **§5:** entidad `EnlaceFormulario` (enlace público del formulario, uno por evento). `SolicitudInscripcion` ya existe.
- **§9.2:** fila "Remitente del formulario: nombre, teléfono o correo y relación con el jinete; base: iniciativa del propio remitente para inscribir".
- **§9.5:** solicitudes rechazadas o vencidas: sus datos se eliminan a los 30 días (4).

**Inscripción de binomios (padre), v1.3:** `registrarPagoInscripciones` acepta una transacción externa (`tx`) y un respaldo ya guardado (`respaldoExistente`), igual que `inscribir` acepta `tx` desde v1.1. La fila "Formulario de inscripción" de §2 pasa a decir que la aceptación usa `inscribir` y, si trae comprobante, `registrarPagoInscripciones` en la misma transacción. La pestaña **Por revisar** se agrega a `/inscripciones` (§3.12, §5.5).

**Movimientos, v1.3:** `registrarMovimientoSistema` acepta, en lugar de un archivo subido, la ruta de un archivo ya copiado a `RUTA_RESPALDOS/movimientos/…` (5.2), con las mismas verificaciones de tipo y tamaño.

**Acceso y roles, v1.3:** el middleware (§5.5) excluye `/inscribirse/*` de la exigencia de sesión. El aviso completo (`/privacidad`, §3.8) agrega los datos del formulario (remitente y comprobante) y la eliminación a los 30 días de las solicitudes no aceptadas. La versión del aviso sube.

**Importación desde Excel, v1.1:** §5.4 indica que la regla por entidad de §3.6 vive en `coincidenciaParticipante`, compartida con este documento. No cambia su comportamiento.

**Dashboard, v1.1:** `avisosAdministrador` agrega `solicitudesPorRevisar` (§5), y `loMio` del ayudante agrega el mismo contador, porque el ayudante también revisa (marco §2.2).

**Participantes:** sin cambios. Se usan sus funciones y reglas tal cual.

**Procesos:** quedan redundantes la recepción de inscripciones por WhatsApp o llamada y su transcripción, y pedir por separado la autorización de menores de 14 a quienes se inscriben por el formulario (la tarea t-012 sigue vigente para las inscripciones a mano y por Excel).

**Tareas:** se agrega **t-016 (club)**: definir con el club los datos de la cuenta para transferir que se muestran en el formulario y hasta cuándo se reciben inscripciones por este medio.

Código: ninguno, revisado: el repositorio solo tiene documentación.

---

## 7. Plan de acción

| # | Paso | Depende de |
|---|---|---|
| 1 | Modelos de 5.1, restricciones y migración | Inscripción de binomios paso 1 |
| 2 | Extraer `coincidenciaParticipante` de Importación (o crearla aquí si Importación aún no está) con sus pruebas | Participantes (`buscarParecidos`) |
| 3 | `EnlaceFormulario`: token, cifrado, `/configuracion/formulario` | 1 |
| 4 | Middleware y `resolverEnlacePublico`; página pública con validación Zod y total estimado | 3; Acceso y roles |
| 5 | `enviarSolicitud`: idempotencia, campo trampa, tiempo mínimo, límites, folio, comprobante | 4 |
| 6 | Bandeja y detalle con `proponerSolicitud`, correcciones y decisiones | 2, 5 |
| 7 | `registrarPagoInscripciones` con `tx` y `respaldoExistente`; `registrarMovimientoSistema` con ruta copiada | Inscripción de binomios paso 8; Movimientos |
| 8 | `aceptarSolicitud` sin pago, luego con pago | 6, 7 |
| 9 | Rechazar, basura, reabrir, borrar observaciones, eliminar datos y purga | 6 |
| 10 | Aviso en el Dashboard y contador en `/inscripciones` | 6 |
| 11 | Texto de privacidad actualizado (Acceso y roles v1.3) | — |
| 12 | Prueba en celular: llenar con señal baja y un comprobante, aceptar como ayudante y validar como administrador | 8 |

**Recortables si el plazo aprieta**, sin cambiar el modelo: regenerar el enlace (paso 3; se desactiva y se crea uno nuevo desde la base), "Rechazar como basura" y "Reabrir" (paso 9), la marca "Posible repetida" (el "Ya inscrito" al aceptar la cubre en parte) y los botones de WhatsApp. **No se recortan:** límites de envío, autorización del apoderado, conservación y purga, y la aceptación en una transacción.

---

## 8. Riesgos

| Riesgo | Tipo | Mitigación |
|---|---|---|
| Envíos basura que llenan la bandeja y el volumen | Técnico | Campo trampa, tiempo mínimo, límites por IP y enlace, tamaño máximo, regenerar o desactivar el enlace (5.3). |
| El formulario revela quién está inscrito | Normativo | Solo envío, respuesta uniforme, prueba automática de que la ruta no lee registros (4, 5.10). |
| Enlace compartido fuera del público previsto | Operativo | Revisión humana antes de crear nada (marco §9.4); regenerar enlace. |
| Comprobante falso o que no corresponde | Operativo | Quien acepta lo compara; el pago del ayudante queda por validar; la conciliación con cartola (v1.1) lo cruza con el banco. |
| El comprobante se registra y además alguien registra el mismo pago a mano | Operativo | Aviso de posible duplicado de Movimientos (marco §6.9); el ítem ya aparece pagado. |
| Menor de 14 inscrito sin fecha y sin autorización | Normativo | Alerta "Sin fecha de nacimiento" en el portal hasta que se complete; la comisión pide la autorización por la vía de t-012. |
| Datos de salud en observaciones | Normativo | Leyenda en el campo, "Borrar observaciones" y eliminación a los 30 días si no se acepta. |
| Solicitudes que nadie revisa | Operativo | Contador en `/inscripciones` y aviso en el Dashboard para administrador y ayudante. |
| Duplicados de jinetes o caballos | Operativo | Misma resolución que Importación; decisión humana en los parecidos; fusión después (Participantes §3.7). |
| Tarifa cambiada entre el envío y la aceptación | Experiencia | Se muestra la diferencia; ajuste con motivo si la comisión quiere respetar lo que vio el remitente. |
| El componente no cabe antes del concurso | Plazo | Es v1.1; recortables en 7. Mientras no esté, se inscribe a mano o por Excel. |
| Costo | Costo | Ninguno adicional: sin correo, sin captcha de terceros, sin IA. |

---

## 9. Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 0.1 | Primer borrador para revisión | Sesión con Rod: un binomio por envío; enlace único por evento con activar, fecha de cierre y regenerar; el formulario muestra tarifas, total estimado e instrucciones de pago y permite adjuntar comprobante; el pago se registra en la misma aceptación; revisión con vínculo a lo existente usando las reglas de Importación; fecha de nacimiento opcional y, sin ella, solo la alerta; contacto por teléfono o correo; tarifa vigente al aceptar; quien revisa puede corregir datos y pruebas; pantalla con folio sin correos; campo trampa y límites sin terceros |
