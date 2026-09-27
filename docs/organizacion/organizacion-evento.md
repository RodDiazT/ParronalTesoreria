# Organización y evento

Estado: En revisión · Versión 1.1 · Responsable: Rod (Administrador) · Ejecutor: Claude Code

## 1. Índice

- **Padre:** `docs/marco-general/marco-general-proyecto.md`. Alcance dentro del padre: aislamiento por organización (§7 principio 4, §10.2), carga inicial (§10.2), configuración de la `Organizacion` y del `Evento`, `Categoria` y `Contraparte` (§5).
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

**Qué es.** La base sobre la que corre todo lo demás: la organización (el club) como unidad de aislamiento, el evento en el que se registra cada movimiento, las categorías que clasifican ingresos y gastos, y las contrapartes (auspiciadores, proveedores y otros terceros) de esos movimientos. Incluye la función única de contexto que aplica el aislamiento y el script de carga inicial.

**Versión:** v1.0 (en uso al 2026-10-04).

**Conexión con el proyecto.**

| Documento | Relación |
|---|---|
| Acceso y roles (`docs/acceso/acceso-roles.md`) | Depende de este. Define el login, las solicitudes, el ciclo de la `Membresia` y la aplicación de la matriz de permisos. Este documento solo **lee** la membresía activa para armar el contexto. Quedan para ese documento: cómo el primer ingreso con Google se vincula con el `Usuario` precargado por el script (3.1), y cómo se concilian los modelos que exige Auth.js (`User`, `Account`, `Session`) con la entidad oficial `Usuario`. |
| Movimientos (`docs/movimientos/movimientos.md`) | Usa el evento vigente, los selectores de categoría y contraparte y la fusión de contrapartes definida aquí. Quedan para ese documento: si la contraparte es obligatoria en alguna categoría (por ejemplo, Auspicios) y la validación de la fecha del movimiento (sugerencia: bloquear fechas futuras en movimientos pagados). |
| Participantes (`docs/inscripciones/participantes.md`) | Usa la fecha de referencia para la edad del evento (§6.11 del marco). La vista previa de cambio de fechas (3.2) se activa cuando existen jinetes. |
| Inscripción de binomios | Usa las categorías de sistema "Inscripciones" y "Devoluciones" (§6.4 del marco), que solo se registran desde sus flujos (3.4). Queda para ese documento el efecto de un cambio de fechas del evento en alojamiento y pensión por noches. |
| Cierre y rendición (v1.1) | Cambia el estado del evento a `cerrado` y `rendido`; usa el nombre y el logo de la organización y la categoría de sistema "Aporte inicial". |

**Fuera de alcance.**

- Crear organizaciones o eventos desde la interfaz, y el selector de evento u organización (futuro, marco §4).
- Cerrar el evento y marcarlo rendido (Cierre y rendición, v1.1).
- `Club` (club, sociedad o criadero de jinetes y caballos): es otra entidad y la define Participantes. Si un club externo además auspicia, se crea también como `Contraparte`; en v1.0 no se vinculan.
- Presupuesto por categoría (futuro).
- Subcategorías.
- Miembros de la comisión como contrapartes: un gasto pagado de su bolsillo por un ayudante usa `pagadoPor` (marco §6.5), no una contraparte.

### Justificación de valor

a. **Problema que reduce o carga que elimina.** Al **administrador** le da clasificaciones únicas y ordenadas para validar y rendir por categoría, sin nombres de proveedores escritos de cinco formas distintas, y le evita depender de alguien técnico para ajustar categorías, fechas o el nombre del club. Al **ayudante** le permite elegir la categoría y crear un proveedor nuevo en segundos desde la cancha, sin esperar al tesorero. A todos les garantiza que nadie vea datos de otra organización.

b. **Métricas del marco (§3) que mueve.** Operativo a tiempo (es la base de todo el núcleo); trazabilidad total (cada movimiento con categoría y contraparte identificables); tiempo para registrar un gasto < 1 minuto (creación de contraparte en línea); cuadratura y rendición al club (totales por categoría sin reclasificar a mano).

c. **Datos o recursos nuevos.** Fechas de inicio, término y de referencia para la edad, y lugar del evento: necesarios para edad de jinetes, alojamiento o pensión por días y encabezado de la rendición. Logo del club: opcional, pedido por Rod para la app y el PDF de rendición. Contacto y RUT de contrapartes: ya previstos en el marco §9.3, ambos opcionales.

d. **Costo de mantención.** Cero. Corre en la misma app, base y volumen de Railway (marco §8).

e. **¿Se resuelve con algo existente?** No. Es el primer componente y no hay código ni pantallas previas.

---

## 3. Flujo operativo y experiencia

### 3.1 Carga inicial (una vez, por script)

1. Rod entrega a Claude Code, **fuera del repositorio**, los datos: nombre del club, nombre del evento, fechas de inicio y término, lugar (opcional) y los correos de Google de los dos administradores.
2. Claude Code ejecuta `npm run carga-inicial -- --archivo <ruta>` con un JSON local (ignorado por Git). El script crea en una sola transacción:
   - la `Organizacion`;
   - el `Evento` en estado `abierto`;
   - los dos `Usuario` administradores por correo, cada uno con una `Membresia` `activa` de rol `administrador`;
   - las categorías iniciales de 3.4.
3. Queda un `RegistroAuditoria` por entidad creada, con usuario "sistema" y acción `crear`. Por eso el usuario de `RegistroAuditoria` es opcional en el modelo; solo el script de carga lo deja vacío.
4. El script no escribe nada si ya existe una organización con el mismo nombre normalizado: termina con un mensaje y sin cambios. Se puede correr de nuevo sin duplicar.

Cómo se vincula el primer login con Google de cada administrador con el `Usuario` precargado lo define Acceso y roles (sugerencia: por correo verificado de Google).

### 3.2 Configuración del evento (administrador)

Pantalla **Configuración → Evento**, solo para administradores.

| Campo | Regla |
|---|---|
| Nombre | Obligatorio, 3 a 120 caracteres. |
| Fecha de inicio | Obligatoria, fecha local. |
| Fecha de término | Obligatoria, igual o posterior a la de inicio. Cubre concursos de varios días y alojamiento o pensión por noches. |
| Fecha de referencia para la edad | Opcional. Si está vacía se usa la fecha de inicio (marco §6.11). Texto de ayuda: "Fecha a la que se calcula la edad de los jinetes según el reglamento". |
| Lugar | Opcional, hasta 200 caracteres. |
| Estado | Solo lectura en v1.0 (`abierto`). |

**Las fechas del evento son los días del concurso y son informativas.** No limitan la fecha de los movimientos: los gastos previos (pintura, premios) y los cobros posteriores se registran con su fecha real. La validación de la fecha de cada movimiento la define Movimientos.

**Solo con el evento abierto.** La configuración del evento se edita solo mientras está `abierto`. Con el evento `cerrado` o `rendido`, la pantalla queda en solo lectura (marco §6.10).

**Cambio de fechas con jinetes ya inscritos (caso: se posterga el concurso).** Si cambia la fecha de inicio o la de referencia para la edad y ya hay binomios en el evento, antes de guardar se muestra una vista previa:

- jinetes que pasan de menor a adulto o de adulto a menor;
- jinetes que quedarían **menores sin apoderado** (destacados, porque rompen marco §6.11);
- espacio reservado para el efecto en categorías por edad, que agrega Inscripción de binomios.

El administrador confirma o cancela. Guardar no modifica inscripciones ni apoderados: solo recalcula la edad (que nunca se guarda como número) y deja la advertencia visible en Participantes. Queda en auditoría con antes y después. Si aún no hay jinetes (Participantes no implementado o sin datos), se guarda directo.

**Edición simultánea.** Si los dos administradores editan a la vez, el segundo recibe el aviso de marco §6.9 y debe recargar.

### 3.3 Organización (administrador)

Pantalla **Configuración → Organización**.

- **Nombre:** obligatorio, 3 a 120 caracteres. Se muestra en el encabezado de la app y en la rendición.
- **Logo:** opcional. PNG, JPEG o WebP, hasta 1 MB. **No se acepta SVG** (puede contener código). Se muestra en el encabezado (a unos 32 px de alto) y lo usa la rendición. Se puede reemplazar o quitar; el archivo anterior se conserva en el volumen y el cambio queda en auditoría.
- El logo se sirve solo por la app a usuarios con membresía activa, incluido el observador (no es un dato personal ni un respaldo).

### 3.4 Categorías (administrador)

Pantalla **Configuración → Categorías**, con dos listas: ingresos y gastos. Lista plana, sin subcategorías.

**Categorías iniciales** (creadas por el script; todas se pueden renombrar):

| Tipo | Categoría | De sistema |
|---|---|---|
| Ingreso | Auspicios | |
| Ingreso | Inscripciones | Sí (`inscripciones`) |
| Ingreso | Alojamiento | |
| Ingreso | Pensión de caballos | |
| Ingreso | Venta de comida | |
| Ingreso | Aporte inicial | Sí (`aporte_inicial`) |
| Ingreso | Otros ingresos | |
| Gasto | Pintura | |
| Gasto | Insumos | |
| Gasto | Equipamiento de equitación | |
| Gasto | Premios | |
| Gasto | Devoluciones | Sí (`devoluciones`) |
| Gasto | Otros gastos | |

**Aporte inicial.** Si el club entrega fondos a la comisión al partir (o hay saldo de actividades previas), se registra como un movimiento de ingreso en esta categoría, con su respaldo. Si no hay aporte, la categoría simplemente no se usa. Es de sistema para que la rendición (v1.1) pueda separarlo del resultado propio del evento. Confirmar con el club si habrá aporte: tarea t-009.

**Acciones:**

| Acción | Regla |
|---|---|
| Crear | Nombre y tipo. El nombre no puede repetirse dentro del mismo tipo (comparación sin mayúsculas, tildes ni espacios dobles), tampoco con una categoría desactivada: en ese caso se muestra "Existe «Premios» desactivada" con el botón para reactivarla. La categoría nueva queda al final de su lista. |
| Renombrar | Cualquier categoría, incluidas las de sistema, con la misma regla de nombre repetido. El nombre nuevo se ve en todos los movimientos, también en los antiguos; el nombre anterior queda en auditoría. |
| Cambiar tipo | Solo si ningún movimiento la usa. Las de sistema nunca cambian de tipo. |
| Desactivar | Deja de aparecer al registrar un movimiento nuevo. Los movimientos existentes la conservan y se siguen mostrando y sumando con ella. Las de sistema no se desactivan. |
| Reactivar | Vuelve a aparecer en el selector. |
| Ordenar | Subir o bajar, para que las más usadas queden arriba en el celular. |
| Eliminar | No existe (marco §7 principio 3). |

Siempre queda al menos una categoría activa de cada tipo, porque las de sistema no se desactivan.

El ayudante y el observador ven las categorías solo como opciones del selector y en los listados; no ven la pantalla de configuración.

**Selector de categoría** (lo usa Movimientos): muestra solo las activas del tipo del movimiento, en el orden configurado, con botones grandes para una mano. Las categorías de sistema "Inscripciones" y "Devoluciones" **no se ofrecen** en el selector: un pago de inscripción se registra desde el flujo de pago y una devolución desde la inscripción del binomio que se retira, siempre vinculadas a la inscripción (marco §6.4). Esos flujos los define Inscripción de binomios. "Aporte inicial" sí se ofrece entre los ingresos.

### 3.5 Contrapartes (administrador y ayudante)

Una contraparte es un auspiciador, un proveedor u otro tercero de un movimiento. Pertenece a la organización y se reutiliza entre eventos.

| Campo | Regla |
|---|---|
| Nombre | Obligatorio, 2 a 120 caracteres. |
| Auspiciador | Sí/no. |
| Proveedor | Sí/no. Puede ser ambas cosas (por ejemplo, un canje). Si ninguna está marcada, se muestra como "Otro". |
| Contacto | Opcional. Un solo campo de texto: teléfono o correo. |
| RUT | Opcional. Si se ingresa, se valida el dígito verificador y se guarda normalizado (`12345678-9`). |

No se piden domicilio, cuenta bancaria ni otros datos (marco §9.3), aunque facilitarían pagarle a un proveedor.

**Crear en línea (ayudante o administrador, desde el celular).** En el formulario de movimiento, el selector de contraparte busca mientras se escribe. Si no existe, "Crear «texto escrito»" abre un paso corto con nombre (ya lleno), las marcas auspiciador/proveedor (preseleccionada según el tipo del movimiento: ingreso → auspiciador, gasto → proveedor) y, opcionales y plegados, contacto y RUT. Un solo toque para guardar y volver al movimiento.

**Aviso de posible duplicado** (no bloquea, marco §6.11 aplicado a contrapartes): al crear, si existe una contraparte activa con nombre parecido, se muestra "¿Es alguna de estas?" con hasta tres coincidencias para elegirla en vez de crear otra. Se considera parecido si, tras normalizar (minúsculas, sin tildes, sin puntuación ni espacios dobles), los nombres son iguales, uno contiene al otro (4 caracteres o más) o difieren en 2 letras o menos (nombres de 6 caracteres o más).

**Mismo RUT: bloquea.** Si el RUT ya existe en otra contraparte activa, no se crea: se ofrece usar la existente.

**Edición (solo administrador).** El administrador edita nombre, marcas, contacto y RUT. El ayudante ve la ficha pero no la edita (evita que cambie datos de contrapartes que usan movimientos ya validados).

**Desactivar y reactivar (solo administrador).** La contraparte desactivada no aparece en el selector; sus movimientos la conservan.

**Fusionar duplicados (solo administrador).** Caso: "Ferretería Angol" y "Ferreteria angol".

1. Desde la ficha de una contraparte, "Fusionar con…" y se elige la otra.
2. Se muestran las dos lado a lado con la cantidad de movimientos de cada una, y el administrador elige cuál se conserva.
3. Al confirmar, en una transacción: los movimientos del duplicado pasan a la conservada y suben su `version` (quien los esté editando recibe el aviso de marco §6.9); los campos vacíos de la conservada (contacto, RUT, marcas) se completan con los del duplicado; el duplicado queda desactivado con referencia a la conservada.
4. Queda **un** `RegistroAuditoria` con acción `fusionar`, los identificadores de ambas y la lista de movimientos reasignados. No cambia el estado de validación de esos movimientos: solo se corrige a quién corresponden.
5. La fusión no se deshace desde la interfaz. Si fue un error, el administrador reactiva el duplicado y reasigna los movimientos a mano; la auditoría indica cuáles eran.

**Derechos del titular (marco §9.6), solo administrador, en la ficha:**

- **Acceso y rectificación:** la ficha muestra todos los datos y la lista de movimientos de la contraparte; se corrigen editando.
- **Supresión:** "Eliminar datos de contacto" borra contacto y RUT y conserva nombre y movimientos. Queda en auditoría con la acción `suprimir_datos`, sin guardar en la auditoría los valores eliminados.
- **Portabilidad:** "Descargar datos" entrega un CSV con los datos de la contraparte y sus movimientos (fecha, tipo, categoría, monto, estado). Recortable a v1.1 si aprieta el plazo (ver 7).

**Qué ve cada rol** (complementa marco §2.2):

| | Administrador | Ayudante | Observador |
|---|---|---|---|
| Lista de contrapartes con nombre y tipo | Sí | Sí | Sí |
| Contacto y RUT | Sí | Sí | **No** |
| Crear | Sí | Sí | No |
| Editar, desactivar, fusionar, suprimir, descargar | Sí | No | No |

### 3.6 Contexto de organización y evento vigente

En cada solicitud, la función única de contexto (marco §10.2):

1. Obtiene el usuario de la sesión. Sin sesión → pantalla de ingreso.
2. Busca su `Membresia` en estado `activa`. Si no tiene → pantalla de solicitud pendiente (la define Acceso y roles). En v1.0 existe una sola organización; si un usuario tuviera más de una membresía activa, se muestra un error "Selector de organización no disponible" (futuro).
3. Determina el **evento vigente**: el único evento `abierto` de la organización; si no hay ninguno, el más reciente `cerrado` o `rendido`, en solo lectura. Si la organización no tiene eventos, se muestra "No hay evento configurado" y solo funciona Configuración → Organización.
4. Entrega `{ usuario, organizacionId, rol, evento }` al resto de la app.

La base impide dos eventos `abierto` en la misma organización.

El encabezado de todas las pantallas muestra logo y nombre de la organización y nombre y fechas del evento vigente.

### 3.7 Casos borde revisados

| Caso | Tratamiento |
|---|---|
| Auspicio en especie o canje | La contraparte se marca auspiciador y proveedor; la naturaleza `especie` la define Movimientos (marco §6.6). |
| Dos ayudantes crean el mismo proveedor a la vez | Aviso de parecido al crear; si igual se duplica, el administrador fusiona. |
| Transferencia sin identificar | La contraparte es opcional en el movimiento; se completa después (Movimientos). |
| Club externo que paga inscripciones | Es un `Club` (Participantes), no una contraparte. |
| Proveedor persona natural (vecino que vende comida) | Mismos campos mínimos; contacto y RUT opcionales y ocultos al observador. |
| Categoría desactivada con movimientos por validar | Los movimientos la conservan; al validar, el administrador puede cambiarles la categoría (Movimientos). |
| Se renombra una categoría usada en movimientos validados | Se permite; el nombre anterior queda en auditoría. |
| Se posterga el concurso | Cambio de fechas con vista previa de edades (3.2). |
| Dos administradores editan lo mismo | Control por `version` (marco §6.9). |
| Movimientos después del cierre | Fuera de este documento (Cierre y rendición, v1.1); el contexto ya entrega el evento cerrado en solo lectura. |
| Se corre dos veces el script de carga | No duplica; termina sin cambios (3.1). |
| Gasto de pintura tres semanas antes del concurso | Se registra con su fecha real; las fechas del evento no la restringen (3.2). |
| Devolución a un binomio que se retira | No se elige "Devoluciones" en el selector: se registra desde la inscripción (3.4). |
| Se crea "Premios" y ya existe desactivada | Se ofrece reactivarla (3.4). |
| Un formulario manipulado envía el id de una categoría o contraparte de otra organización | Se rechaza: toda referencia se valida contra la organización del contexto (5.2). |
| Uso en la cancha con mala señal | Configuración es de escritorio o de oficina. En la cancha solo se usan los selectores, que cargan las listas activas con la pantalla (menos de unos cientos de filas) y filtran en el teléfono sin nuevas consultas. |

---

## 4. Cumplimiento normativo

Aplica: las contrapartes pueden ser personas naturales (nombre, contacto, RUT), y el script de carga registra correos de usuarios. Lo transversal está en marco §9; aquí solo lo específico.

- **Normativa y vigencia** (reverificada el 2026-09-27): Ley 19.628, vigente. Ley 21.719, entra en vigencia el **2026-12-01**; el proyecto de prórroga a 2027 (Boletín 18.623-07) sigue en primer trámite constitucional en la Comisión de Constitución del Senado, sin informe ni votación al 2026-09-24. El diseño la cumple desde el inicio (marco §9.1).
- **Datos regulados en este componente:** nombre, contacto y RUT de contrapartes personas naturales; correo y nombre de los administradores precargados.
- **Base de licitud:** contrapartes, ejecución del acuerdo de auspicio o compra (marco §9.2). Administradores, consentimiento con aviso de privacidad en el primer ingreso (Acceso y roles).
- **Medidas específicas:**
  - contacto y RUT opcionales, sin domicilio ni datos bancarios;
  - el observador no ve contacto ni RUT (tampoco en respuestas de la API ni en exportaciones);
  - los datos de la carga inicial se pasan en un archivo local ignorado por Git: nunca quedan en el repositorio;
  - el logo no se acepta en SVG y se sirve solo a usuarios con membresía activa;
  - todas las consultas pasan por el contexto de organización, con prueba automática de aislamiento.
- **Derechos de los titulares:** acceso, rectificación, supresión y portabilidad desde la ficha de la contraparte (3.5).
- **Trazabilidad y conservación:** toda creación, edición, desactivación, fusión y supresión queda en `RegistroAuditoria`. La supresión no copia los valores eliminados a la auditoría. La eliminación de contacto y RUT al vencer el plazo (marco §9.5) usará la misma acción de supresión (futuro).

---

## 5. Especificación de ejecución

Stack heredado del marco §8, sin cambios. Nombres de entidad del marco §5. Columnas en `snake_case` con `@map`.

### 5.1 Modelo de datos (Prisma)

Solo las entidades de este componente. `RegistroAuditoria`, `Usuario` y `Membresia` se crean en el esqueleto técnico; su detalle lo definen el marco (§6.8) y Acceso y roles.

```prisma
enum EstadoEvento { abierto cerrado rendido }
enum TipoCategoria { ingreso gasto }

model Organizacion {
  id            String   @id @default(cuid())
  nombre        String
  nombreNormalizado String @unique
  logoRuta      String?  // relativa a RUTA_RESPALDOS
  logoTipoMime  String?
  version       Int      @default(1)
  creadoEn      DateTime @default(now())
  actualizadoEn DateTime @updatedAt
  // relaciones: eventos, membresias, categorias, contrapartes, ...
}

model Evento {
  id                  String       @id @default(cuid())
  organizacionId      String
  nombre              String
  fechaInicio         DateTime     @db.Date
  fechaTermino        DateTime     @db.Date
  fechaReferenciaEdad DateTime?    @db.Date   // null = fechaInicio
  lugar               String?
  estado              EstadoEvento @default(abierto)
  cerradoEn           DateTime?    // lo escribe Cierre y rendición (v1.1)
  rendidoEn           DateTime?    // inicia el plazo de conservación (marco §9.5)
  version             Int          @default(1)
  creadoEn            DateTime     @default(now())
  actualizadoEn       DateTime     @updatedAt
  @@index([organizacionId])
}

model Categoria {
  id                String        @id @default(cuid())
  organizacionId    String
  nombre            String
  nombreNormalizado String
  tipo              TipoCategoria
  claveSistema      String?       // "inscripciones" | "devoluciones" | "aporte_inicial"
  activa            Boolean       @default(true)
  orden             Int
  version           Int           @default(1)
  creadoEn          DateTime      @default(now())
  actualizadoEn     DateTime      @updatedAt
  @@unique([organizacionId, tipo, nombreNormalizado])
  @@unique([organizacionId, claveSistema])
}

model Contraparte {
  id                String   @id @default(cuid())
  organizacionId    String
  nombre            String
  nombreNormalizado String
  esAuspiciador     Boolean  @default(false)
  esProveedor       Boolean  @default(false)
  contacto          String?
  rut               String?  // normalizado "12345678-9"
  activa            Boolean  @default(true)
  fusionadaEnId     String?  // contraparte conservada tras una fusión
  creadoPorId       String
  version           Int      @default(1)
  creadoEn          DateTime @default(now())
  actualizadoEn     DateTime @updatedAt
  @@index([organizacionId, nombreNormalizado])
  @@index([organizacionId, rut])
}
```

Restricción adicional por migración SQL: índice único parcial que impide dos eventos abiertos por organización:
`CREATE UNIQUE INDEX evento_un_abierto ON evento (organizacion_id) WHERE estado = 'abierto';`

Reglas de código:

- Las fechas de negocio (`fechaInicio`, `fechaTermino`, `fechaReferenciaEdad`) son `DATE` sin hora: se leen y escriben como `AAAA-MM-DD` para evitar corrimientos de un día por zona horaria.
- Las categorías de sistema se identifican **solo** por `claveSistema`, nunca por nombre (el nombre es editable).
- `fechaReferenciaEdadEfectiva(evento) = evento.fechaReferenciaEdad ?? evento.fechaInicio`. Es la única función que usan Participantes e Inscripción.
- `normalizarNombre(texto)`: minúsculas, NFD sin diacríticos, sin puntuación, espacios colapsados y recortados. Se usa en organización, categorías y contrapartes.
- `validarRut(texto)`: módulo 11, acepta con o sin puntos y guion, devuelve la forma normalizada o error.

### 5.2 Contexto y aislamiento (`src/lib/`)

- `obtenerContexto()`: implementa 3.6. Se llama en cada server action, route handler y página protegida. Devuelve `{ usuario, organizacionId, rol, evento }` o redirige.
- `exigirRol(ctx, ...roles)`: corta con 403 si el rol no está en la lista. Acceso y roles la usa para aplicar la matriz completa.
- `db(ctx)`: cliente Prisma extendido (`$extends` de consultas) que **agrega `organizacionId`** al `where` de toda lectura, actualización y conteo, y al `data` de toda creación, en los modelos con ese campo. El cliente Prisma sin extender solo lo importan `src/lib/auth`, `src/lib/contexto` y el script de carga; una regla de ESLint (`no-restricted-imports`) lo prohíbe en el resto.
- **Referencias entre entidades:** el filtro de `db(ctx)` protege las consultas, pero no impide guardar el id de un registro de otra organización (por ejemplo, un `categoriaId` o `contraparteId` manipulado en el formulario). Antes de crear o modificar, toda referencia a otra entidad de negocio se valida con `exigirDeLaOrganizacion(ctx, modelo, id)`, que busca el registro con `db(ctx)` y corta con error si no existe en la organización. La usan este componente (fusión) y todos los que guardan referencias.
- `ocultarDatosPersonales(ctx, contraparte)`: quita `contacto` y `rut` si el rol es observador. Se aplica en el servidor antes de devolver datos, nunca solo en la interfaz.
- Auditoría: se usa la función transversal `registrarAuditoria(ctx, { entidad, entidadId, accion, antes, despues })` del esqueleto. Acciones nuevas usadas aquí: `desactivar`, `reactivar`, `fusionar`, `suprimir_datos`.

### 5.3 Script de carga inicial

- `scripts/carga-inicial.ts`, ejecutado con `npm run carga-inicial -- --archivo ./carga-inicial.json`.
- `carga-inicial.json` y `*.local.json` en `.gitignore`. Se versiona `carga-inicial.ejemplo.json` con datos ficticios.
- Formato:

```json
{
  "organizacion": { "nombre": "Club Ejemplo" },
  "evento": { "nombre": "Concurso de Ejemplo", "fechaInicio": "2026-01-01", "fechaTermino": "2026-01-01", "lugar": "Ciudad" },
  "administradores": ["admin1@example.com", "admin2@example.com"]
}
```

- Valida con Zod, crea todo en una transacción (3.1), crea las categorías de 3.4 con su orden y es idempotente por `nombreNormalizado` de la organización.

### 5.4 Pantallas y componentes

| Ruta o componente | Rol | Contenido |
|---|---|---|
| `/configuracion/evento` | Administrador | Formulario de 3.2 con vista previa de cambio de fechas. |
| `/configuracion/organizacion` | Administrador | Nombre y logo (3.3). |
| `/configuracion/categorias` | Administrador | Dos listas, crear, renombrar, cambiar tipo, desactivar, reactivar, ordenar (3.4). |
| `/contrapartes` | Todos con membresía activa | Lista con búsqueda y filtro por tipo y activas. El observador ve solo nombre y tipo. |
| `/contrapartes/[id]` | Administrador y ayudante (el observador ve nombre y tipo) | Ficha, movimientos, y para el administrador: editar, desactivar, fusionar, suprimir, descargar. |
| `/api/organizacion/logo` | Todos con membresía activa | Sirve el logo desde el volumen tras verificar la membresía. |
| `<SelectorCategoria tipo>` | Administrador y ayudante | Para Movimientos (3.4). |
| `<SelectorContraparte tipoMovimiento>` | Administrador y ayudante | Búsqueda, aviso de duplicado y creación en línea (3.5). |
| Encabezado | Todos | Logo, organización y evento vigente (3.6). |

Validación con Zod compartida entre formulario y servidor para evento, organización, categoría y contraparte. Cada edición envía `version` y el servidor rechaza si no coincide.

Logo: validar tipo por contenido (bytes iniciales), no por extensión; guardar en `RUTA_RESPALDOS/organizacion/<id>/logo-<marcaDeTiempo>.<ext>`; responder con `Cache-Control: private`.

### 5.5 Pruebas (Vitest)

- Aislamiento: con dos organizaciones de prueba, un usuario de una no puede leer, contar, actualizar ni crear en la otra, para `Evento`, `Categoria` y `Contraparte` (se amplía en cada componente).
- Contexto: sin membresía activa no hay acceso; evento vigente según 3.6; la base rechaza un segundo evento abierto.
- Referencias: `exigirDeLaOrganizacion` rechaza ids de otra organización (se prueba con la fusión y se reutiliza en cada componente).
- Observador: `contacto` y `rut` nunca llegan en la respuesta.
- Categorías: nombre repetido por tipo rechazado; las de sistema no se desactivan ni cambian de tipo; cambio de tipo rechazado si hay movimientos.
- Contrapartes: parecidos detectados según 3.5; RUT inválido rechazado; RUT repetido bloquea; fusión reasigna movimientos, completa campos vacíos, desactiva el duplicado y deja un solo registro de auditoría; el ayudante no puede editar, fusionar ni suprimir.
- Evento: fecha de término anterior a la de inicio rechazada; `fechaReferenciaEdadEfectiva` usa la de inicio cuando está vacía; con el evento cerrado o rendido la edición se rechaza.
- Categorías: crear o renombrar con el nombre de una desactivada se rechaza con la opción de reactivar; "Inscripciones" y "Devoluciones" no aparecen en el selector.
- Script: segunda ejecución no crea nada; crea las 13 categorías con sus claves de sistema.

---

## 6. Elementos que quedan obsoletos

- **Marco general §10.2, lista de categorías iniciales:** queda reemplazada por la tabla de 3.4, que agrega la categoría de sistema "Aporte inicial". **Desviación declarada y resuelta:** el marco §10.2 se actualizó (v1.1) para referenciar esta lista. El marco sigue siendo dueño de la regla "las categorías de sistema no se eliminan" y este documento es dueño de la lista.
- **Listas informales de auspiciadores y proveedores** en planillas sueltas: quedan redundantes una vez cargadas como contrapartes.
- Código: ninguno, revisado: el repositorio solo tiene documentación.

---

## 7. Plan de acción

| # | Paso | Depende de |
|---|---|---|
| 1 | Modelos `Organizacion`, `Evento`, `Categoria`, `Contraparte` en `schema.prisma`, migración con el índice único parcial | Esqueleto técnico (marco §12, paso 3) |
| 2 | `normalizarNombre`, `validarRut`, `fechaReferenciaEdadEfectiva` con pruebas | 1 |
| 3 | `obtenerContexto`, `exigirRol`, `db(ctx)`, `ocultarDatosPersonales`, regla de ESLint y prueba de aislamiento | 1 |
| 4 | Script de carga inicial y archivo de ejemplo; ejecutarlo en Railway con los datos de Rod | 1, 2, Acceso y roles (vinculación del primer login) |
| 5 | Encabezado con organización y evento vigente | 3 |
| 6 | `/configuracion/categorias` y `<SelectorCategoria>` | 3 |
| 7 | `/contrapartes`, ficha, `<SelectorContraparte>` con creación en línea y aviso de duplicado | 2, 3 |
| 8 | Edición, desactivación y fusión de contrapartes | 7 |
| 9 | `/configuracion/evento` (vista previa de edades se conecta al implementar Participantes) | 3 |
| 10 | Supresión de datos de contrapartes | 7 |
| 11 | `/configuracion/organizacion` con logo | 3 |
| 12 | Descarga CSV de la ficha de contraparte | 7 |

Si el plazo del 2026-10-04 aprieta, los pasos 11 (logo) y 12 (descarga CSV) pasan a v1.1 sin afectar a otros componentes. Los pasos 1 a 8 son imprescindibles para Movimientos.

---

## 8. Riesgos

| Riesgo | Tipo | Mitigación |
|---|---|---|
| Una consulta olvida el filtro por organización | Normativo / técnico | `db(ctx)` lo agrega siempre; ESLint prohíbe el cliente sin extender; prueba de aislamiento en cada componente. |
| Un registro apunta a una categoría o contraparte de otra organización | Normativo / técnico | `exigirDeLaOrganizacion` antes de cada escritura con referencias, con prueba (5.2). |
| Contrapartes duplicadas por carga en terreno | Operativo | Aviso de parecido, bloqueo por RUT y fusión con auditoría. |
| Fusión equivocada | Operativo | Vista lado a lado antes de confirmar; la auditoría guarda los movimientos reasignados para revertir a mano. |
| Renombrar una categoría cambia cómo se ven movimientos antiguos | Experiencia | Es el comportamiento buscado para la rendición; el nombre anterior queda en auditoría. El código usa `claveSistema`, así que renombrar una de sistema no rompe reglas. |
| Cambio de fecha deja menores sin apoderado | Normativo | Vista previa con destacado antes de guardar; advertencia visible en Participantes. |
| Corrimiento de un día en fechas por zona horaria | Técnico | Columnas `DATE` y manejo como texto `AAAA-MM-DD`. |
| Logo con contenido malicioso | Técnico | Sin SVG, tipo verificado por contenido, máximo 1 MB, servido solo tras verificar membresía. |
| Datos reales del club en el repositorio | Normativo | Archivo de carga ignorado por Git; solo se versiona un ejemplo ficticio. |
| Ejecutar dos veces la carga inicial | Operativo | Idempotente por nombre normalizado. |
| El logo y la descarga CSV atrasan el núcleo | Plazo | Marcados como recortables a v1.1 (7). |
| Costo | Costo | Ninguno adicional: misma app, base y volumen. |

---

## 9. Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 0.1 | Primer borrador para revisión | Sesión de trabajo con Rod: carga por script con edición básica en pantalla; aporte inicial como categoría de sistema de uso opcional; evento con fechas de inicio, término, referencia para la edad y lugar; contrapartes creadas por administrador y ayudante, editadas y fusionadas solo por el administrador, con marcas no excluyentes de auspiciador y proveedor; categorías editables sin subcategorías; un evento abierto sin selector; cambio de fechas con aviso; nombre y logo de la organización editables |
| 2026-09-27 | 1.0 | Aprobado por Rod sin cambios de contenido; se registra la actualización del marco §10.2 | Aprobación |
| 2026-09-27 | 1.1 | Revisión de puntos abiertos: las fechas del evento son informativas; configuración del evento solo con evento abierto; "Devoluciones" fuera del selector (solo desde la inscripción); aviso y reactivación ante nombre de categoría desactivada; categorías nuevas al final; la fusión sube la `version` de los movimientos; usuario opcional en auditoría para el script; validación de referencias entre organizaciones (`exigirDeLaOrganizacion`); se anotan los pendientes que pertenecen a Acceso y roles, Movimientos e Inscripción de binomios | Revisión pedida por Rod; decisiones de Rod sobre Devoluciones y fechas |
