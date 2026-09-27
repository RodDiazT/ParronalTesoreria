# Acceso y roles

Estado: Aprobado · Versión 1.4 · Responsable: Rod (Administrador) · Ejecutor: Claude Code

## 1. Índice

- **Padre:** `docs/marco-general/marco-general-proyecto.md`. Alcance dentro del padre: el login con Google, el ciclo de la `Membresia` (§5), la aplicación en código de la matriz de permisos (§2.2) y el aviso de privacidad con el consentimiento de los usuarios del portal (§9.2, §9.6).
- **Hijos:** ninguno.
- **Depende de:** `docs/organizacion/organizacion-evento.md` (función `obtenerContexto`, `exigirRol`, `db(ctx)` y script de carga inicial, §3.1, §3.6 y §5.2).
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

**Qué es.** Es la puerta del portal. Define cómo una persona entra con su cuenta de Google, cómo queda como solicitante sin ver nada, cómo un administrador la aprueba o la invita con un rol, cómo se cambia o revoca ese rol y cómo el código aplica la matriz de permisos del marco en cada acción. Incluye el aviso de privacidad que acepta todo usuario en su primer ingreso.

**Versión:** v1.0 (en uso al 2026-10-04). Es lo primero que se implementa después del esqueleto técnico.

**Conexión con el proyecto.**

| Documento | Relación |
|---|---|
| Marco general | Dueño de los actores y de la matriz de permisos (§2), de los estados y roles de `Membresia` (§5) y del cumplimiento transversal (§9). Este documento los aplica y no los redefine. |
| Organización y evento | Dueño de `obtenerContexto`, `exigirRol` y `db(ctx)`. Este documento define qué pasa antes de que exista contexto (sin sesión, sin membresía activa) y cómo el script de carga crea los administradores que después se vinculan con su primer ingreso. |
| Movimientos, Participantes, Inscripción de binomios, Importación, Dashboard | Usan `puede(ctx, accion)` (5.4) para cada acción de la matriz. Las reglas que dependen del registro, como "solo los propios por validar" o "nunca valida lo suyo", las aplica cada dominio con las funciones auxiliares de 5.4. |
| Movimientos | Dueño de la pantalla de historial de auditoría y de lo que ve el ayudante de ella. Este documento solo agrega las acciones de auditoría de acceso (5.6). |

**Fuera de alcance.**

- Crear organizaciones, pertenecer a varias o elegir entre ellas (futuro, marco §4). En v1.0 la solicitud se asocia a la única organización existente (3.2).
- Acceso de jinetes, apoderados, clubes, auspiciadores o proveedores. No usan el portal en v1.0, y el formulario de inscripción (v1.1) no requiere login.
- Notificaciones por correo. El aviso de solicitudes pendientes es solo dentro del portal (decisión de Rod).
- Otros proveedores de login (correo y contraseña, Microsoft, Apple).
- Permisos a medida por usuario. Solo existen los tres roles del marco.
- Un tope técnico de usuarios. El marco fija 5 como escala de diseño, no como regla: se muestra la cantidad de accesos activos y, al pasar de 5, una advertencia que no bloquea (3.5).

### Justificación de valor

a. **Problema que reduce o carga que elimina.** Al **administrador** le da control de quién ve la plata del evento sin depender de alguien técnico: aprueba, invita, cambia de rol y revoca desde el celular, y cada cambio queda en auditoría. Al **ayudante** le evita contraseñas propias y le permite entrar una vez y seguir registrando en la cancha durante 30 días sin volver a ingresar con mala señal. A los socios y a los terceros cuyos datos están en el portal les garantiza que nadie sin aprobación ve nada.

b. **Métricas del marco (§3) que mueve.** Operativo a tiempo (sin acceso no funciona ningún otro componente). Trazabilidad total (cada acción queda asociada a una persona identificada con su rol). Tiempo para registrar un gasto < 1 minuto (sin login repetido en terreno).

c. **Datos o recursos nuevos.** Nombre, correo e imagen de Google del usuario, ya previstos en el marco §9.2. Mensaje opcional al solicitar, para que el administrador reconozca a quien pide acceso. Fecha y versión del aviso de privacidad aceptado, como prueba del consentimiento. Credenciales OAuth de Google (tarea t-004), sin costo.

d. **Costo de mantención.** Cero. Corre en la misma app y base de Railway. Google OAuth no cobra por inicio de sesión.

e. **¿Se resuelve con algo existente?** No. Organización y evento solo lee la membresía activa y no define cómo se crea ni cómo cambia.

---

## 3. Flujo operativo y experiencia

### 3.1 Ingreso con Google (todos)

1. La persona abre la URL del portal. Sin sesión, ve `/ingresar`: el nombre genérico "Tesorería del concurso", un botón **Ingresar con Google** y un enlace a **Aviso de privacidad** (`/privacidad`, página estática que se ve sin iniciar sesión). No se muestra el nombre del club ni ningún otro dato.
2. Google autentica. El portal acepta el ingreso solo si Google informa el correo como **verificado**. Si no, muestra "Tu cuenta de Google no tiene el correo verificado" y no crea nada.
3. **Vinculación por correo.** Si ya existe un `Usuario` con ese correo (un administrador precargado por el script o una persona invitada, 3.3), el ingreso se vincula a él. Si no existe, se crea el `Usuario` con nombre, correo e imagen de Google. El correo se compara en minúsculas y sin espacios. No se unifican variantes con puntos de Gmail.
4. **Aviso de privacidad en el primer ingreso.** Si el usuario no aceptó la versión vigente del aviso, antes de cualquier otra pantalla ve `/bienvenida`: el texto resumido del aviso (3.8), el enlace al texto completo, la casilla obligatoria "Leí y acepto el aviso de privacidad" y el botón **Continuar**. Esto aplica también a administradores e invitados, porque el consentimiento es la base de licitud (marco §9.2). Si el aviso cambia de versión, se vuelve a pedir la aceptación.
5. Después, `obtenerContexto` (Organización y evento §3.6) decide el destino:
   - con membresía `activa` → la app, según su rol;
   - sin membresía activa → `/solicitud` (3.2).
6. Queda un `RegistroAuditoria` `ingresar` por cada sesión nueva (no por cada página), y `aceptar_aviso` al aceptar el aviso.

**Duración de la sesión:** 30 días, renovada con el uso (se extiende como máximo una vez al día). Las sesiones se guardan en la base (marco §8). De todas formas, cada solicitud vuelve a revisar la membresía en `obtenerContexto`, así que revocar o cambiar un rol **surte efecto en la siguiente acción** del usuario, sin esperar a que venza la sesión.

**Cerrar sesión:** en **Mi cuenta** hay dos opciones: "Cerrar sesión" (solo este dispositivo) y "Cerrar sesión en todos mis dispositivos", para el caso de un teléfono perdido.

### 3.2 Solicitud de acceso (solicitante)

Pantalla `/solicitud`, para usuarios con sesión y sin membresía activa. No muestra el nombre del club, del evento ni ningún otro dato del portal (marco §2.1). Tiene tres estados:

| Situación | Qué ve |
|---|---|
| Nunca solicitó | "Aún no tienes acceso." Un campo opcional **Mensaje para el administrador** (hasta 200 caracteres, ayuda: "Por ejemplo: Soy Pedro, de la comisión") y el botón **Solicitar acceso**. |
| Solicitud pendiente (`solicitada`) | "Tu solicitud está pendiente. Avisa al administrador del evento para que la revise." Muestra la fecha de la solicitud. No muestra nombres de administradores ni de nadie más. No hay más acciones. |
| Rechazada o revocada (`revocada`) | "No tienes acceso." Botón **Volver a solicitar**, que abre de nuevo el campo de mensaje. El motivo que escribió el administrador es una nota interna y nunca se muestra al solicitante. |

Al enviar, la `Membresia` queda `solicitada`, sin rol, asociada a la **única** organización existente. Si hubiera cero o más de una organización, la solicitud muestra "Solicitudes no disponibles" y registra el error: el selector y los enlaces por organización son futuros (marco §4). Hay una sola membresía por usuario y organización. Volver a solicitar reutiliza la misma membresía (pasa de `revocada` a `solicitada`) y el historial queda en la auditoría.

Queda un `RegistroAuditoria` `solicitar_acceso` con el mensaje.

### 3.3 Invitación (administrador)

Para que alguien de la comisión entre directo, sin esperar la aprobación:

1. En **Usuarios → Invitar**, el administrador escribe el correo de Google de la persona y elige el rol (`administrador`, `ayudante` u `observador`).
2. Se crea un `Usuario` con ese correo, todavía sin cuenta de Google vinculada, y una `Membresia` `activa` con ese rol. Es el mismo mecanismo que usa el script de carga para los dos administradores (Organización y evento §3.1), así que no hace falta un estado nuevo.
3. En la lista aparece como **Invitado, sin ingreso** hasta que la persona entra por primera vez (3.1, paso 3) y acepta el aviso.
4. Si el correo ya tiene un `Usuario`:
   - con membresía `solicitada` → se ofrece **aprobar la solicitud** con el rol elegido;
   - con membresía `activa` → "Ya tiene acceso como <rol>";
   - con membresía `revocada` → se ofrece **reactivar** con el rol elegido.
5. La invitación **no vence**: queda como "Invitado, sin ingreso" hasta que la persona entra o un administrador la retira con **Revocar**, igual que cualquier acceso.

Si la persona entra con una cuenta de Google distinta de la invitada, se crea otro usuario que queda como solicitante. El administrador aprueba esa solicitud y revoca la invitación que no se usó. La pantalla de solicitudes muestra el correo completo para distinguirlas.

Queda un `RegistroAuditoria` `invitar` con correo y rol.

### 3.4 Revisión de solicitudes (administrador)

**Aviso dentro del portal.** El menú del administrador muestra **Usuarios** con un contador de solicitudes pendientes (por ejemplo, "Usuarios · 2"), y el inicio del administrador muestra una franja "Hay 2 solicitudes de acceso por revisar" mientras haya alguna. No se envían correos.

Pantalla `/usuarios`, pestaña **Solicitudes**: por cada una, imagen, nombre y correo de Google, mensaje, fecha y, si existen, las veces anteriores en que se rechazó o revocó su acceso, con fecha y motivo.

| Acción | Regla |
|---|---|
| **Aprobar** | Se elige el rol (sin valor por defecto, para que sea una decisión consciente). La membresía pasa a `activa`. Auditoría `aprobar_acceso` con el rol. |
| **Rechazar** | Motivo opcional, nota interna que solo ven los administradores. La membresía pasa a `revocada` sin haber estado activa, y la interfaz la muestra como "Rechazada". Auditoría `rechazar_acceso`. |

### 3.5 Gestión de usuarios (administrador)

Pestañas de `/usuarios`: **Solicitudes**, **Con acceso** (activos, incluidos invitados sin ingreso) y **Sin acceso** (rechazados y revocados). Se muestra el total de accesos activos. **Tope de 5 como aviso** (decisión de Rod): si al aprobar, invitar o reactivar el total de accesos activos pasaría de 5, se muestra "Habrá N personas con acceso; el portal está pensado para 5. ¿Continuar?" y se puede confirmar igual.

| Acción | Sobre | Regla |
|---|---|---|
| Cambiar rol | Activo | Rol nuevo y confirmación. Surte efecto en la siguiente acción del usuario. Auditoría `cambiar_rol` con antes y después. |
| Revocar | Activo o invitado | Motivo obligatorio. La membresía pasa a `revocada` y se cierran todas las sesiones de esa persona. Auditoría `revocar_acceso`. |
| Reactivar | Rechazado o revocado | Se elige el rol. Pasa a `activa`. Auditoría `reactivar_acceso`. |
| Suprimir datos | Rechazado o revocado | Ver 3.9. |

**Los dos administradores tienen exactamente los mismos poderes** (decisión de Rod). Cualquiera puede aprobar, invitar, cambiar roles y revocar, incluso al otro administrador o a sí mismo, con una sola restricción:

**Nunca queda la organización sin administrador activo** (marco §2.2). Se rechaza, con el mensaje "La organización debe tener al menos un administrador activo", cualquier cambio de rol o revocación que deje cero membresías activas con rol `administrador`. La regla se verifica dentro de la misma transacción que hace el cambio, con bloqueo de las filas de administradores, para que dos administradores que se revocan mutuamente al mismo tiempo no dejen la organización sin ninguno (5.3).

Si un administrador se quita a sí mismo el rol de administrador (habiendo otro), se le pide una confirmación adicional ("Perderás el acceso a Usuarios y Configuración"), y al guardar se recarga su vista con el rol nuevo.

**Advertencia antes de revocar o bajar de rol a un ayudante** (decisión de Rod: se conservan y se avisa). Antes de confirmar, se muestra lo que la persona deja abierto:

- movimientos registrados por ella que están `por_validar` u `observado`;
- gastos con `pagadoPor` = esa persona y `estadoPago` = `pendiente`, es decir, reembolsos por pagarle.

Nada de eso cambia. Los movimientos siguen visibles para los administradores, que los validan, corrigen o anulan como cualquier otro. Los reembolsos siguen siendo por pagar a esa persona hasta que se marquen pagados. Como nadie más edita los movimientos observados de otro (marco §2.2), el administrador los corrige o los anula. Si Movimientos aún no está implementado, la advertencia se omite.

**Edición simultánea:** cada acción envía la `version` de la membresía; si cambió, el segundo administrador recibe el aviso del marco §6.9 y recarga.

### 3.6 Qué ve cada rol

La matriz del marco §2.2 es la regla. Aquí solo se precisa cómo se ve en la interfaz:

| | Administrador | Ayudante | Observador | Solicitante |
|---|---|---|---|---|
| Menú (grupos, contadores y orden en UX/UI §3.3) | Todo, incluidos **Usuarios** y **Configuración** | Registro, listados, dashboard, **Comisión**, Mi cuenta | Dashboard, listados, **Comisión**, Mi cuenta | Solo `/solicitud` y Mi cuenta |
| Lista de quiénes tienen acceso | Completa en **Usuarios** (correo, estado, historial, acciones) | **Comisión**: nombre, imagen y rol de cada acceso activo, sin correos | Igual que el ayudante | No |
| Botones de acciones no permitidas | — | No se muestran | No se muestran | — |
| Datos personales y respaldos | Sí | Sí | Se ocultan en el servidor, no solo en la interfaz | — |

**Comisión** (`/comision`, decisión de Rod): lista de solo lectura para que ayudantes y observadores sepan quién está en el portal y a quién acudir. Muestra solo membresías activas con usuario que ya ingresó. No muestra correos, invitados sin ingreso, solicitudes ni accesos revocados. Se considera un listado de la matriz del marco §2.2 ("Ver dashboard y listados"). El nombre y la imagen de un usuario no son datos personales restringidos al observador según esa matriz, que restringe contacto, RUT, fecha de nacimiento y apoderado.

Ocultar un botón es solo comodidad. La regla se aplica **siempre en el servidor** con `puede(ctx, accion)` en cada server action y route handler (5.4). Una URL escrita a mano sin permiso devuelve 403 con la página "No tienes permiso para esto".

**Mi cuenta** (todos con sesión): nombre, correo e imagen de Google, rol actual (o "Sin acceso"), fecha de aceptación del aviso, enlace al aviso, y los dos botones de cierre de sesión (3.1). El nombre no se edita en el portal: viene de Google y se actualiza en cada ingreso.

### 3.7 Casos borde revisados

| Caso | Tratamiento |
|---|---|
| Un administrador precargado entra por primera vez | Se vincula por correo verificado (3.1). Acepta el aviso y entra con su rol. |
| Invitado entra con otra cuenta de Google | Queda como solicitante con la otra cuenta. El administrador la aprueba y revoca la invitación sin uso (3.3). |
| Los dos administradores se revocan mutuamente al mismo tiempo | Transacción con bloqueo: la segunda operación ve que quedaría sin administrador y se rechaza (3.5, 5.3). |
| El único administrador activo intenta bajarse de rol | Se rechaza. Primero debe haber otro administrador activo. |
| Ayudante revocado con movimientos por validar o reembolsos pendientes | Se conservan y se avisa antes de confirmar (3.5). |
| Teléfono perdido o robado con sesión abierta | La persona usa "Cerrar sesión en todos mis dispositivos" desde otro equipo, o un administrador revoca y reactiva su acceso. Revocar cierra todas sus sesiones. |
| Persona desconocida inicia sesión y solicita | Ve solo "pendiente". El administrador la rechaza. No accede a ningún dato. |
| Alguien pide acceso muchas veces | Hay una sola membresía por usuario. Volver a solicitar no crea filas nuevas y solo es posible después de un rechazo. El historial se ve al revisar. |
| Cambio de rol mientras la persona está usando el portal | Su siguiente acción se evalúa con el rol nuevo. Si ya no tiene permiso, recibe 403 y la vista se recarga. |
| Ayudante pasa a observador | Deja de ver datos personales y respaldos desde la siguiente acción. Lo que registró se conserva. |
| Cuenta de Google con correo no verificado | Se rechaza el ingreso (3.1, paso 2). |
| La persona cambia su nombre o foto en Google | Se actualiza en el siguiente ingreso. Los registros previos la siguen mostrando con el nombre vigente, y la auditoría conserva el `usuarioId`. |
| Uso en la cancha con mala señal | La sesión dura 30 días, así que no se pide login en terreno. Si la sesión vence justo sin señal, el ingreso con Google requiere conexión: se recomienda entrar al portal el día anterior. El registro sin señal (v1.1) no cubre el login. |
| Invitación a alguien que nunca entra | No vence. Queda visible como "Invitado, sin ingreso" para que el administrador la revoque si fue un error (3.3). |
| Se suma una sexta persona el día del evento | Advertencia sobre el tope de 5, que no bloquea (3.5). |
| Un segundo evento u organización | Fuera de v1.0: la solicitud va a la única organización existente (3.2). |

### 3.8 Aviso de privacidad

Texto genérico (decisión de Rod): no nombra al club ni lleva un correo de contacto, así no hay que configurarlo ni exponerlo sin sesión. El texto se versiona en el código (`AVISO_PRIVACIDAD_VERSION`) y no contiene datos del club.

**Resumen (en `/bienvenida`):**

> Este portal lo usa la comisión organizadora del concurso para registrar y rendir los ingresos y gastos del evento. Al ingresar, guardamos tu nombre, correo e imagen de Google y un registro de las acciones que realizas. Los usamos solo para gestionar tu acceso y dejar trazabilidad de la tesorería; no se publican ni se ceden a terceros; algunos datos se procesan con un proveedor de inteligencia artificial que actúa por encargo de la comisión. Se conservan hasta un año después de que el club aprueba la rendición del evento. Para acceder, corregir o suprimir tus datos, u oponerte a su uso, escribe al administrador del evento.

**Texto completo (en `/privacidad`)**, que agrega:

- responsable: la comisión organizadora del concurso, a través de su administrador;
- finalidad única: administrar y rendir la tesorería del evento (marco §9.2);
- datos de usuarios: nombre, correo e imagen de Google, mensaje de solicitud, fecha de aceptación del aviso y registro de acciones;
- que el portal también contiene datos de jinetes, apoderados, clubes, auspiciadores y proveedores, tratados con la misma finalidad y conservación (marco §9.2, §9.5);
- encargado de tratamiento: Google (API de Gemini, servicio de pago), que procesa por encargo de la comisión, fuera de Chile, parte de los datos de las planillas de inscripción que se importan (incluidos datos de menores) y, en v1.1, de las cartolas, solo para sugerir cómo leerlas; no los usa para otros fines (marco §9.4; Importación desde Excel §4);
- conservación: hasta la aprobación de la rendición más un año (marco §9.5);
- derechos: acceso, rectificación, supresión, oposición y portabilidad, pidiéndolos al administrador del evento (marco §9.6);
- formulario de inscripción (v1.1): datos del remitente (nombre, teléfono o correo y relación con el jinete) y comprobante de pago que adjunte; si la solicitud no se acepta, sus datos se eliminan a los 30 días (Formulario de inscripción §4);
- normativa: Ley 19.628 y Ley 21.719.

El texto de `/privacidad` sirve también como base del texto breve para el canal de inscripción (marco §9.6), que adapta el Formulario de inscripción (v1.1).

### 3.9 Derechos de los usuarios del portal

- **Acceso:** Mi cuenta muestra los datos guardados. El historial de acciones lo entrega el administrador desde la auditoría (Movimientos).
- **Rectificación:** nombre e imagen vienen de Google y se corrigen allí. El portal los actualiza en el siguiente ingreso.
- **Supresión u oposición:** el administrador revoca el acceso y, sobre un usuario rechazado o revocado, usa **Suprimir datos**: borra imagen y mensajes de solicitud, reemplaza el correo por `suprimido-<id>` y elimina sus cuentas y sesiones vinculadas, así que no puede volver a ingresar con ese usuario. Se conserva el **nombre**, porque identifica quién registró o validó movimientos (trazabilidad de la rendición, marco §6.8). Auditoría `suprimir_datos` sin copiar los valores eliminados (igual que en Organización y evento §3.5). Si esa persona vuelve a ingresar con Google, se crea un usuario nuevo.
- **Portabilidad:** Mi cuenta ofrece "Descargar mis datos" (JSON con nombre, correo, rol, fechas de membresía y aceptación del aviso). Si el plazo aprieta, se puede recortar a v1.1 (7).

---

## 4. Cumplimiento normativo

Aplica: el componente recolecta y guarda datos personales de los usuarios del portal y controla el acceso a datos de terceros, incluidos menores de edad y datos financieros en respaldos. Lo transversal está en el marco §9. Aquí solo va lo específico.

- **Normativa y vigencia** (reverificada el 2026-09-27): Ley 19.628, vigente. Ley 21.719, entra en vigencia el **2026-12-01**. El proyecto de prórroga a 2027 (Boletín 18.623-07) ingresó al Senado el 2026-09-01 con urgencia y seguía en primer trámite, sin informe de comisión ni votación, a la última revisión disponible. La fecha legal no cambia mientras no se apruebe y publique. El diseño cumple la Ley 21.719 desde el inicio (marco §9.1).
- **Datos regulados en este componente:** nombre, correo e imagen de Google; mensaje de solicitud; fecha y versión del aviso aceptado; registro de ingresos y cambios de acceso.
- **Base de licitud:** consentimiento informado, con casilla obligatoria antes de usar el portal (3.1, paso 4), que incluye a los administradores precargados y a los invitados. Se guarda la fecha y la versión del aviso aceptado como prueba.
- **Medidas específicas:**
  - solo se aceptan cuentas de Google con correo verificado;
  - el solicitante y quien no tiene sesión no ven ningún dato; `/ingresar`, `/privacidad` y `/solicitud` no muestran el nombre del club ni del evento;
  - la matriz del marco §2.2 se aplica en el servidor en cada acción (5.4), con pruebas automáticas por rol (5.8);
  - revocar un acceso surte efecto en la siguiente acción y cierra todas las sesiones de la persona;
  - no se guardan contraseñas ni tokens de Google más allá de lo que requiere el login: no se piden permisos de Gmail, Drive ni Calendar, solo `openid email profile`;
  - la cookie de sesión es `HttpOnly`, `Secure` y `SameSite=Lax` (valores por defecto de Auth.js en HTTPS).
- **Derechos de los titulares:** ver 3.9.
- **Trazabilidad y conservación:** toda solicitud, aprobación, rechazo, invitación, cambio de rol, revocación, reactivación, aceptación del aviso e ingreso queda en `RegistroAuditoria` (5.6). Los datos de usuario se conservan según el marco §9.5. Vencido el plazo, la eliminación futura usará la misma acción de supresión de 3.9.
- **Incidentes:** ante un acceso indebido, el administrador revoca (lo que cierra todas las sesiones de la persona) y revisa en la auditoría los ingresos y acciones (marco §9.7).

---

## 5. Especificación de ejecución

Stack heredado del marco §8, sin cambios: Auth.js con proveedor Google y sesiones en base de datos, Prisma, Zod y Vitest. Nombres de entidad del marco §5. Columnas en `snake_case` con `@map`.

### 5.1 Modelo de datos (Prisma)

```prisma
enum EstadoMembresia { solicitada activa revocada }
enum Rol { administrador ayudante observador }

model Usuario {
  id                    String    @id @default(cuid())
  correo                String    @unique        // minúsculas, sin espacios
  nombre                String?
  imagen                String?
  correoVerificadoEn    DateTime?
  avisoVersion          Int?                      // versión del aviso aceptado
  avisoAceptadoEn       DateTime?
  ultimoIngresoEn       DateTime?                 // null = invitado sin ingreso
  suprimidoEn           DateTime?
  creadoEn              DateTime  @default(now())
  actualizadoEn         DateTime  @updatedAt
  membresias            Membresia[]
  cuentas               Account[]
  sesiones              Session[]
}

model Membresia {
  id                 String          @id @default(cuid())
  organizacionId     String
  usuarioId          String
  rol                Rol?                         // null solo mientras está solicitada sin aprobar
  estado             EstadoMembresia
  mensajeSolicitud   String?                      // hasta 200 caracteres
  solicitadaEn       DateTime?
  invitadaPorId      String?
  aprobadaEn         DateTime?                    // también al invitar o reactivar
  aprobadaPorId      String?
  revocadaEn         DateTime?
  revocadaPorId      String?
  motivoRevocacion   String?                      // obligatorio al revocar, opcional al rechazar
  version            Int             @default(1)
  creadoEn           DateTime        @default(now())
  actualizadoEn      DateTime        @updatedAt
  @@unique([organizacionId, usuarioId])
  @@index([organizacionId, estado])
}

// Tablas técnicas de Auth.js (términos del framework en inglés, marco §8)
model Account {
  id                String  @id @default(cuid())
  usuarioId         String
  type              String
  provider          String
  providerAccountId String
  @@unique([provider, providerAccountId])
}

model Session {
  id           String   @id @default(cuid())
  sessionToken String   @unique
  usuarioId    String
  expires      DateTime
}
```

Notas del modelo:

- `Account` no guarda `access_token`, `refresh_token` ni `id_token`: el adaptador los descarta (5.2). Solo se necesita la identidad.
- Restricción adicional por migración SQL: `CHECK (estado <> 'activa' OR rol IS NOT NULL)`. Una membresía activa siempre tiene rol. Una solicitada puede no tenerlo, y una revocada puede no tenerlo si era una solicitud rechazada que nunca tuvo rol.
- "Rechazada" no es un estado: es una membresía `revocada` con `aprobadaEn` nulo. "Invitado sin ingreso" es una membresía `activa` cuyo usuario tiene `ultimoIngresoEn` nulo. Así se respetan los tres estados del marco §5 sin agregar otros.
- `Usuario` no lleva `organizacionId`: es la identidad global de una persona (marco §2.2, "roles por organización"). Solo se lista a través de `Membresia`, que sí lo lleva, así que el aislamiento se mantiene con `db(ctx)`. Las lecturas de `Usuario` fuera de la propia sesión se hacen siempre uniendo por membresía de la organización del contexto.
- Una fila `Session` es un dato técnico, no de negocio: cerrar sesiones las elimina. El principio "nada se borra" (marco §7) aplica a las entidades de negocio y a la auditoría.

### 5.2 Autenticación (`src/lib/auth/`)

- Auth.js (versión estable vigente) con `Google({ authorization: { params: { scope: "openid email profile", prompt: "select_account" } }, allowDangerousEmailAccountLinking: true })`. La vinculación por correo es segura porque solo se acepta un correo verificado por Google (callback `signIn`) y es el mecanismo que conecta a los precargados e invitados (3.1, paso 3).
- **Adaptador propio** `src/lib/auth/adaptador.ts` sobre los modelos `Usuario`, `Account` y `Session`, porque el `PrismaAdapter` estándar exige un modelo llamado `User` con campos en inglés. Implementa solo lo necesario para OAuth con sesiones en base de datos: `createUser`, `getUser`, `getUserByEmail`, `getUserByAccount`, `updateUser`, `linkAccount` (sin tokens), `createSession`, `getSessionAndUser`, `updateSession` y `deleteSession`. Normaliza el correo a minúsculas en todas.
- `session: { strategy: "database", maxAge: 30 días, updateAge: 24 horas }`.
- Callback `signIn`: rechaza si `profile.email_verified !== true`.
- Evento `signIn`: actualiza `nombre`, `imagen` y `ultimoIngresoEn`, y registra la auditoría `ingresar`.
- Páginas: `signIn: "/ingresar"`, `error: "/ingresar"`, con el mensaje de error en español.
- El cliente Prisma sin extender se usa en `src/lib/auth` (ya permitido por la regla de ESLint de Organización y evento §5.2).

### 5.3 Reglas de membresía (`src/dominio/acceso/`)

Acciones de servidor, todas con Zod, `version` y auditoría en la misma transacción:

| Función | Quién | Efecto |
|---|---|---|
| `aceptarAviso()` | Usuario con sesión | Guarda `avisoVersion` y `avisoAceptadoEn`. |
| `solicitarAcceso({ mensaje? })` | Usuario sin membresía activa | Crea la membresía `solicitada` o pasa una `revocada` a `solicitada`. Rechaza si ya está `solicitada` o `activa`. |
| `aprobarSolicitud({ membresiaId, rol, version })` | Administrador | `solicitada` → `activa` con rol. |
| `rechazarSolicitud({ membresiaId, motivo?, version })` | Administrador | `solicitada` → `revocada`. |
| `invitar({ correo, rol })` | Administrador | Crea `Usuario` y `Membresia` `activa`, o deriva a aprobar o reactivar (3.3). |
| `cambiarRol({ membresiaId, rol, version })` | Administrador | Sobre una membresía `activa`. Verifica el mínimo de administradores. |
| `revocar({ membresiaId, motivo, version })` | Administrador | `activa` → `revocada`. Verifica el mínimo de administradores y elimina las `Session` de ese usuario. |
| `reactivar({ membresiaId, rol, version })` | Administrador | `revocada` → `activa`. |
| `suprimirDatosUsuario({ membresiaId })` | Administrador | Solo sobre una membresía `revocada` (3.9). |
| `cerrarMisSesiones()` | Usuario con sesión | Elimina todas sus `Session`. |
| `resumenPendientesDe(usuarioId)` | Administrador | Conteos para la advertencia de 3.5. Devuelve ceros mientras Movimientos no exista. |

**Mínimo de un administrador.** `cambiarRol` y `revocar` hacen, dentro de una transacción:

1. `SELECT ... FROM membresia WHERE organizacion_id = $1 AND estado = 'activa' AND rol = 'administrador' FOR UPDATE`;
2. si la membresía afectada está en ese conjunto y el cambio la saca de él, y el conjunto tiene una sola fila, se rechaza;
3. se aplica el cambio.

El bloqueo de filas serializa dos revocaciones cruzadas.

La solicitud se asocia a la organización con `obtenerOrganizacionUnica()`, que devuelve la única `Organizacion` o un error si hay cero o más de una. La única excepción a `db(ctx)` es esta lectura, porque el solicitante todavía no tiene contexto. Vive en `src/lib/contexto` junto a `obtenerContexto`.

### 5.4 Matriz de permisos en código (`src/lib/permisos.ts`)

La matriz del marco §2.2 se traduce en **una sola tabla de datos**. Ningún componente compara roles a mano.

```ts
export type Accion =
  | "ver_dashboard" | "ver_respaldos" | "ver_datos_personales"
  | "registrar" | "importar_excel" | "revisar_formulario"
  | "conciliar_cartola" | "editar_propio_no_validado" | "editar_validado"
  | "validar" | "anular" | "anular_propio_por_validar"
  | "marcar_pendiente_pagado" | "gestionar_accesos" | "configurar"
  | "cerrar_evento" | "ver_auditoria" | "ver_auditoria_propia"
  | "ver_comision" // lista de 3.6, derivada de "Ver dashboard y listados"
  | "registrar_traspaso"; // solo administrador (marco §2.2; Dashboard §3.4)

const MATRIZ: Record<Rol, readonly Accion[]> = { /* transcripción literal del marco §2.2 */ };

export function puede(ctx: Contexto, accion: Accion): boolean;
export function exigir(ctx: Contexto, accion: Accion): void; // lanza 403
```

- `exigirRol` (Organización y evento §5.2) queda para casos puntuales. La regla general es `exigir(ctx, accion)`.
- Las condiciones que dependen del registro ("propio", "por validar", "nunca valida lo suyo") no van en la tabla. Cada dominio las evalúa con dos funciones auxiliares de este módulo: `esPropio(ctx, registro)` (compara `registradoPorId`) y `exigirNoPropio(ctx, registro)`, que usa Movimientos para impedir que se valide lo propio. Un administrador sí registra movimientos que quedan autovalidados (marco §6.2), así que `exigirNoPropio` aplica a la acción de validar un movimiento `por_validar` ajeno, no al autovalidado.
- `puedeVerDatosPersonales(ctx)` y `puedeVerRespaldos(ctx)` son atajos de `puede` que usan `ocultarDatosPersonales` (Organización y evento §5.2) y el servidor de archivos de respaldo.
- La interfaz recibe `permisos: Accion[]` del servidor para mostrar u ocultar botones. Nunca decide por su cuenta.

### 5.5 Pantallas y rutas

| Ruta | Acceso | Contenido |
|---|---|---|
| `/ingresar` | Sin sesión | Botón de Google, enlace al aviso y mensajes de error (3.1). |
| `/privacidad` | Público, estático | Aviso completo (3.8), sin datos del club. |
| `/bienvenida` | Con sesión, aviso no aceptado | Resumen, casilla y Continuar (3.1, paso 4). |
| `/solicitud` | Con sesión, sin membresía activa | Estados de 3.2. |
| `/usuarios` | Administrador | Pestañas Solicitudes, Con acceso y Sin acceso, e Invitar (3.3 a 3.5). |
| `/comision` | Administrador, ayudante y observador | Nombre, imagen y rol de los accesos activos, sin correos (3.6). |
| `/mi-cuenta` | Con sesión | Datos, rol, aviso, cierre de sesión y descarga de datos (3.6, 3.9). |
| `/sin-permiso` | Con sesión | Página del 403. |
| Middleware | Todas | Sin sesión → `/ingresar`. Con sesión y sin aviso aceptado → `/bienvenida`. El resto lo resuelve `obtenerContexto`. Excepciones públicas: `/ingresar`, `/privacidad` y, en v1.1, `/inscribirse/*` (Formulario de inscripción §5.3). |
| Menú | Con membresía activa | Ítems según `permisos` y contador de solicitudes para administradores; hamburguesa en el celular y lateral en el computador (UX/UI §3.3). |

Diseño para el celular con los patrones de UX/UI §3.7 a §3.10: listas con tarjetas, botones grandes y confirmaciones en hoja inferior. Las pantallas de usuarios se usan poco y pueden ser simples.

### 5.6 Auditoría

Se usa `registrarAuditoria(ctx, …)` del esqueleto (marco §6.8), con `entidad = "Membresia"` o `"Usuario"`. Acciones que agrega este componente: `ingresar`, `aceptar_aviso`, `solicitar_acceso`, `aprobar_acceso` (ya en el marco), `rechazar_acceso`, `invitar`, `cambiar_rol` (ya en el marco), `revocar_acceso`, `reactivar_acceso`, `cerrar_sesiones` y `suprimir_datos` (ya usada en Organización y evento). Para las acciones del solicitante, que aún no tiene contexto, se registra con el `organizacionId` de `obtenerOrganizacionUnica()` y su `usuarioId`.

### 5.7 Configuración de Google (tarea t-004)

Instrucciones para Rod, que Claude Code repite en el README al implementar:

1. En Google Cloud Console, crear el proyecto y configurar la **pantalla de consentimiento OAuth** como *Externa*, con alcances `openid`, `email` y `profile`, y **publicarla (En producción)**. Con esos alcances no se requiere verificación de Google, y en modo *Prueba* habría que registrar a cada usuario a mano.
2. Crear un **ID de cliente OAuth** de tipo *Aplicación web* con URI de redirección `https://<url-de-railway>/api/auth/callback/google` (y `http://localhost:3000/api/auth/callback/google` para desarrollo).
3. Entregar a Claude Code `AUTH_GOOGLE_ID` y `AUTH_GOOGLE_SECRET` fuera del repositorio. Claude Code los carga como variables de Railway junto con `AUTH_SECRET` (generado) y `AUTH_URL` si la plataforma lo requiere.

### 5.8 Pruebas (Vitest)

- **Matriz:** para cada rol y cada `Accion`, `puede` coincide con el marco §2.2 (prueba tabulada). El solicitante, sin membresía activa, no obtiene contexto.
- **Servidor:** cada acción de servidor de este componente rechaza con 403 a ayudante, observador y solicitante.
- **Ingreso:** un correo no verificado se rechaza; un correo precargado se vincula al `Usuario` existente sin duplicarlo; mayúsculas en el correo no duplican.
- **Aviso:** sin aviso aceptado, toda ruta protegida redirige a `/bienvenida`; un cambio de `AVISO_PRIVACIDAD_VERSION` vuelve a pedirlo.
- **Membresía:** los estados siguen las transiciones de 5.3 y cualquier otra se rechaza; una sola membresía por usuario y organización; volver a solicitar solo desde `revocada`.
- **Mínimo de administradores:** revocar o bajar de rol al último administrador se rechaza; dos revocaciones cruzadas concurrentes dejan exactamente un administrador (prueba con dos transacciones en paralelo contra la base de prueba).
- **Revocación:** elimina las sesiones; la siguiente solicitud del usuario revocado no obtiene contexto.
- **Comisión:** `/comision` no devuelve correos, invitados sin ingreso, solicitudes ni revocados, para ningún rol.
- **Tope:** al pasar de 5 accesos activos, aprobar, invitar y reactivar piden confirmación y no bloquean.
- **Aislamiento:** un administrador de una organización no puede aprobar, invitar, cambiar ni revocar membresías de otra (se amplía la prueba de Organización y evento §5.5).
- **Supresión:** borra imagen, mensaje y correo, elimina `Account` y `Session`, conserva el nombre y no copia los valores a la auditoría.

---

## 6. Elementos que quedan obsoletos

- **Organización y evento §3.1, "sugerencia: por correo verificado de Google":** queda resuelta por 3.1, paso 3. No hay que cambiar ese documento, porque ya delegaba la definición aquí.
- **Organización y evento §5.2, `exigirRol`:** no queda obsoleta, pero pasa a uso excepcional. La regla general es `exigir(ctx, accion)` (5.4). No cambia el documento dueño.
- **Accesos informales** (planillas o grupos compartidos donde se veían los números del evento): quedan reemplazados por el portal con roles.
- Código: ninguno, revisado: el repositorio solo tiene documentación.

**Precisiones sobre el marco, sin desviación:** "rechazada" e "invitado sin ingreso" se expresan con los tres estados de `Membresia` del marco §5 (ver 5.1), sin estados nuevos. El marco no requiere revisión.

---

## 7. Plan de acción

| # | Paso | Depende de |
|---|---|---|
| 1 | Credenciales OAuth de Google (5.7) | Tarea t-004 |
| 2 | Modelos `Usuario`, `Membresia`, `Account` y `Session`, con las migraciones y el `CHECK` | Esqueleto técnico (marco §12, paso 3) |
| 3 | Adaptador propio y configuración de Auth.js (5.2) con pruebas de ingreso | 1, 2 |
| 4 | `src/lib/permisos.ts` con la matriz y la prueba tabulada (5.4) | 2 |
| 5 | Middleware, `/ingresar`, `/privacidad`, `/bienvenida` y aceptación del aviso | 3 |
| 6 | `/solicitud` y `solicitarAcceso` con `obtenerOrganizacionUnica` | 5, Organización y evento §7 paso 3 |
| 7 | Script de carga inicial de Organización y evento: verificar que los administradores precargados se vinculan al primer ingreso | 3, Organización y evento §7 paso 4 |
| 8 | `/usuarios`: solicitudes, aprobar, rechazar, contador en el menú | 4, 6 |
| 9 | Invitar, cambiar rol, revocar (cierre de sesiones), reactivar, con mínimo de administradores y prueba de concurrencia | 8 |
| 10 | `/mi-cuenta` con cierre de sesión en todos los dispositivos, y `/comision` | 5 |
| 11 | Menú y botones según `permisos` en el resto de la app | 4 |
| 12 | Advertencia de pendientes al revocar o bajar de rol | Movimientos implementado |
| 13 | Suprimir datos de usuario y descargar mis datos | 9, 10 |

Imprescindibles para el 2026-10-04: pasos 1 a 9 y 11. Si el plazo aprieta, el paso 13 pasa a v1.1 sin afectar a otros componentes (no habrá titulares que lo pidan antes del evento). El paso 12 se conecta cuando Movimientos esté implementado.

---

## 8. Riesgos

| Riesgo | Tipo | Mitigación |
|---|---|---|
| Un permiso se aplica solo en la interfaz y no en el servidor | Técnico / normativo | `exigir(ctx, accion)` en cada acción de servidor; la interfaz recibe los permisos del servidor; pruebas por rol (5.8). |
| La organización queda sin administrador | Operativo | Regla del mínimo con bloqueo de filas en transacción y prueba de concurrencia (5.3). |
| Credenciales OAuth atrasadas bloquean todo | Plazo | Tarea t-004 con instrucciones precisas (5.7). En desarrollo se puede probar con un proveedor de prueba solo en local, nunca desplegado. |
| Pantalla de consentimiento en modo *Prueba* impide el ingreso de usuarios no registrados | Operativo | Publicarla en producción (5.7, paso 1); con alcances básicos no hay verificación. |
| Vinculación por correo usada para suplantar | Técnico | Solo correos verificados por Google; `prompt: select_account`; revisión humana de toda solicitud. |
| Sesión vence en la cancha sin señal | Experiencia | Sesión de 30 días renovable; recomendación de entrar el día anterior (3.7). |
| Teléfono perdido con sesión abierta | Normativo | Cierre de sesión en todos los dispositivos y revocación que cierra sesiones (3.1, 3.5). |
| El adaptador propio de Auth.js tiene un error | Técnico | Solo diez métodos, cubiertos por pruebas de ingreso y vinculación; el `PrismaAdapter` oficial sirve de referencia. |
| Invitación a un correo equivocado | Operativo | Se ve como "Invitado, sin ingreso" y se revoca. Quien entra con otra cuenta queda como solicitante (3.3). |
| Aviso de privacidad sin correo de contacto, menos claro para el titular | Normativo | Decisión de Rod. El aviso indica al administrador del evento como canal. Se puede agregar un correo configurable después sin cambiar el modelo. |
| Costo | Costo | Ninguno adicional: Google OAuth es gratuito y todo corre en la misma app y base. |

---

## 9. Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 0.1 | Primer borrador para revisión | Sesión con Rod: alta por solicitud e invitación; aviso de solicitudes solo dentro del portal; los dos administradores con iguales poderes y mínimo de uno activo; quien fue rechazado o revocado puede volver a solicitar; sesión de 30 días renovable; revocación conserva los pendientes con advertencia; aviso de privacidad con texto genérico; mensaje opcional al solicitar |
| 2026-09-27 | 0.2 | Lista de solo lectura **Comisión** para ayudantes y observadores (nombre, imagen y rol, sin correos); la invitación no vence; tope de 5 accesos como aviso que no bloquea; la pantalla de solicitud pendiente no muestra nombres; el motivo del rechazo es interno; el rol al aprobar no viene preseleccionado; se corrige la restricción `CHECK` de la membresía | Segunda ronda de preguntas con Rod |
| 2026-09-27 | 1.0 | Aprobado por Rod sin cambios de contenido | Aprobación |
| 2026-09-27 | 1.1 | §3.8: el aviso declara a Google (API de Gemini de pago) como encargado de tratamiento para la IA de importación y conciliación, con transferencia fuera de Chile. Sube `AVISO_PRIVACIDAD_VERSION`: todos los usuarios vuelven a aceptarlo | Aprobación de Importación desde Excel v1.0 |
| 2026-09-27 | 1.2 | §5.4: acción `registrar_traspaso` (solo administrador) | Aprobación de Dashboard v1.0 (marco v1.5, §2.2) |
| 2026-09-27 | 1.3 | §3.8: el aviso completo agrega los datos del formulario de inscripción; sube `AVISO_PRIVACIDAD_VERSION`. §5.5: el middleware deja pública `/inscribirse/*` | Aprobación de Formulario de inscripción v1.0 |
| 2026-09-27 | 1.4 | §3.6 y §5.5: el menú por rol se presenta según UX/UI §3.3 (grupos, contadores, hamburguesa en el celular y lateral en el computador); se mantiene ocultar lo no permitido | Aprobación de UX/UI v1.0 |
