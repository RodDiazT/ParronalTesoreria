# UX/UI — Sistema de interfaz

Estado: En revisión · Versión 0.1 · Responsable: Rod (Administrador) · Ejecutor: Claude Code

## 1. Índice

- **Padre:** `docs/marco-general/marco-general-proyecto.md`. Alcance dentro del padre: principio 6 "Celular primero" (§7), interfaz Tailwind mobile-first (§8), métricas de registro en menos de un minuto y de validación en menos de 48 h (§3), y la matriz de permisos (§2.2), que la interfaz refleja sin redefinir.
- **Hijos:** ninguno.
- **Depende de:** todos los componentes con pantallas: `docs/acceso/acceso-roles.md`, `docs/organizacion/organizacion-evento.md`, `docs/movimientos/movimientos.md`, `docs/inscripciones/participantes.md`, `docs/inscripciones/inscripcion-binomios.md`, `docs/dashboard/dashboard.md` y, en v1.1, `docs/inscripciones/inscripcion-binomios/formulario-inscripcion.md` e `importacion-excel.md`.
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

Cada componente define **qué** muestra su pantalla y quién la ve. Ninguno define **cómo** se navega entre pantallas, cómo se ve un estado, un monto o una lista, ni qué pasa al guardar. Sin un dueño, Claude Code resolvería cada pantalla por separado y la interfaz terminaría inconsistente y recargada. Este documento es el dueño de:

- la estructura de navegación (encabezado, menú, botón de registro);
- el sistema visual (colores, tipografía, espaciado, modo claro y oscuro);
- los patrones comunes: lista, tarjeta, estado, monto, ficha, formulario, confirmación, avisos y estados vacíos;
- el inicio en su forma visual (qué se ve de entrada y qué va plegado), sobre los contenidos que define el Dashboard;
- la instalación en la pantalla de inicio del teléfono;
- el tono de los textos de la interfaz.

**Principio de diseño:** simple, lógico y sin saturación. Cada pantalla responde **una** pregunta y muestra primero lo que se usa siempre; lo demás se pliega o se va a la ficha. Se diseña para un celular en una mano, al sol y con mala señal (marco §7, principio 6), y el computador usa la misma lógica con más ancho.

**Fase:** v1.0. Claude Code lo aplica desde la primera pantalla. Lo marcado v1.1 se construye con su componente.

**Fuera de alcance:**

- El contenido de cada pantalla (campos, reglas, qué ve cada rol): sigue en el documento de su componente.
- Los cálculos de los indicadores: marco §6.7.
- Registro sin señal (borrador local y cola de envío): su propio documento, v1.1.
- Selector de organización (futuro, Organización y evento §3.6).

### Justificación de valor

a. **Problema que reduce.** El **ayudante** registra en la cancha, con prisa: un solo botón "+" siempre visible con cuatro acciones y formularios que muestran primero lo imprescindible bajan el tiempo y los errores. El **administrador** ve de un vistazo qué le toca revisar (contadores en el menú y una sola lista de avisos) y lee el estado de cada registro por su color y su palabra, sin abrirlo.
b. **Métricas del marco §3.** Tiempo para registrar un gasto con foto < 1 minuto; mediana entre registro y validación < 48 h (contadores siempre visibles); inscripciones con estado de pago conocido el día del evento (estado visible en cada tarjeta).
c. **Datos nuevos.** Ninguno en la base. Solo una preferencia de interfaz en el teléfono (si "Ver detalle" del inicio queda abierto).
d. **Costo de mantención.** Cero en infraestructura. Agrega shadcn/ui (componentes copiados al repositorio, sin servicio externo) y lucide-react (íconos), ambos gratuitos.
e. **¿Existe algo que ya lo resuelva?** No: lo relativo a la interfaz está repartido en siete documentos con decisiones que se pisan (dos entradas de registro, nueve tarjetas en el inicio, estados sin lenguaje común). Este documento las unifica y deja a cada componente solo su contenido.

---

## 3. Flujo operativo y experiencia

### 3.1 Estructura de toda pantalla

```
Celular                              Computador (≥ 1024 px)
┌─────────────────────────┐          ┌──────────┬──────────────────────────┐
│ ☰•3  [logo] Concurso…   │          │ [logo]   │ Movimientos              │
├─────────────────────────┤          │ Concurso │                          │
│ Título de la sección    │          │ 21 nov   │  (contenido, máx. 720 px)│
│                         │          │[+ Regis.]│                          │
│ (contenido, una columna)│          │ Inicio   │                          │
│                         │          │ Movim. • │                          │
│                    (+)  │          │ …        │                          │
└─────────────────────────┘          └──────────┴──────────────────────────┘
```

- **Encabezado** (fijo arriba, 56 px): botón **☰** (con un punto y número si hay algo pendiente para ese usuario, 3.3), logo del club y nombre del evento, cortado con "…" si no cabe. En v1.1 se agrega la **lupa** a la derecha (3.12). El nombre de la organización y las fechas del evento van en la cabecera del menú y en el inicio, no en el encabezado, para no saturarlo (cambio a Organización y evento §3.6; sección 6).
- **Pantallas de detalle** (fichas, formularios, bandeja de validación, pasos de la importación): el encabezado cambia **☰** por **←** y muestra el título de la pantalla. **←** vuelve a la pantalla anterior o, si se entró por un enlace directo, a la lista de la sección.
- **Contenido:** una columna, márgenes laterales de 16 px, ancho máximo de 720 px centrado. Solo la vista previa de la importación y la auditoría pueden usar el ancho completo en el computador, como tabla.
- **Computador (≥ 1024 px):** el menú queda fijo a la izquierda (256 px) con el mismo contenido y orden del menú del celular (3.3) y un botón **+ Registrar** arriba; desaparecen el **☰** y el "+" flotante. Entre 640 y 1023 px se usa el diseño del celular con el contenido centrado.

### 3.2 Botón de registro "+" (administrador y ayudante)

Única entrada para registrar, en todas las pantallas de sección (reemplaza los tres botones del inicio de Dashboard §3.1 y el "+ Registrar" de dos opciones de Movimientos §5.4; sección 6).

- Círculo de 56 px abajo a la derecha, a 16 px de los bordes y sobre la zona segura del teléfono. El contenido deja espacio abajo para que no tape la última tarjeta.
- Al tocarlo abre una **hoja inferior**:

```
┌─────────────────────────────┐
│ ¿Qué quieres registrar?     │
│ ┌────────────┐┌────────────┐│
│ │  ↓ Gasto   ││ ↑ Ingreso  ││
│ └────────────┘└────────────┘│
│ ┌────────────┐┌────────────┐│
│ │ $ Pago de  ││ + Inscribir││
│ │ inscripción││   binomio  ││
│ └────────────┘└────────────┘│
│          Cancelar           │
└─────────────────────────────┘
```

| Botón | Destino |
|---|---|
| Gasto | `/movimientos/nuevo?tipo=gasto` |
| Ingreso | `/movimientos/nuevo?tipo=ingreso` |
| Pago de inscripción | `/inscripciones/pago` |
| Inscribir binomio | `/inscripciones/nueva` |

- Si el "+" se toca desde una ficha de jinete o club, la hoja no cambia: el prellenado por sujeto se hace con los botones **Inscribir** y **Registrar pago** de esa ficha (Inscripción de binomios §3.12).
- **No se muestra** al observador, en los formularios, en la bandeja de validación, en el formulario público ni, con el evento cerrado (v1.1), al ayudante (Dashboard §3.10).
- Traspasos no está en la hoja: es una acción del administrador que vive en la tarjeta de saldo y en `/traspasos` (Dashboard §3.4).

### 3.3 Menú

**Celular:** **☰** abre el menú desde la izquierda (85 % del ancho, se cierra tocando fuera o deslizando). **Computador:** el mismo contenido, fijo a la izquierda.

```
┌───────────────────────────┐
│ [logo] Club (organización)│
│ Concurso · 21 nov 2026    │
│ Rod · Administrador       │
├───────────────────────────┤
│ Inicio                    │
│ Movimientos               │
│ Inscripciones             │
│ Participantes             │
│── Por revisar ────────────│
│ Validar                3  │
│ Inscripciones por form. 2 │  (v1.1)
│── Administración ─────────│
│ Traspasos                 │
│ Contrapartes              │
│ Importar                  │  (v1.1)
│ Usuarios               1  │
│ Configuración             │
│ Auditoría                 │
├───────────────────────────┤
│ Comisión · Mi cuenta      │
│ Salir                     │
└───────────────────────────┘
```

Reglas:

- Cada ítem aparece solo si el rol puede usarlo según `puede(ctx, accion)` (Acceso y roles §5.4). Un grupo sin ítems no se muestra. El ítem de la sección actual va resaltado.
- **Ítems por rol:**

| Grupo | Administrador | Ayudante | Observador |
|---|---|---|---|
| Principal | Inicio, Movimientos, Inscripciones, Participantes | Igual | Igual |
| Por revisar | Validar · N; Inscripciones por formulario · N (v1.1) | Mis observados · N; Inscripciones por formulario · N (v1.1) | — |
| Administración | Traspasos, Contrapartes, Importar (v1.1), Usuarios · N, Configuración, Auditoría; en v1.1 se suman Conciliación y Rendición con sus documentos | Traspasos, Contrapartes | Traspasos, Contrapartes |
| Pie | Comisión, Mi cuenta, Salir | Igual | Igual |

- **Contadores:** Validar = movimientos `por_validar` + ajustes de inscripción por revisar + respaldos nuevos (lo que muestra la bandeja, Movimientos §3.4 e Inscripción de binomios §5.5). Usuarios = solicitudes pendientes. Mis observados = movimientos `observado` enviados por el ayudante (→ `/movimientos?pestana=observados&mios=1`). Inscripciones por formulario = solicitudes `por_revisar` (v1.1). Un contador en 0 no se muestra.
- **Punto en ☰:** la suma de los contadores del usuario. Sin nada pendiente, no hay punto.
- **Configuración** abre `/configuracion`, una lista corta: Evento, Organización, Categorías, Pruebas y conceptos y, en v1.1, Formulario de inscripción. Cada una lleva a su pantalla ya definida.
- Los pendientes de v1.1 (componente Pendientes) se agregan al grupo principal cuando se documenten.

### 3.4 Inicio

Contenidos y reglas del Dashboard §3; aquí se fija **qué se ve de entrada y qué va plegado** (cambia el orden de Dashboard §3.1 y la presentación de §3.2; sección 6).

```
Administrador
┌─────────────────────────────┐
│ ☰•4  [logo] Concurso…       │
├─────────────────────────────┤
│ Club · 21 nov 2026          │
│                             │
│ Por revisar                 │
│ 3 movimientos por validar › │
│ 1 solicitud de acceso     › │
│                             │
│ Saldo de caja   Act. 15:42 ↻│
│ $1.250.000                  │
│ Banco $980.000 · Efectivo $270.000 │
│ Traspasos ›                 │
│ ─────────────────────────── │
│ Por cobrar        $640.000 ›│
│ Por pagar         $120.000 ›│
│ Resultado proy. $1.770.000  │
│                             │
│ Ver detalle ▾               │
│ Copiar resumen              │
│                        (+)  │
└─────────────────────────────┘
```

| Orden | Bloque | Administrador | Ayudante | Observador |
|---|---|---|---|---|
| 1 | **Por revisar**: una fila por aviso de Dashboard §3.5 con número, texto corto y ›; solo los que no están en 0; en el orden de ese documento | Sí | — | — |
| 1 | **Lo mío** (Dashboard §3.6): filas "N por validar · $X", "N observados" (en rojo, con el comentario del administrador en la segunda línea de cada uno), "Te deben $X"; en 0, una línea: "No tienes nada pendiente" | — | Sí | — |
| 2 | **Saldo de caja**: monto grande, debajo Banco y Efectivo (y Otro si no es $0) en una línea, cada uno tocable; enlace **Traspasos**; hora "Act. 15:42" y **↻** | Sí | Sí | Sí |
| 3 | **Tres filas**: Por cobrar, Por pagar y Resultado proyectado | Sí | Sí | Sí |
| 4 | **Ver detalle ▾** (plegado): Ingresos percibidos (con la línea del aporte inicial), Gastos pagados y, en una sub-lista gris "Aparte, no suma a la caja", Por validar, Por asignar y En especie (estos dos se ocultan en $0) | Sí | Sí | Sí |
| 5 | **Copiar resumen** (botón secundario) | Sí | — | Sí |
| 6 | **Más indicadores ▾** (v1.1, plegado, carga diferida) | Sí | Sí | Sí |

- **Por cobrar** y **Por pagar** muestran el total. Al tocarlos se abre una hoja inferior con el desglose de Dashboard §3.2 (Inscripciones y cargos / Otros ingresos; A proveedores / A la comisión), y cada línea lleva a su lista filtrada. **Resultado proyectado** no navega; un ícono **ⓘ** muestra la ayuda "Lo que quedaría si se cobra y se paga todo lo pendiente".
- **Ver detalle** recuerda si quedó abierto en ese teléfono (preferencia local; 4).
- Los montos de los indicadores van en el color normal del texto; solo un negativo va en rojo con signo menos (Dashboard §3.2). El color de ingreso y gasto es para las listas (3.6).
- Sin datos: los montos en $0 y la frase de Dashboard §3.1 ("Todavía no hay movimientos. Registra el primero con el botón +").
- Deslizar hacia abajo o **↻** recalcula (Dashboard §3.8).

### 3.5 Estados: un solo lenguaje

Cuatro tonos con significado. El estado se muestra **siempre con palabra**, nunca solo con color (se lee al sol y por personas que no distinguen colores).

| Tono | Significa | Estados |
|---|---|---|
| **Verde** "listo" | No hay nada que hacer | Validado, Pagado, Recibido, Aceptada |
| **Ámbar** "falta algo" | Espera una acción o un pago | Por validar, Pendiente, Por cobrar, Por pagar, Parcial, Por asignar, Por revisar, Nuevo (respaldo), Sin identificar, "· por validar" |
| **Rojo** "problema" | Alguien debe corregir o actuar | Observado, Falta apoderado, Falta autorización, Menor sin apoderado, Posible duplicado |
| **Gris** "fuera de juego" | No cuenta o no suma | Anulado, Retirado, Becado, Rechazada, En especie, Revocado, Posterior al cierre |

**Chip de estado:** texto corto sobre fondo suave del tono, esquinas redondeadas, 24 px de alto. Las alertas de un jinete (solo administrador y ayudante) se muestran como chips rojos en su ficha y como un punto rojo junto a su nombre en las listas.

**Qué estado muestra cada tarjeta** (uno solo, el más urgente, en este orden):

| Registro | Orden de prioridad | Si todo está bien |
|---|---|---|
| Movimiento | Anulado → Observado → Por validar → Pendiente (Por cobrar / Por pagar) → En especie | Sin chip: la ausencia de chip significa validado y pagado |
| Inscripción, cargo o binomio | Estado de `estadoItem` (Inscripción de binomios §3.5), con "· por validar" en ámbar si corresponde | Chip verde "Pagado": en inscripciones el estado es la información principal, siempre se muestra |
| Solicitud de formulario (v1.1) | Falta apoderado → Por revisar → Aceptada / Rechazada | — |
| Usuario | Solicitud → Revocado | Sin chip (activo) |
| Traspaso | Anulado | Sin chip |

Una única función `estadoVisual` traduce cada estado del dominio a `{ tono, texto }` (5.4). Ninguna pantalla elige colores de estado por su cuenta.

### 3.6 Montos y fechas

- **Formato:** `$1.250.000`, sin decimales (marco §6.1), con cifras de ancho fijo para que se alineen.
- **En listas y fichas de movimientos:** ingreso `+$200.000` en **verde**; gasto `−$45.000` en **rojo** (decisión de Rod). Anulado: gris y tachado. En especie: gris, sin signo de caja.
- **Montos que no son ingreso ni gasto** (saldo de una inscripción, total por cobrar, indicadores del inicio, traspasos): color normal del texto; negativos en rojo con signo menos.
- **Fechas:** en listas, "Hoy", "Ayer" o "12 oct" (se agrega el año solo si no es el actual); en fichas, "12-10-2026" y, si importa la hora, "12-10-2026 15:42". Siempre en America/Santiago (marco §6.1).
- **Al escribir un monto:** teclado numérico, separador de miles mientras se escribe y el símbolo $ fijo a la izquierda.

### 3.7 Listas

```
┌─────────────────────────────┐
│ ☰  [logo] Concurso…         │
├─────────────────────────────┤
│ Movimientos                 │
│ [Todos][Por validar 3][Obs.]→│
│ 🔍 Buscar      [Filtros · 2] │
│ ( Gasto ✕ )( Octubre ✕ )    │
│ Ingresos $2,3 M · Gastos $1,0 M ▾│
├─────────────────────────────┤
│ Pintura vallas     −$45.000 │
│ Hoy · Pista    [Por validar]│
├─────────────────────────────┤
│ Auspicio Ferret.  +$200.000 │
│ 10 oct · Auspicios [Por cobrar]│
├─────────────────────────────┤
│ Venta rifa        +$35.000  │
│ 8 oct · Rifa                │
└─────────────────────────────┘
```

- **Pestañas:** fila de botones que se desliza de lado bajo el título. Llevan número solo las que piden acción (Por validar, Observados, Por asignar, Por revisar). La pestaña activa y los filtros viven en la URL (Dashboard §5.5).
- **Buscar:** campo arriba, en las listas que lo definen (Participantes, Inscripciones, Contrapartes). Filtra mientras se escribe.
- **Filtros:** botón **Filtros** con el número de filtros activos; abre una hoja inferior. Los filtros activos se muestran como chips con ✕ debajo del buscador.
- **Totales de la lista** (Movimientos §3.8, Inscripción de binomios §3.12): **una sola línea** con los dos más importantes; ▾ despliega el resto. En el celular se abrevian los millones ("$2,3 M"); al desplegar se ven completos.
- **Tarjeta de dos líneas:**
  - línea 1: qué es (a la izquierda, cortado con "…") y el monto (a la derecha);
  - línea 2: fecha y un dato de contexto (a la izquierda) y el único estado de 3.5 (a la derecha).
  - Toda la tarjeta es tocable (mínimo 56 px de alto) y abre la ficha. Todo lo demás (contraparte, medio de pago, respaldos, quién registró) está en la ficha.

| Lista | Línea 1 | Línea 2 |
|---|---|---|
| Movimientos | Descripción o, si no hay, contraparte o categoría · monto con signo | Fecha · categoría · estado |
| Binomios | Jinete · caballo (punto rojo si el jinete tiene alertas) · saldo | Club · N pruebas · estado |
| Por cobrar (inscripciones) | Club o jinete · saldo | N ítems · estado |
| Jinetes, caballos, clubes, apoderados, contrapartes | Nombre (punto rojo si hay alertas) | Club o tipo · "Inactivo" en gris si corresponde |
| Traspasos | Banco → Efectivo · monto | Fecha · quién registró · estado |
| Solicitudes del formulario (v1.1) | Jinete · caballo | Recibida hace… · estado |

- **Orden y carga:** del más reciente al más antiguo salvo que el componente diga otro orden; se cargan 50 y el botón **Cargar más** trae los siguientes.
- **Lista vacía:** una frase y, si el rol puede, una acción ("No hay movimientos por validar." / "Todavía no hay jinetes. Crear jinete").
- **Filtro sin resultados:** "Nada coincide con los filtros." y **Quitar filtros**.

### 3.8 Fichas

```
┌─────────────────────────────┐
│ ←  Movimiento           ⋯   │
├─────────────────────────────┤
│ Gasto · Pista               │
│ −$45.000      [Por validar] │
│ Pintura vallas pista 2      │
│                             │
│ [foto] [foto]               │
│                             │
│ Fecha         12-10-2026    │
│ Pagado        12-10-2026    │
│ Medio         Efectivo      │
│ Contraparte   Ferretería X  │
│ Registró      Ana · Hoy 11:20│
│                             │
│ Historial ▾                 │
├─────────────────────────────┤
│ [       Validar           ] │
└─────────────────────────────┘
```

- **Cabecera:** tipo y contexto en texto pequeño, el monto grande con el chip de estado y el título.
- **Avisos del registro** (observación del administrador, sin respaldo con su observación, posible duplicado, alertas del jinete): un recuadro del tono que corresponda, arriba de los datos.
- **Respaldos:** miniaturas de 72 px; al tocar, se abren a pantalla completa con zoom y, si hay varios, se deslizan. El observador ve el texto "2 respaldos" sin miniaturas (marco §2.2).
- **Datos:** lista de pares etiqueta / valor, uno por fila, sin tablas. Solo se muestran los campos con valor.
- **Historial** (línea de tiempo de auditoría): plegado.
- **Acciones:**
  - la acción principal del momento para ese rol va en un botón ancho fijo abajo (por ejemplo Validar en un movimiento por validar para el administrador, Corregir y reenviar en uno observado para quien lo envió, Registrar pago en un binomio con saldo);
  - el resto va en **⋯** arriba a la derecha (Editar, Agregar respaldo, Anular, Copiar estado de cuenta…);
  - sin acciones permitidas, no hay botón ni ⋯.
- Las fichas de jinete, club y binomio muestran el **estado de cuenta** como un bloque con el saldo grande y sus ítems en tarjetas (Inscripción de binomios §3.11).

### 3.9 Formularios

```
┌─────────────────────────────┐
│ ←  Nuevo gasto              │
├─────────────────────────────┤
│ Monto                       │
│ $ [ 45.000               ]  │
│ Categoría                   │
│ [ Pista                ▾ ]  │
│ Respaldo                    │
│ [📷 Tomar foto][Subir archivo]│
│ ☐ Sin respaldo              │
│ ¿Ya se pagó?                │
│ [ Pagado | Pendiente ]      │
│ Medio de pago               │
│ [Transfer.|Efectivo|Otro]   │
│                             │
│ Más datos ▾                 │
├─────────────────────────────┤
│ [        Guardar          ] │
└─────────────────────────────┘
```

- **Una columna**, etiqueta arriba de cada campo, en el orden del documento del componente. Lo obligatorio va primero; lo opcional se pliega en **Más datos ▾** (Movimientos §3.1 ya lo pide; se aplica a todos los formularios). Un campo que se vuelve obligatorio por otra respuesta (observación con Sin respaldo) aparece en su lugar, no en Más datos.
- **Controles:**
  - elecciones de 2 a 4 opciones: botones segmentados, no listas desplegables;
  - listas largas (categoría, contraparte, jinete, caballo, club): selector con búsqueda que en el celular se abre como hoja a pantalla casi completa, con **Crear "…"** al final cuando el componente permite crear en línea;
  - fechas: selector nativo del teléfono, con "Hoy" por defecto donde el componente lo dice;
  - teclados: numérico en montos, teléfono en `type="tel"`, correo en `type="email"`.
- **Guardar:** botón ancho fijo abajo. Al tocarlo se desactiva y muestra "Guardando…" para evitar dos envíos (además de `claveCliente`, Movimientos §3.1).
- **Errores:** debajo del campo, en rojo, con texto que dice qué hacer ("Ingresa un monto mayor a $0"). Al guardar con errores, la pantalla sube al primero.
- **Falla de red al guardar:** recuadro arriba del botón con "No se pudo guardar. Revisa la señal." y **Reintentar**; nada de lo escrito se pierde (Movimientos §3.1).
- **Salir con cambios sin guardar:** **←** pregunta "¿Descartar lo que escribiste?" (Descartar / Seguir editando).
- Texto de entrada de al menos 16 px (evita que el iPhone agrande la pantalla al escribir).

### 3.10 Confirmaciones, mensajes y avisos del sistema

- **Confirmar** solo lo que no se deshace o pide motivo: anular, retirar y devolver, rechazar, revocar, fusionar, desasignar, regenerar el enlace del formulario. Se hace en una **hoja inferior** (diálogo en el computador) que dice qué pasará, con el campo de motivo si corresponde y el botón de la acción en rojo ("Anular movimiento"). Validar, marcar Visto o guardar **no** piden confirmación.
- **Resultado de una acción:** mensaje breve abajo, sobre el "+", por 4 segundos ("Registrado. Queda por validar." con **Registrar otro**; "Validado."; "Copiado."). Los errores del servidor quedan visibles hasta que se cierran.
- **Sin conexión:** franja fija bajo el encabezado, "Sin conexión. Lo que ves puede no estar al día.", mientras el teléfono no tenga red. Desaparece sola al volver.
- **Cambio simultáneo** (marco §6.9): recuadro "Alguien cambió este registro mientras lo editabas." con **Recargar**.
- **Sin permiso (403):** la página de Acceso y roles §5.5, con **Ir al inicio**.
- **Cargando:** los botones muestran su propio indicador; las listas y fichas muestran líneas grises del tamaño de lo que viene, sin animaciones llamativas.

### 3.11 Tono de los textos

- Tuteo, frases cortas, sin jerga técnica ("No se pudo guardar", no "Error 500").
- Botones con verbo de lo que hacen: **Guardar**, **Validar**, **Observar**, **Anular movimiento**, **Registrar pago**. No "Aceptar" ni "OK" cuando se puede decir la acción.
- Los nombres de las cosas son los del marco §5 ("movimiento", "binomio", "inscripción"), nunca sinónimos. Hacia el usuario, sin términos del código ("por validar", no `por_validar`).
- Los nombres del club y del evento siempre salen de los datos (marco §7, principio 5).
- El título de la pestaña del navegador es "Sección · Tesorería" y nunca incluye nombres de personas (4).

### 3.12 Buscador general (v1.1)

Lupa en el encabezado para administrador y ayudante (el observador, en v1.1, busca solo lo que puede ver en los listados). Abre una pantalla con un campo y resultados agrupados: **Jinetes**, **Caballos**, **Clubes** y **Contrapartes**, hasta 5 por grupo. Al tocar un resultado, abre su ficha (la de jinete y club, con el estado de cuenta). Responde en la cancha la pregunta "¿pagó fulano?" en dos toques. Busca en las listas activas del evento con la misma normalización de nombres de `buscarParecidos` (Participantes §5.2). En v1.0, cada lista tiene su propio buscador (ya definido en cada componente).

### 3.13 Modo claro y oscuro

- La interfaz sigue el ajuste del teléfono o del computador (decisión de Rod). No hay selector en el portal.
- Los colores se definen una sola vez como variables para los dos modos (5.2). Ningún componente usa un color escrito a mano.
- El logo del club se muestra sobre un fondo claro redondeado en los dos modos, para que un logo con fondo o letras oscuras se lea.
- En modo oscuro se mantienen los cuatro tonos de estado con variantes de igual contraste.

### 3.14 Instalable en el teléfono

- El portal se puede **agregar a la pantalla de inicio** (Android: "Instalar app"; iPhone: Compartir → "Agregar a inicio"). Se abre a pantalla completa, sin la barra del navegador, con nombre **"Tesorería"** e ícono genérico del portal.
- El ícono y el nombre son genéricos y no los del club: el manifiesto lo lee el teléfono sin sesión, y los datos del club no son públicos (marco §9.4 y principio 5). Dentro del portal, el encabezado ya muestra el logo del club.
- No incluye funcionamiento sin conexión: eso es Registro sin señal (v1.1), que agregará lo necesario sobre esta base.
- **Recortable:** si falta tiempo para el 2026-10-04, pasa a v1.1 sin afectar nada más (decisión de Rod).
- Mi cuenta muestra, una vez por teléfono y solo si no está instalado, la ayuda "Agrega el portal a tu pantalla de inicio" con los pasos de Android o iPhone según el teléfono.

### 3.15 Formulario público de inscripción (v1.1)

Usa el mismo sistema visual y los patrones de formulario de 3.9, sin menú, sin "+" y sin lupa. Encabezado con logo del club y nombre del evento (Formulario de inscripción §5.9). Mismo modo claro u oscuro según el teléfono de quien lo llena.

### 3.16 Accesibilidad

- Contraste mínimo 4,5 : 1 en todo texto y 7 : 1 en montos y texto principal (uso a pleno sol).
- Objetivos táctiles de al menos 44 × 44 px; botones principales de 48 px de alto.
- Tamaños en `rem`: el portal respeta el tamaño de letra que la persona eligió en su teléfono.
- Foco visible al navegar con teclado en el computador; cada campo con su etiqueta; íconos solos (☰, +, ←, ⋯, ↻, lupa) con nombre accesible.
- Estados siempre con palabra (3.5). Sin animaciones si el teléfono pide reducir el movimiento.

### 3.17 Casos borde revisados

| Caso | Decisión |
|---|---|
| Nombre de evento largo | Se corta con "…" en el encabezado; completo en el menú y en el inicio. |
| Organización sin logo (t-010 pendiente) | Se muestra la inicial del club en un círculo gris; ningún espacio vacío. |
| Observador toca un indicador | Abre la lista; lo que no puede ver ya viene quitado del servidor (Dashboard §3.2). |
| Ayudante con el evento cerrado (v1.1) | Sin "+"; el menú no cambia. |
| Varias cosas pendientes para el administrador | El inicio las muestra como filas en "Por revisar", no como franjas apiladas, y el ☰ suma los contadores. |
| Pantalla muy angosta (320 px) | Las tarjetas cortan el texto de la izquierda; el monto y el estado nunca se cortan. Los totales abrevian millones. |
| Monto de 9 cifras en una tarjeta | Se muestra completo; el texto de la izquierda cede espacio. |
| Selector con 200 jinetes | Hoja con búsqueda; la lista se filtra en el teléfono (Inscripción de binomios §3.14). |
| Teléfono con letra grande del sistema | Las tarjetas crecen en alto; nada se superpone; los botones fijos siguen visibles. |
| Toque doble en Guardar con mala señal | El botón se desactiva al primer toque y `claveCliente` impide duplicar. |
| El "+" tapa la última tarjeta | El contenido tiene espacio inferior igual al alto del botón más 16 px. |
| Computador de 1024 a 1280 px con importación | La vista previa usa el ancho completo como tabla; el resto sigue en 720 px. |
| Logo oscuro en modo oscuro | Fondo claro redondeado detrás del logo (3.13). |
| Persona que no distingue rojo y verde | Montos con signo + / −, y estados con palabra. |

---

## 4. Cumplimiento normativo

Aplica de forma indirecta: la interfaz muestra datos personales (incluidos de menores y datos de terceros en respaldos), pero no crea ni guarda datos nuevos. Lo transversal está en el marco §9; la vigencia de la Ley 21.719 se reverificó el 2026-09-27: sigue fijada para el **2026-12-01** y el proyecto de prórroga (Boletín 18.623-07) sigue en primer trámite en el Senado, sin aprobar. Lo específico de este componente:

- **Lo oculto no viaja.** La interfaz nunca recibe datos que el rol no puede ver para "esconderlos" en el teléfono: el servidor los quita antes (Acceso y roles §3.6, Movimientos §3.8). Ningún componente visual recibe la entidad completa si va a mostrar una parte.
- **Nada personal en el teléfono.** El almacenamiento local guarda solo preferencias de interfaz (3.4 "Ver detalle" y el aviso de instalación de 3.14). En v1.0 no hay caché sin conexión de páginas con datos (3.14). El borrador sin señal de v1.1 lo regula su propio documento.
- **Títulos sin nombres.** El título de la pestaña del navegador no lleva nombres de jinetes, apoderados ni contrapartes, porque queda en el historial y en las apps recientes del teléfono (3.11).
- **Manifiesto sin datos del club.** Nombre e ícono genéricos, porque se sirve sin sesión (3.14).
- **Respaldos a pantalla completa** se sirven por la ruta protegida de Movimientos §5.5; el visor no los descarga a la galería del teléfono por su cuenta.

---

## 5. Especificación de ejecución

### 5.1 Stack (se agrega al marco §8)

| Pieza | Decisión | Justificación |
|---|---|---|
| Componentes base | **shadcn/ui** sobre Tailwind, copiados a `src/components/ui/` | Hoja inferior, diálogo, selector con búsqueda y menú accesibles sin construirlos a mano; el código queda en el repositorio, sin servicio ni costo. |
| Íconos | **lucide-react** (el de shadcn/ui) | Un solo set, liviano e importado por ícono. |
| Mensajes breves | `sonner` (el de shadcn/ui) | Mensajes de resultado de 3.10. |
| Tipografía | Fuente del sistema (`system-ui`) con cifras de ancho fijo (`tabular-nums`) | No descarga nada: más rápido con mala señal. |
| Modo oscuro | Variables CSS con `@media (prefers-color-scheme: dark)` | Sigue al sistema sin librería ni selector. |
| Instalable | `src/app/manifest.ts` e íconos en `public/iconos/` | Nativo de Next.js, sin service worker en v1.0. |

No se agregan librerías de gráficos (los de v1.1 son SVG propio, Dashboard §5.4), de animación ni de fuentes externas.

Componentes de shadcn/ui a instalar: `button`, `sheet`, `dialog`, `drawer` (hoja inferior en el celular), `command` y `popover` (selector con búsqueda), `input`, `label`, `textarea`, `checkbox`, `toggle-group` (botones segmentados), `collapsible` (Más datos, Ver detalle, Historial), `dropdown-menu` (⋯), `separator`, `skeleton`, `avatar` (Comisión) y `sonner`. Se quitan de cada uno los estilos que no usen los colores de 5.2.

### 5.2 Colores (variables en `src/app/globals.css`)

| Variable | Claro | Oscuro | Uso |
|---|---|---|---|
| `--fondo` | `#FFFFFF` | `#0C0A09` | Fondo de página |
| `--superficie` | `#F5F5F4` | `#1C1917` | Tarjetas destacadas, hojas, menú |
| `--borde` | `#E7E5E4` | `#292524` | Separadores y bordes |
| `--texto` | `#1C1917` | `#F5F5F4` | Texto principal y montos neutros |
| `--texto-suave` | `#57534E` | `#A8A29E` | Segunda línea de tarjetas, etiquetas |
| `--acento` | `#1F4D3A` | `#2F6B52` | Botón principal, "+", ítem activo del menú, foco |
| `--sobre-acento` | `#FFFFFF` | `#FFFFFF` | Texto sobre el acento |
| `--ingreso` | `#15803D` | `#4ADE80` | Montos de ingreso |
| `--gasto` | `#B91C1C` | `#F87171` | Montos de gasto y negativos |
| `--listo-fondo` / `--listo-texto` | `#DCFCE7` / `#14532D` | `#14532D` / `#DCFCE7` | Tono verde de estado |
| `--falta-fondo` / `--falta-texto` | `#FEF3C7` / `#78350F` | `#78350F` / `#FEF3C7` | Tono ámbar |
| `--problema-fondo` / `--problema-texto` | `#FEE2E2` / `#7F1D1D` | `#7F1D1D` / `#FEE2E2` | Tono rojo |
| `--fuera-fondo` / `--fuera-texto` | `#E7E5E4` / `#44403C` | `#44403C` / `#E7E5E4` | Tono gris |

- El acento es un verde bosque oscuro y apagado, distinto del verde de ingreso, que es más claro y saturado y solo va en texto. Si en la prueba con los ayudantes se confunden, se cambia `--acento` en un solo lugar (8).
- Tailwind expone estas variables como colores (`bg-superficie`, `text-ingreso`, etc.). Una regla de ESLint o una revisión en la prueba verifica que no haya colores de la paleta de Tailwind escritos directamente en los componentes (`text-red-600`, etc.).

### 5.3 Tipografía y espaciado

| Elemento | Tamaño | Peso |
|---|---|---|
| Monto destacado (saldo, cabecera de ficha) | 2 rem (32 px) | 700 |
| Título de pantalla | 1,25 rem (20 px) | 600 |
| Texto, campos y línea 1 de tarjeta | 1 rem (16 px) | 400 / 500 |
| Línea 2 de tarjeta, etiquetas, chips | 0,875 rem (14 px) | 400 / 500 |

- Espaciado en múltiplos de 4 px; margen lateral de 16 px; 12 px entre tarjetas o filas; 24 px entre bloques.
- Radio: 12 px en tarjetas, hojas y botones; chips totalmente redondeados.
- Sombras: ninguna salvo la hoja inferior y el "+". Las tarjetas de lista se separan con una línea de `--borde`, no con cajas.

### 5.4 Componentes propios (`src/components/app/`)

| Componente | Función |
|---|---|
| `<Estructura>` | Encabezado, menú (hoja o lateral según el ancho), "+", franja sin conexión y espacio inferior. Lo usan todas las pantallas internas. |
| `<Encabezado modo="seccion"\|"detalle" titulo>` | ☰ con punto o ← con título; logo y evento; lupa (v1.1). |
| `<MenuPrincipal>` | Contenido de 3.3, armado con `itemsMenu(ctx)`. |
| `<BotonRegistrar>` y `<HojaRegistrar>` | 3.2. |
| `<Estado valor>` | Chip de 3.5; usa `estadoVisual`. |
| `<Monto valor tipo>` | Formato y color de 3.6 (`tipo`: `ingreso`, `gasto`, `neutro`; anulado y especie como variantes). |
| `<Fecha valor formato="corta"\|"larga">` | 3.6. |
| `<PestanasLista>` | Pestañas con contador, sincronizadas con la URL (Dashboard §5.5). |
| `<BarraBusquedaFiltros>` y `<HojaFiltros>` | Buscador, botón Filtros, chips con ✕. |
| `<LineaTotales>` | Totales en una línea con ▾ (3.7). |
| `<TarjetaLista titulo monto contexto estado href alerta>` | Tarjeta de dos líneas (3.7). |
| `<ListaVacia>` | Frase y acción opcional. |
| `<CabeceraFicha>`, `<DatosFicha>`, `<RespaldosFicha>`, `<Historial>` | 3.8. |
| `<AccionPrincipal>` y `<MenuAcciones>` | Botón fijo abajo y ⋯ (3.8). |
| `<Formulario>`, `<Campo>`, `<MasDatos>`, `<CampoMonto>`, `<Segmentado>`, `<SelectorConBusqueda>` | 3.9. Los selectores de dominio (`<SelectorCategoria>`, `<SelectorContraparte>`, `<SelectorJinete>`, etc.) se construyen sobre `<SelectorConBusqueda>`. |
| `<HojaConfirmar titulo descripcion accion peligrosa pideMotivo>` | 3.10. |
| `<AvisoRecuadro tono>` | Recuadros de avisos, errores de red y cambio simultáneo. |
| `<FranjaSinConexion>` | 3.10, con los eventos `online` y `offline` del navegador. |

### 5.5 Funciones de presentación (`src/lib/presentacion/`, con pruebas)

- `estadoVisual(entidad, estado): { tono: "listo" | "falta" | "problema" | "fuera", texto }`: tabla única de 3.5. Una prueba recorre todos los valores de los enums de estado del esquema de Prisma y falla si alguno no tiene traducción.
- `estadoPrincipal(registro)`: el estado de mayor prioridad para la tarjeta, según el orden de 3.5 (o `null` si no lleva chip).
- `formatearMonto(clp, { signo, abreviar })`: `$1.250.000`, `+$200.000`, `−$45.000` (signo menos tipográfico), `$2,3 M`.
- `formatearFecha(instante, "corta" | "larga" | "larga-hora")`: en America/Santiago; "Hoy" y "Ayer" según la fecha local.
- `itemsMenu(ctx)`: ítems y grupos de 3.3 filtrados con `puede(ctx, accion)`, con sus contadores.
- `contadoresUsuario(ctx)`: reutiliza `avisosAdministrador` y `loMio` de Dashboard §5.2 (no crea consultas nuevas). Se calcula en el servidor en cada carga del layout, sin caché (5 usuarios; marco §7, principio 7).

### 5.6 Layout y rutas

- `src/app/(portal)/layout.tsx`: `<Estructura>` para todas las rutas con membresía activa. Las rutas de detalle pasan `modo="detalle"`.
- `src/app/(publico)/layout.tsx`: sin menú ni "+" para `/ingresar`, `/privacidad`, `/bienvenida`, `/solicitud` y, en v1.1, `/inscribirse/[token]`. Pantallas centradas, con el logo solo donde el componente dueño lo permite (el formulario público sí; `/ingresar` no muestra datos del club).
- `/configuracion`: nueva página índice con la lista de 3.3; las subpáginas ya existen en sus componentes.
- `<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">` y márgenes con `env(safe-area-inset-*)`.
- `<meta name="theme-color">` con `--fondo` para cada modo.

### 5.7 Manifiesto e íconos

- `src/app/manifest.ts`: `name` y `short_name` "Tesorería", `display: "standalone"`, `start_url: "/"`, `background_color` y `theme_color` de `--fondo` claro, íconos 192 y 512 px, y uno `maskable`.
- `public/iconos/`: ícono genérico del portal (un símbolo simple, sin nombre ni logo del club), `apple-touch-icon` de 180 px.
- Metadatos para iPhone en el layout raíz: `appleWebApp: { capable: true, title: "Tesorería", statusBarStyle: "default" }`.
- Sin service worker en v1.0.

### 5.8 Pruebas

- Vitest: `estadoVisual` cubre todos los estados; `estadoPrincipal` respeta el orden de 3.5; `formatearMonto` y `formatearFecha` (incluido cambio de día en America/Santiago y "Hoy" / "Ayer"); `itemsMenu` por rol (el observador no recibe Validar, Usuarios, Configuración ni Auditoría; el ayudante no recibe Usuarios ni Configuración).
- Revisión manual antes del 2026-10-04 (paso 11 del marco §12), con los ayudantes y en sus teléfonos: registrar un gasto con foto en menos de un minuto; encontrar un binomio y ver si pagó; lectura al sol; modo oscuro; letra grande del sistema; pantalla de 320 px; menú lateral en un computador.

---

## 6. Elementos que quedan obsoletos y cambios a otros documentos

Al aprobarse este documento se actualizan, en el mismo commit, los documentos dueños:

| Documento | Cambio |
|---|---|
| Marco general (→ v1.7) | §8: se agregan shadcn/ui, lucide-react, fuente del sistema, modo claro y oscuro según el sistema e instalable sin service worker. §10.1: nueva carpeta de dominio `interfaz/` ("Navegación, sistema visual y patrones comunes de pantalla"). §10.2: `src/components/ui/`, `src/components/app/` y `src/lib/presentacion/`. §11: se agrega UX/UI como hijo de primer nivel. |
| Dashboard (→ v1.2) | §3.1: se elimina el bloque 1 (botones Gasto, Ingreso y Pago de inscripción), reemplazado por el "+" de UX/UI §3.2; el orden y lo plegado del inicio pasan a UX/UI §3.4. §3.2: Ingresos percibidos, Gastos pagados y las tarjetas "aparte" van en "Ver detalle"; el desglose de Por cobrar y Por pagar se abre en una hoja. §3.5: los avisos se muestran como filas de un bloque "Por revisar", no como franjas. §5.4: se elimina la referencia al "+ Registrar" de Movimientos. |
| Movimientos (→ v1.4) | §3.1 y §5.4: el botón fijo "+ Registrar" con Gasto e Ingreso pasa a ser el "+" de UX/UI §3.2 con cuatro acciones. §3.8: la tarjeta del listado pasa a dos líneas con un solo estado (UX/UI §3.7); los totales, a una línea desplegable. §5.4: "Menú e inicio" remite al contador de UX/UI §3.3. |
| Acceso y roles (→ v1.4) | §3.6 y §5.5: el menú por rol se define en UX/UI §3.3 (grupos, contadores y menú lateral en el computador); se mantiene la regla de ocultar lo no permitido. |
| Organización y evento (→ v1.3) | §3.6 y §5.4: el encabezado muestra logo y nombre del evento; el nombre de la organización y las fechas del evento pasan a la cabecera del menú y al inicio (UX/UI §3.1). |
| Inscripción de binomios (→ v1.4) | §3.12: la pestaña Binomios se muestra como tarjeta de dos líneas (jinete · caballo · saldo / club · pruebas · estado); total y pagado quedan en la ficha. |

Queda obsoleto: los tres botones del inicio, el "+ Registrar" de dos opciones, las tarjetas de lista con todos los datos y chips, y las franjas de aviso apiladas. No hay código implementado que reemplazar.

Sin cambios: Participantes, Importación desde Excel y Formulario de inscripción (sus pantallas ya remiten a "celular primero" y a tarjetas, y quedan cubiertas por los patrones de este documento).

---

## 7. Plan de acción

| # | Paso | Depende de |
|---|---|---|
| 1 | Instalar shadcn/ui, lucide-react y sonner; definir las variables de color de 5.2 para ambos modos y exponerlas en Tailwind | Esqueleto técnico (marco §12, paso 3) |
| 2 | Funciones de presentación de 5.5 con sus pruebas | 1 |
| 3 | `<Estructura>`, `<Encabezado>`, `<MenuPrincipal>` (hoja y lateral), `<BotonRegistrar>` y `<HojaRegistrar>`; página `/configuracion` | 2 y Acceso y roles (`puede`) |
| 4 | Patrones de lista, ficha, formulario y confirmación (5.4) | 1, 2 |
| 5 | Inicio con la forma de 3.4 sobre las funciones de Dashboard | 3, 4 y Dashboard |
| 6 | Cada pantalla de componente se construye con los patrones de 4 a medida que se implementa | 4 |
| 7 | Manifiesto e íconos (5.7) y ayuda de instalación en Mi cuenta. **Recortable a v1.1** | 3 |
| 8 | Revisión manual de 5.8 con los ayudantes | 5, 6 (y 7 si se hizo) |
| 9 | v1.1: lupa y buscador general (3.12); formulario público con estos patrones (3.15) | 8 y sus componentes |

---

## 8. Riesgos

| Riesgo | Tipo | Mitigación |
|---|---|---|
| El menú hamburguesa esconde secciones y queda lejos del pulgar | Experiencia | Lo frecuente (registrar) está en el "+" abajo; lo pendiente se ve en el inicio y en el punto del ☰. Si en la prueba los ayudantes no encuentran las secciones, se evalúa una barra inferior sin cambiar los patrones. |
| Verde de ingreso y verde del acento se confunden; rojo de gasto compite con el rojo de "problema" | Experiencia | Acento oscuro y apagado solo en botones; montos con signo; estados con palabra y fondo de color, los montos solo en texto. Se revisa en la prueba; ajustar es cambiar una variable (5.2). |
| El modo oscuro duplica la revisión visual antes del 2026-10-04 | Operativo | Variables únicas desde el paso 1: ningún componente elige colores. La revisión de ambos modos entra en la prueba de 5.8. |
| shadcn/ui agrega peso o estilos ajenos | Técnico | Solo los componentes listados; se quitan estilos que no usen las variables; sin fuentes ni librerías de animación. |
| El inicio plegado oculta algo importante | Experiencia | Lo que exige acción está siempre visible (Por revisar, Lo mío); "Ver detalle" recuerda si quedó abierto. |
| Contadores del menú en cada página suman consultas | Técnico | Reutilizan las funciones del Dashboard; 5 usuarios (marco §7, principio 7). |
| Instalable en iPhone con comportamiento distinto (sesión, barra de estado) | Técnico | Se prueba en un iPhone; es recortable a v1.1 sin afectar el resto. |
| Datos del club o personas expuestos por el manifiesto, títulos o almacenamiento local | Normativo | Manifiesto genérico, títulos sin nombres, almacenamiento local solo con preferencias (4). |
| Costo | Costo | Cero: todo es código en el repositorio. |

---

## 9. Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 0.1 | Primer borrador: navegación con menú hamburguesa (lateral en el computador) y un "+" con cuatro acciones; inicio con saldo y tres cifras, el resto plegado; cuatro tonos de estado con palabra; tarjetas de dos líneas; ingresos en verde y gastos en rojo; modo claro y oscuro según el sistema; shadcn/ui; instalable (recortable a v1.1); buscador general en v1.1 | Decisiones de Rod en la sesión |
