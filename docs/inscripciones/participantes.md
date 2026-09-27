# Participantes

Estado: Aprobado · Versión 1.0 · Responsable: Rod (Administrador) · Ejecutor: Claude Code

## 1. Índice

- **Padre:** `docs/marco-general/marco-general-proyecto.md`. Alcance dentro del padre: entidades `Club`, `Jinete`, `Apoderado` y `Caballo` (§5), jinetes, caballos y edad (§6.11), minimización y menores de edad (§9.3), derechos de los titulares (§9.6).
- **Hijos:** ninguno.
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

**Qué es.** El registro único, por organización, de las personas y los animales que participan en el concurso: clubes o sociedades, jinetes o amazonas, apoderados y caballos. Define qué datos se piden de cada uno, cómo se calcula la edad, qué alertas se muestran para los menores de edad, cómo se evitan y se corrigen duplicados, y qué ve cada rol. No maneja dinero ni inscripciones: entrega los datos y los selectores que usan Inscripción de binomios, Importación desde Excel y, en v1.1, el Formulario de inscripción.

**Versión:** v1.0 (en uso al 2026-10-04).

**Conexión con el proyecto.**

| Documento | Relación |
|---|---|
| Organización y evento (`docs/organizacion/organizacion-evento.md`) | Depende de este. Usa `fechaReferenciaEdadEfectiva(evento)`, `normalizarNombre`, `validarRut`, la regla de nombres parecidos (§3.5), `db(ctx)`, `exigirDeLaOrganizacion` y `registrarAuditoria` (§5.1, §5.2). Le entrega la consulta de jinetes afectados por un cambio de fechas del evento (Organización y evento §3.2), definida en 5.3. |
| Acceso y roles (`docs/acceso/acceso-roles.md`) | Aplica la matriz de permisos con `exigir(ctx, accion)`. Este documento agrega acciones a esa tabla (5.4). |
| Inscripción de binomios (`docs/inscripciones/inscripcion-binomios.md`) | Depende de este. Usa `<SelectorJinete>`, `<SelectorCaballo>` y `<SelectorClub>`, la función `edadEnEvento` para las categorías por edad y las alertas del jinete (3.4). **Queda para ese documento:** el `Binomio` guarda su propio `clubId`, que se copia del club del jinete al crearlo y se puede cambiar solo para ese evento (decisión de Rod); si luego cambia el club del jinete, los binomios existentes no cambian. También la reasignación de binomios al fusionar jinetes, caballos o clubes (3.7). |
| Importación desde Excel (`docs/inscripciones/inscripcion-binomios/importacion-excel.md`) | Usa las mismas funciones de validación y de búsqueda de parecidos (5.3) para la vista previa. El menor sin apoderado es **advertencia**, no error (3.4). |
| Formulario de inscripción (v1.1) | Crea o vincula jinetes, apoderados, caballos y clubes con las mismas reglas al aceptar una solicitud. |
| Movimientos (`docs/movimientos/movimientos.md`) | Sin dependencia directa. Un `Club` que paga inscripciones lo hace mediante un movimiento y sus `Pago` (marco §6.4, Inscripción de binomios). |

**Fuera de alcance.**

- Binomios, inscripciones, pruebas, tarifas y pagos (Inscripción de binomios).
- Plantilla y carga masiva (Importación desde Excel).
- Vincular un `Club` con una `Contraparte` cuando un club además auspicia: se crean por separado y no se vinculan en v1.0 (Organización y evento §2).
- Número de registro, edad o propietario del caballo (decisión de Rod: solo nombre y club).
- Sexo del jinete, domicilio, datos de salud, seguros o alergias (marco §9.3).
- Eliminación automática al vencer el plazo de conservación (futuro, marco §9.5).

### Justificación de valor

a. **Problema que reduce o carga que elimina.** Al **administrador** le da una sola lista de jinetes, caballos y clubes, sin el mismo jinete escrito de tres formas, y le muestra de inmediato qué menores no tienen apoderado o autorización y a qué jinetes les falta la fecha de nacimiento, sin revisar planillas. Al **ayudante** le permite encontrar o crear un jinete, caballo o club en segundos al inscribir, sin esperar al tesorero. Sin este registro, Inscripción de binomios no tiene a quién inscribir.

b. **Métricas del marco (§3) que mueve.** Operativo a tiempo (requisito de Inscripción e Importación); control de cobranza (cada inscripción se asocia a un jinete y un club identificables, lo que permite saber quién pagó); cuadratura y rendición al club (totales por club sin duplicados).

c. **Datos o recursos nuevos.** Los del marco §9.2 con estos ajustes (decisiones de Rod): el club pasa a ser obligatorio para jinetes y caballos, y la fecha de nacimiento y el contacto del jinete son opcionales, para que no frenen el registro. Además se registra la **fecha en que la comisión recibió la autorización del apoderado** para menores de 14 años, que da constancia de lo que exige el marco §9.3. No se agrega ningún otro dato.

d. **Costo de mantención.** Cero. Corre en la misma app y base (marco §8). No usa archivos.

e. **¿Se resuelve con algo existente?** No. `Contraparte` no sirve: tiene otra finalidad (auspicio o compra), no tiene fecha de nacimiento ni apoderados, y la ve el observador con otras reglas.

---

## 3. Flujo operativo y experiencia

Escala esperada: **50 binomios o menos** (estimación de Rod), es decir, unas decenas de jinetes y caballos y unos pocos clubes. Las listas caben en una pantalla con búsqueda y los selectores cargan todo al abrir.

### 3.1 Datos de cada entidad

**Club / sociedad** (`Club`)

| Campo | Regla |
|---|---|
| Nombre | Obligatorio, 2 a 120 caracteres. |
| Contacto | Opcional. Un solo campo de texto: teléfono o correo. |
| RUT | Opcional. Se valida y normaliza con `validarRut` (Organización y evento §5.1). |

**Jinete / amazona** (`Jinete`)

| Campo | Regla |
|---|---|
| Nombre completo | Obligatorio, 2 a 120 caracteres. Un solo campo (nombres y apellidos). |
| Fecha de nacimiento | **Opcional** (decisión de Rod: no debe bloquear el registro). Sin ella no se conoce la edad y el jinete queda con la alerta "Sin fecha de nacimiento" (3.4). Si se ingresa, no puede ser futura, y si la edad resultante es menor de 4 o mayor de 90 años se pide confirmar ("¿Está bien la fecha?"), porque suele ser un error de tipeo. |
| Contacto | **Opcional** (decisión de Rod). Teléfono o correo. Si es menor de edad, puede ser el del apoderado (texto de ayuda). |
| Club | Obligatorio (decisión de Rod: todo jinete representa a un club). Quien no pertenece a ninguno se asigna al club que la comisión cree para eso, por ejemplo "Particular" (3.8). |
| RUT | Opcional. Se valida y normaliza. |
| Autorización del apoderado | Solo para menores de 14 años a la fecha de referencia. Fecha en que la comisión la recibió, con quién la registró (3.4). |

**Apoderado** (`Apoderado`)

| Campo | Regla |
|---|---|
| Nombre completo | Obligatorio, 2 a 120 caracteres. |
| Teléfono | Obligatorio. Es el contacto de emergencia (marco §9.2). |
| Relación con el jinete | Obligatoria, en el vínculo con cada jinete: Madre, Padre, Tutor legal, Otro familiar u Otro. |

Un apoderado puede estar vinculado a varios jinetes (hermanos) y un jinete puede tener varios apoderados. No se pide RUT del apoderado.

**Caballo** (`Caballo`)

| Campo | Regla |
|---|---|
| Nombre | Obligatorio, 2 a 80 caracteres. |
| Club | Obligatorio (decisión de Rod). Mismo tratamiento que el jinete para los caballos sin club. |

### 3.2 Crear (administrador y ayudante)

Hay dos puntos de entrada, con las mismas reglas:

- **En línea, al inscribir** (lo usa Inscripción de binomios): el selector busca mientras se escribe. Si no existe, "Crear «texto escrito»" abre un paso corto con el nombre ya lleno. Un toque guarda y vuelve a la inscripción.
- **Desde Participantes**: botón "Nuevo" en cada pestaña.

Formulario del jinete, pensado para el celular:

1. Nombre y club (con `<SelectorClub>` y creación en línea), obligatorios. Fecha de nacimiento y contacto a la vista pero opcionales; RUT plegado como opcional.
2. Al escribir la fecha de nacimiento se muestra la edad a la fecha de referencia del evento vigente ("12 años al 21-11-2026"). Si se deja vacía, se muestra "Sin fecha: no se sabrá si es menor ni su categoría por edad".
3. Si es menor de 18, aparece la sección **Apoderado**: buscar uno existente (por nombre o teléfono) o crear uno nuevo con nombre, teléfono y relación. Se puede agregar más de uno.
4. Si es menor de 14, aparece además la casilla **Autorización del apoderado recibida**, con la fecha (por defecto, hoy).
5. Guardar. Si faltan la fecha de nacimiento, el apoderado o la autorización, el jinete **se guarda igual** y queda con su alerta (3.4).

Antes de guardar, el aviso de posible duplicado (3.5).

### 3.3 Edad

- La edad se calcula siempre con `edadEnEvento(fechaNacimiento, evento)`: años cumplidos a `fechaReferenciaEdadEfectiva(evento)` (Organización y evento §5.1). Nunca se guarda como número (marco §6.11).
- Sin fecha de nacimiento, la edad es **desconocida** (`null`): se muestra "Edad sin dato", no se evalúan las alertas de menor y el jinete no califica automáticamente en categorías por edad. Qué pasa al inscribirlo en una prueba por edad lo define Inscripción de binomios.
- El evento es el vigente del contexto (Organización y evento §3.6). Si no hay evento configurado, se usa la fecha de hoy y se indica "(a hoy)".
- Si cambian las fechas del evento, las edades y las alertas se recalculan solas. La vista previa de ese cambio usa la consulta de 5.3.

### 3.4 Menores de edad: apoderado y autorización

**Alertas** (se calculan al mostrar, no se guardan):

| Alerta | Condición | Dónde se ve |
|---|---|---|
| **Menor sin apoderado** | Edad < 18 y ningún vínculo activo con un apoderado. | Ficha y lista del jinete, filtro "Con alertas", y en la inscripción del binomio (Inscripción de binomios). |
| **Falta autorización del apoderado** | Edad < 14 y sin fecha de autorización registrada. | Mismos lugares. |
| **Sin fecha de nacimiento** | Fecha de nacimiento vacía: no se sabe si es menor de edad ni su categoría. | Mismos lugares. |

**No bloquean** (decisión de Rod): el jinete se guarda y se puede inscribir. Las inscripciones se conversan antes del concurso, y el día del evento es muy raro que llegue alguien sin aviso. Las alertas son el recordatorio para completar los datos antes del evento. **Desviación declarada:** el marco §6.11 dice que todo menor "debe tener" al menos un apoderado, y el §6.12 trata "menor sin apoderado" como error de importación. Al aprobarse este documento, el marco pasa a v1.2 con la regla "se exige y se alerta, sin bloquear" (ver 6).

**Registrar la autorización:** en la ficha del jinete menor de 14, "Registrar autorización" con la fecha en que se recibió. Queda con quién la registró y cuándo, en el registro y en auditoría. El portal no guarda el documento ni el mensaje de la autorización: la comisión la pide por el medio que acuerde con el club (tarea t-012). Si el jinete cumple 14 antes de la fecha de referencia, la casilla deja de aparecer y la fecha registrada se conserva.

**Quién puede completar lo que falta:** el ayudante puede **agregar** un apoderado y **registrar** la autorización de cualquier jinete, porque solo suman datos y resuelven alertas. Quitar un apoderado, cambiar su relación o corregir la autorización es edición y la hace el administrador (3.6). Todo queda en auditoría.

### 3.5 Aviso de posible duplicado

No bloquea, salvo el RUT repetido (marco §6.11). Se muestra "¿Es alguno de estos?" con hasta tres coincidencias, para elegir una en vez de crear otra. Incluye registros desactivados, marcados como tales.

| Entidad | Se considera posible duplicado si… | Qué muestra la coincidencia |
|---|---|---|
| Club | Nombre parecido (regla de Organización y evento §3.5). | Nombre, cantidad de jinetes y caballos. |
| Jinete | Nombre parecido, o igual fecha de nacimiento con nombre parecido cuando ambos la tienen (esta última va primero). | Nombre, club y año de nacimiento (si lo tiene). |
| Apoderado | Nombre parecido o mismo teléfono (comparando los últimos 9 dígitos). | Nombre y jinetes vinculados. |
| Caballo | Nombre parecido, en cualquier club. | Nombre y club. Dos caballos con el mismo nombre en clubes distintos son normales, por eso solo avisa. |

**RUT repetido bloquea** (club y jinete): si el RUT ya existe en otro registro activo de la misma entidad, no se crea y se ofrece usar el existente.

Si el parecido es un registro **desactivado**, el administrador puede reactivarlo desde el aviso. El ayudante ve "Existe desactivado: pide al administrador que lo reactive" y puede crear uno nuevo igual (luego se fusiona).

Importación desde Excel usa la misma función de búsqueda (5.3).

### 3.6 Editar, desactivar y reactivar (solo administrador)

- **Editar:** todos los campos de 3.1. Completar después la fecha de nacimiento o el contacto de un jinete también es edición; si el ayudante los conoce, se los pasa al administrador. Cambiar el club de un jinete no cambia los binomios ya creados (3.1 y la regla de Inscripción de binomios del cuadro de 2). Cambiar la fecha de nacimiento recalcula edad y alertas.
- **Quitar un apoderado de un jinete:** desactiva el vínculo, no lo borra. Si deja al menor sin apoderado, se avisa antes de confirmar.
- **Desactivar:** el registro no aparece en los selectores y conserva sus binomios, inscripciones y vínculos. Un club desactivado conserva sus jinetes y caballos; para crear nuevos se elige otro club.
- **Reactivar:** vuelve a los selectores.

Todo se edita con control por `version` (marco §6.9) y queda en auditoría con antes y después.

### 3.7 Fusionar duplicados (solo administrador)

Mismo flujo que las contrapartes (Organización y evento §3.5, pasos 1 a 5): "Fusionar con…", vista lado a lado con lo que tiene cada uno, elegir cuál se conserva, confirmar. En una transacción:

| Entidad | Qué se reasigna al conservado | Campos vacíos que se completan |
|---|---|---|
| Club | Jinetes, caballos y el `clubId` de los binomios | Contacto, RUT |
| Jinete | Vínculos con apoderados (sin repetir el mismo apoderado) y binomios | Contacto, RUT, fecha de autorización |
| Apoderado | Vínculos con jinetes (sin repetir) | Ninguno (ambos tienen teléfono) |
| Caballo | Binomios | Ninguno |

- Si los dos registros tienen **distinta fecha de nacimiento**, la vista lado a lado lo destaca y el administrador elige cuál queda.
- **Conflicto de binomios:** si al fusionar dos jinetes (o dos caballos) quedarían dos binomios con el mismo jinete y el mismo caballo en el mismo evento, la fusión se rechaza y se listan esos binomios. El administrador anula uno en Inscripción de binomios y vuelve a fusionar. La reasignación de binomios la implementa Inscripción de binomios con esta regla (ver el cuadro de 2).
- El duplicado queda desactivado con referencia al conservado; los registros reasignados suben su `version`; queda **un** `RegistroAuditoria` con acción `fusionar` y la lista de lo reasignado. No se deshace desde la interfaz.

### 3.8 Club "Particular"

El código no tiene un club especial. Si hay jinetes o caballos sin club, el administrador crea un club con el nombre que use la comisión (por ejemplo, "Particular") y se asigna como a cualquier otro. En listas y reportes aparece con su nombre (principio 5 del marco: el club es un dato).

### 3.9 Listas y fichas

`/participantes` con pestañas **Jinetes**, **Caballos**, **Clubes** y, solo para administrador y ayudante, **Apoderados**. Cada pestaña tiene búsqueda, filtro por club y por activos y, en Jinetes, el filtro **Con alertas** con un contador.

- **Ficha del jinete:** datos, edad a la fecha de referencia, alertas, apoderados con relación y teléfono (tocar para llamar), club y, cuando exista Inscripción de binomios, sus binomios del evento.
- **Ficha del caballo:** nombre, club y sus binomios.
- **Ficha del club:** datos, jinetes y caballos.
- **Ficha del apoderado:** datos y jinetes vinculados.

**Qué ve cada rol** (complementa marco §2.2):

| | Administrador | Ayudante | Observador |
|---|---|---|---|
| Nombre y club de jinetes y caballos; nombre de clubes | Sí | Sí | Sí |
| Fecha de nacimiento, edad, contacto y RUT del jinete | Sí | Sí | **No** |
| Alertas de menores | Sí | Sí | **No** (revelan que es menor de edad) |
| Apoderados (pestaña, fichas y vínculos) y autorización | Sí | Sí | **No** |
| Contacto y RUT del club | Sí | Sí | **No** |
| Crear; agregar apoderado; registrar autorización | Sí | Sí | No |
| Editar, quitar apoderado, desactivar, reactivar, fusionar, suprimir, descargar | Sí | No | No |

Lo oculto al observador se quita en el servidor, nunca solo en la interfaz.

### 3.10 Casos borde revisados

| Caso | Tratamiento |
|---|---|
| Un jinete con varios caballos, o un caballo con varios jinetes | Se registran una vez cada uno; los pares son binomios (Inscripción de binomios). |
| Hermanos con el mismo apoderado | Un apoderado vinculado a varios jinetes (3.1). |
| Menor de edad sin apoderado registrado | Se guarda y se inscribe, con alerta visible (3.4). |
| Menor de 14 sin autorización | Alerta "Falta autorización del apoderado" (3.4). |
| El jinete cumple 18 (o 14) justo antes del concurso | La edad se calcula a la fecha de referencia del evento, no a hoy; la alerta desaparece sola si corresponde (3.3). |
| Se posterga el concurso | Vista previa de edades y alertas en Configuración del evento (Organización y evento §3.2), con la consulta de 5.3. |
| Jinete o caballo sin club | Club creado como dato, por ejemplo "Particular" (3.8). |
| Jinete que representa a otro club este año | Se cambia el club en el binomio de ese evento, no en el jinete (Inscripción de binomios). |
| Jinete duplicado al importar o creado por dos ayudantes a la vez | Aviso de parecido; bloqueo por RUT; fusión por el administrador (3.5, 3.7). |
| Dos caballos con el mismo nombre en clubes distintos | Permitido; el aviso muestra el club para distinguirlos (3.5). |
| Fecha de nacimiento mal escrita (año 2104, o 1 año de edad) | Rechazo si es futura; confirmación si la edad es menor de 4 o mayor de 90 (3.1). |
| Menor sin contacto propio | El contacto puede ser el del apoderado (3.1). |
| No se conoce la fecha de nacimiento del jinete | Se guarda sin ella, con la alerta "Sin fecha de nacimiento"; no se evalúan las alertas de menor hasta completarla (3.3, 3.4). |
| Jinete sin contacto | Se guarda; el contacto es opcional. Si es menor, el teléfono del apoderado cumple esa función. |
| Un adulto que es jinete y además apoderado de su hijo | Se registra como `Jinete` y como `Apoderado` por separado; no se vinculan. Es un dato duplicado aceptado, porque son roles distintos. |
| Club que además auspicia | Se crea también como `Contraparte`; no se vinculan en v1.0 (Organización y evento §2). |
| Club que paga inscripciones de sus jinetes | Movimiento de ingreso con varios `Pago` (marco §6.4, Inscripción de binomios). |
| Uso en la cancha con señal baja | Los selectores cargan las listas activas con la pantalla (decenas de filas) y filtran en el teléfono sin nuevas consultas. La creación en línea es un solo envío. El registro sin conexión es v1.1 y solo cubre movimientos. |
| Un formulario manipulado envía un `clubId` o `apoderadoId` de otra organización | Rechazo con `exigirDeLaOrganizacion` (Organización y evento §5.2). |
| El titular pide suprimir sus datos antes de plazo | Supresión de contacto y RUT desde la ficha (4). |

---

## 4. Cumplimiento normativo

Aplica: el componente guarda datos personales de jinetes, **incluidos menores de edad**, de sus apoderados y de clubes, y es la fuente de los datos que se rinden al club. Lo transversal está en el marco §9; aquí solo lo específico.

- **Normativa y vigencia** (reverificada el 2026-09-27): Ley 19.628, vigente. Ley 21.719, entra en vigencia el **2026-12-01**; el proyecto de prórroga a 2027 (Boletín 18.623-07) ingresó al Senado el 2026-09-01 con suma urgencia y sigue en primer trámite en la Comisión de Constitución, sin informe ni votación. Mientras no se publique, la fecha vigente es el 2026-12-01. El diseño la cumple desde el inicio (marco §9.1).
- **Datos regulados en este componente:** nombre, fecha de nacimiento, contacto y RUT del jinete; nombre y teléfono del apoderado y su relación con el jinete; contacto y RUT del club; fecha de la autorización del apoderado. El caballo no es dato personal (no se guarda propietario).
- **Base de licitud:** ejecución de la relación de inscripción al concurso (marco §9.2). En menores de 14 años, autorización del apoderado obtenida por la comisión, con constancia de la fecha en el portal (3.4). El apoderado se registra como contacto de emergencia y responsable del menor.
- **Medidas específicas:**
  - solo los campos de 3.1: sin sexo, domicilio, salud, seguros ni número de registro;
  - fecha de nacimiento y contacto del jinete opcionales: se piden, pero no se exigen (decisión de Rod), lo que reduce aún más lo que se guarda;
  - un jinete sin fecha de nacimiento no se presume adulto: queda con alerta hasta completarla, para no dejar a un menor sin apoderado inadvertido;
  - el observador no ve fecha de nacimiento, edad, contacto, RUT, alertas, apoderados ni autorización, tampoco en respuestas de la API (3.9);
  - las alertas de menores se muestran solo a administrador y ayudante;
  - las fichas de apoderados no son visibles para el observador;
  - todas las consultas pasan por `db(ctx)`, con prueba de aislamiento para las cuatro entidades.
- **Menores de edad** (marco §9.3): el portal exige apoderado y autorización mediante alertas, no mediante bloqueo (3.4, desviación declarada en 6). El riesgo queda cubierto con el contador de alertas y la revisión antes del evento (8).
- **Derechos de los titulares** (marco §9.6), solo administrador, en la ficha del jinete, del apoderado o del club:
  - **Acceso y rectificación:** la ficha muestra todos los datos; se corrigen editando.
  - **Supresión:** "Eliminar datos de contacto" borra contacto y RUT (jinete y club) o el teléfono (apoderado), y conserva nombre, vínculos e inscripciones. Si el apoderado queda sin teléfono, su jinete muestra la alerta "Apoderado sin teléfono". La fecha de nacimiento no se suprime mientras el jinete tenga inscripciones en un evento no rendido, porque determina su categoría; se informa al titular. Queda en auditoría con `suprimir_datos`, sin copiar los valores eliminados.
  - **Portabilidad:** "Descargar datos" entrega un CSV con los datos del titular y, para el jinete, sus binomios e inscripciones. Recortable a v1.1 (7).
- **Trazabilidad y conservación:** toda creación, edición, vínculo, autorización, desactivación, fusión y supresión queda en `RegistroAuditoria`. La eliminación al vencer el plazo (marco §9.5) borrará contacto, RUT, fecha de nacimiento, fecha de autorización y apoderados, y conservará nombre y club (futuro).

---

## 5. Especificación de ejecución

Stack heredado del marco §8, sin cambios. Nombres de entidad del marco §5. Columnas en `snake_case` con `@map`. Código en `src/dominio/inscripciones/participantes/`.

### 5.1 Modelo de datos (Prisma)

```prisma
enum RelacionApoderado { madre padre tutor_legal otro_familiar otro }

model Club {
  id                String   @id @default(cuid())
  organizacionId    String
  nombre            String
  nombreNormalizado String
  contacto          String?
  rut               String?  // normalizado "12345678-9"
  activo            Boolean  @default(true)
  fusionadoEnId     String?
  creadoPorId       String
  version           Int      @default(1)
  creadoEn          DateTime @default(now())
  actualizadoEn     DateTime @updatedAt
  @@index([organizacionId, nombreNormalizado])
  @@index([organizacionId, rut])
}

model Jinete {
  id                          String    @id @default(cuid())
  organizacionId              String
  nombre                      String
  nombreNormalizado           String
  fechaNacimiento             DateTime? @db.Date // opcional (decisión de Rod)
  contacto                    String?   // opcional
  rut                         String?
  clubId                      String
  autorizacionApoderadoFecha  DateTime? @db.Date
  autorizacionRegistradaPorId String?
  autorizacionRegistradaEn    DateTime?
  activo                      Boolean   @default(true)
  fusionadoEnId               String?
  creadoPorId                 String
  version                     Int       @default(1)
  creadoEn                    DateTime  @default(now())
  actualizadoEn               DateTime  @updatedAt
  @@index([organizacionId, nombreNormalizado])
  @@index([organizacionId, rut])
  @@index([organizacionId, clubId])
}

model Apoderado {
  id                  String   @id @default(cuid())
  organizacionId      String
  nombre              String
  nombreNormalizado   String
  telefono            String?  // obligatorio al crear; null solo tras supresión
  telefonoNormalizado String?  // últimos 9 dígitos
  activo              Boolean  @default(true)
  fusionadoEnId       String?
  creadoPorId         String
  version             Int      @default(1)
  creadoEn            DateTime @default(now())
  actualizadoEn       DateTime @updatedAt
  @@index([organizacionId, nombreNormalizado])
  @@index([organizacionId, telefonoNormalizado])
}

model JineteApoderado {
  id             String            @id @default(cuid())
  organizacionId String
  jineteId       String
  apoderadoId    String
  relacion       RelacionApoderado
  activo         Boolean           @default(true)
  creadoPorId    String
  creadoEn       DateTime          @default(now())
  @@unique([jineteId, apoderadoId])
  @@index([organizacionId, apoderadoId])
}

model Caballo {
  id                String   @id @default(cuid())
  organizacionId    String
  nombre            String
  nombreNormalizado String
  clubId            String
  activo            Boolean  @default(true)
  fusionadoEnId     String?
  creadoPorId       String
  version           Int      @default(1)
  creadoEn          DateTime @default(now())
  actualizadoEn     DateTime @updatedAt
  @@index([organizacionId, nombreNormalizado])
  @@index([organizacionId, clubId])
}
```

Reglas de datos:

- `fechaNacimiento` y `autorizacionApoderadoFecha` son `DATE`, manejadas como `AAAA-MM-DD` (Organización y evento §5.1).
- `telefono` del apoderado es obligatorio en el esquema Zod de creación y edición; la columna admite `null` solo para la supresión (4). `fechaNacimiento` y `contacto` del jinete son opcionales.
- Restricción `CHECK` en `Jinete`: `autorizacion_registrada_por_id` y `autorizacion_registrada_en` son nulos si y solo si `autorizacion_apoderado_fecha` es nula.
- Un vínculo `JineteApoderado` desactivado se reactiva (no se crea otro) si se vuelve a agregar el mismo apoderado.

### 5.2 Funciones de dominio (con pruebas)

- `edadEnEvento(fechaNacimiento | null, evento | null)`: años cumplidos a `fechaReferenciaEdadEfectiva(evento)` o a hoy (America/Santiago) si no hay evento; `null` si no hay fecha de nacimiento. Es **la única** función de edad del proyecto; Inscripción de binomios la usa para las categorías por edad.
- `alertasJinete(jinete, vinculosActivos, apoderados, evento)`: devuelve `sin_fecha_nacimiento`, `menor_sin_apoderado`, `falta_autorizacion` y `apoderado_sin_telefono` según 3.4 y 4. Con edad `null` solo devuelve `sin_fecha_nacimiento` (y `apoderado_sin_telefono` si corresponde).
- `normalizarTelefono(texto)`: solo dígitos, últimos 9.
- `buscarParecidos(ctx, entidad, { nombre, rut?, fechaNacimiento?, telefono? })`: aplica 3.5 con la regla de nombres de Organización y evento §3.5 (reutiliza su implementación, no la copia). La usan los selectores, los formularios e Importación desde Excel.

### 5.3 Acciones de servidor y consultas

| Acción | Roles | Notas |
|---|---|---|
| `crearClub`, `crearJinete`, `crearApoderado`, `crearCaballo` | Administrador, ayudante | Zod compartido; `exigirDeLaOrganizacion` para `clubId` y `apoderadoId`; RUT repetido → error con el existente; parecidos → respuesta de aviso, se guarda con `confirmarAunqueParecido: true`. `crearJinete` acepta apoderados y autorización en el mismo envío (una transacción). |
| `vincularApoderado(jineteId, apoderadoId \| nuevo, relacion)` | Administrador, ayudante | Crea o reactiva el vínculo. |
| `registrarAutorizacion(jineteId, fecha)` | Administrador, ayudante | Solo si no tiene una registrada; corregirla es `editarJinete`. |
| `editar<Entidad>`, `desvincularApoderado`, `desactivar<Entidad>`, `reactivar<Entidad>` | Administrador | Con `version`; aviso si `desvincularApoderado` deja al menor sin apoderado. |
| `fusionar<Entidad>(conservadoId, duplicadoId)` | Administrador | Transacción de 3.7. Para jinetes, caballos y clubes llama al gancho de reasignación de binomios que provee Inscripción de binomios (hasta que exista, no hay binomios que reasignar). |
| `suprimirDatos<Entidad>` | Administrador | Según 4. |
| `descargarDatos<Entidad>` | Administrador | CSV. Recortable. |
| `jinetesAfectadosPorCambioDeFecha(ctx, eventoId, nuevaFechaReferencia)` | Administrador | Para la vista previa de Organización y evento §3.2: jinetes con binomio en el evento y fecha de nacimiento cuya condición de menor (18) o de menor de 14 cambia, y los que quedarían con alerta. |
| `listar<Entidad>`, `ficha<Entidad>` | Todos con membresía activa (apoderados: sin observador) | Pasan por `ocultarDatosPersonales`. |

`ocultarDatosPersonales(ctx, …)` (Organización y evento §5.2) se extiende: para el observador quita de `Jinete` la fecha de nacimiento, edad, contacto, RUT, autorización, vínculos y alertas; de `Club`, contacto y RUT. El observador recibe 403 en todo lo de `Apoderado`.

### 5.4 Permisos (`src/lib/permisos.ts`)

Se agregan a la tabla única (Acceso y roles §5.4):

| Acción | Administrador | Ayudante | Observador |
|---|---|---|---|
| `participantes.ver` | Sí | Sí | Sí (sin datos personales) |
| `participantes.verDatosPersonales` | Sí | Sí | No |
| `participantes.crear` | Sí | Sí | No |
| `participantes.completarMenor` (vincular apoderado, registrar autorización) | Sí | Sí | No |
| `participantes.administrar` (editar, desvincular, desactivar, reactivar, fusionar, suprimir, descargar) | Sí | No | No |

### 5.5 Pantallas y componentes

| Ruta o componente | Rol | Contenido |
|---|---|---|
| `/participantes` | Todos con membresía activa | Pestañas de 3.9; Apoderados oculta al observador; filtro "Con alertas" con contador. |
| `/participantes/jinetes/nuevo`, `/participantes/jinetes/[id]` | Administrador y ayudante (el observador ve la ficha reducida) | Formulario de 3.2 y ficha de 3.9. |
| `/participantes/caballos/[id]`, `/participantes/clubes/[id]` | Todos (reducida para el observador) | Ficha, acciones del administrador. |
| `/participantes/apoderados/[id]` | Administrador y ayudante | Ficha y jinetes vinculados. |
| `<SelectorClub>`, `<SelectorJinete>`, `<SelectorCaballo>`, `<SelectorApoderado>` | Administrador y ayudante | Búsqueda local, aviso de parecido y creación en línea (3.2, 3.5). `<SelectorJinete>` muestra club y edad; `<SelectorCaballo>`, el club. |
| `<AlertasJinete>` | Administrador y ayudante | Chips de alerta reutilizables en la ficha y en Inscripción de binomios. |

### 5.6 Auditoría

Con `registrarAuditoria` (Organización y evento §5.2). Acciones nuevas: `vincular_apoderado`, `desvincular_apoderado`, `registrar_autorizacion`. Se reutilizan `crear`, `modificar`, `desactivar`, `reactivar`, `fusionar` y `suprimir_datos`.

### 5.7 Pruebas (Vitest)

- Aislamiento: las cuatro entidades y `JineteApoderado` no se leen, cuentan, crean ni modifican desde otra organización; `clubId` y `apoderadoId` ajenos se rechazan.
- Edad: `edadEnEvento` en el día del cumpleaños, un día antes, años bisiestos (29 de febrero), sin evento, sin fecha de nacimiento (`null`), y con `fechaReferenciaEdad` distinta de la de inicio.
- Alertas: sin fecha de nacimiento (sin alertas de menor); menor sin apoderado; menor de 14 sin autorización; se apagan al cumplir 18 o 14 a la fecha de referencia; vínculo desactivado no cuenta; apoderado sin teléfono.
- Validación: fecha futura rechazada; confirmación bajo 4 o sobre 90 años; fecha de nacimiento y contacto opcionales; club obligatorio; RUT inválido rechazado; RUT repetido bloquea en club y jinete.
- Parecidos: por nombre, por fecha de nacimiento y nombre, por teléfono del apoderado; incluye desactivados marcados.
- Permisos: el ayudante crea, vincula apoderado y registra autorización, pero no edita, desvincula, desactiva, fusiona ni suprime; el observador no recibe datos personales ni alertas y recibe 403 en apoderados.
- Fusión: reasigna vínculos sin duplicarlos, completa campos vacíos, desactiva el duplicado, sube `version` y deja un solo registro de auditoría; rechazo por conflicto de binomios (se prueba al implementar Inscripción de binomios).
- Supresión: borra lo indicado en 4, no copia valores a la auditoría y no suprime la fecha de nacimiento con inscripciones en un evento no rendido.
- `jinetesAfectadosPorCambioDeFecha`: detecta cruces de 18 y de 14 años.

---

## 6. Elementos que quedan obsoletos

- **Marco general, desviaciones declaradas.** Al aprobarse este documento, el marco sube a v1.2 con estos ajustes, y este documento pasa a ser el dueño del detalle de datos de participantes:
  - §5, `Jinete`: el club pasa de opcional a **obligatorio**. `Caballo`: "club o propietario opcional" pasa a **club obligatorio**, sin propietario.
  - §6.11: la fecha de nacimiento del jinete se registra si se conoce (opcional, con alerta si falta). "Debe tener al menos un apoderado" pasa a "se exige apoderado y el portal alerta mientras falte, sin bloquear el registro ni la inscripción". Se agrega la alerta por falta de autorización en menores de 14. El aviso de duplicados deja de mencionar el número de registro del caballo.
  - §6.12: "menor sin apoderado" pasa de error a **advertencia** en la vista previa de la importación.
  - §9.2: jinete con fecha de nacimiento y contacto opcionales; caballo con nombre y club, sin número de registro ni propietario.
  - §9.3: la autorización del apoderado para menores de 14 queda con constancia de fecha en el portal (Participantes §3.4).
- **Organización y evento §3.2:** el texto "menores sin apoderado (destacados, porque rompen marco §6.11)" sigue siendo válido como alerta; no requiere cambio.
- **Planillas sueltas de jinetes, caballos y clubes:** quedan redundantes cuando se carguen (a mano o con Importación desde Excel).
- Código: ninguno, revisado: el repositorio solo tiene documentación.

---

## 7. Plan de acción

| # | Paso | Depende de |
|---|---|---|
| 1 | Modelos `Club`, `Jinete`, `Apoderado`, `JineteApoderado`, `Caballo`, enum y restricción `CHECK`; migración | Esqueleto técnico; Organización y evento (pasos 1 a 3) |
| 2 | `edadEnEvento`, `alertasJinete`, `normalizarTelefono`, `buscarParecidos` con pruebas | 1 |
| 3 | Permisos de 5.4 y extensión de `ocultarDatosPersonales`, con pruebas de observador y aislamiento | 1; Acceso y roles |
| 4 | Crear club y `<SelectorClub>` | 2, 3 |
| 5 | Crear jinete con apoderados y autorización; `<SelectorJinete>`, `<SelectorApoderado>`, `<AlertasJinete>` | 4 |
| 6 | Crear caballo y `<SelectorCaballo>` | 4 |
| 7 | `/participantes` con pestañas, filtros y fichas | 5, 6 |
| 8 | Vincular apoderado y registrar autorización desde la ficha | 7 |
| 9 | Editar, desvincular, desactivar y reactivar | 7 |
| 10 | Fusión (sin binomios hasta que exista Inscripción de binomios) | 9 |
| 11 | `jinetesAfectadosPorCambioDeFecha` conectada a la vista previa de Configuración del evento | 2; Inscripción de binomios (para tener binomios) |
| 12 | Supresión de datos | 7 |
| 13 | Descarga CSV | 7 |

Los pasos 1 a 7 son imprescindibles para Inscripción de binomios e Importación. Si el plazo del 2026-10-04 aprieta, los pasos 12 (supresión) y 13 (descarga CSV) y la fusión de apoderados pasan a v1.1 sin afectar a otros componentes.

---

## 8. Riesgos

| Riesgo | Tipo | Mitigación |
|---|---|---|
| Menor inscrito sin apoderado o sin autorización el día del concurso | Normativo / operativo | Alertas visibles en la ficha, la lista y la inscripción; contador "Con alertas"; revisarlo en la semana del concurso. La decisión de no bloquear es de Rod y queda declarada frente al marco (6). |
| El observador ve datos de menores | Normativo | Datos, alertas y apoderados se quitan en el servidor; prueba automática (5.7). |
| Jinetes o caballos duplicados | Operativo | Aviso de parecido en todos los puntos de entrada, bloqueo por RUT y fusión con auditoría. |
| Fusión equivocada | Operativo | Vista lado a lado con la fecha de nacimiento destacada si difiere; la auditoría lista lo reasignado para revertir a mano. |
| Fecha de nacimiento mal escrita cambia la categoría por edad | Operativo | Confirmación en edades extremas y edad visible junto a la fecha al escribirla (3.2). |
| Edad calculada con la fecha equivocada | Técnico | Una sola función (`edadEnEvento`) con la fecha de referencia del evento; columnas `DATE`. |
| Jinetes sin fecha de nacimiento: un menor pasa inadvertido o una categoría por edad no se puede verificar | Normativo / operativo | Alerta "Sin fecha de nacimiento" en el contador "Con alertas"; completarla antes del concurso. Inscripción de binomios define el trato en pruebas por edad. |
| Jinete sin contacto al que hay que avisar un cambio o cobrar | Operativo | Contacto a través del club o del apoderado; el campo sigue disponible para completarlo. |
| Caballos homónimos confundidos | Operativo | El selector y el aviso muestran el club. |
| Consulta sin filtro de organización | Normativo / técnico | `db(ctx)`, `exigirDeLaOrganizacion` y prueba de aislamiento. |
| Participantes atrasa Inscripción de binomios | Plazo | Pasos 12 y 13 y la fusión de apoderados recortables (7). |
| Costo | Costo | Ninguno adicional: misma app y base, sin archivos. |

---

## 9. Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 0.1 | Primer borrador para revisión | Sesión de trabajo con Rod: administrador y ayudante crean, el administrador edita y fusiona; jinete con fecha de nacimiento, contacto y club obligatorios; club heredado por el binomio y editable por evento; caballo solo con nombre y club; club "Particular" como dato; menor sin apoderado y menor de 14 sin autorización como alertas que no bloquean; autorización con fecha y quién la registró; escala de 50 binomios o menos |
| 2026-09-27 | 0.2 | Fecha de nacimiento y contacto del jinete pasan a opcionales; nueva alerta "Sin fecha de nacimiento"; edad desconocida (`null`) sin alertas de menor | Revisión de Rod |
| 2026-09-27 | 1.0 | Aprobado por Rod. El marco general pasa a v1.2 con las desviaciones de la sección 6 | Aprobación |
