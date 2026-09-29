# Mejoras 1: Especificación Técnica de UX, Configuración, Inscripciones y Perfil

**Fecha:** 28 de Septiembre de 2026  
**Estado:** Aprobado para desarrollo (v1.2)  
**Sistema:** Tesorería Club Parronal — Gestión de Concursos Ecuestres  
**Destinatario:** Desarrollador / Agente de Implementación  

---

## 1. Resumen Ejecutivo y Objetivos

Este documento formaliza las definiciones de negocio, arquitectura de datos, lógica del dominio y diseño de experiencia de usuario (UX/UI) para implementar cinco (5) mejoras fundamentales en el sistema de Tesorería:

1. **Eliminación y Reasignación de Pruebas (`/configuracion/pruebas`):** Permitir la eliminación de pruebas configuradas. Si la prueba tiene inscripciones registradas, se exige reasignarlas atómicamente a otra prueba del evento, validando que ningún binomio quede duplicado. Restringido a administradores.
2. **Retiro de "Conceptos de Cobro" y Centralización en Ingresos:** Eliminar la pestaña y entidad "Conceptos de cobro" (y cargos en ficha de binomio). Todos los cobros adicionales (pensiones, boxes, pesebreras, auspicios, etc.) se centralizan como **Movimientos de Ingreso** en Tesorería, asociados a su respectiva Categoría y vinculados opcionalmente a un Binomio, Caballo, Jinete o Club.
3. **Inscripción Rápida Integrada de Jinete, Caballo y Club (`/inscripciones/nueva`):** Habilitar la creación inmediata in-situ de Club, Caballo y Jinete mediante hojas emergentes (Sheets/Modales) dentro del formulario de inscripción, permitiendo creación encadenada (crear club desde jinete/caballo) sin perder datos ni abandonar el formulario.
4. **Edición de Perfil de Usuario (`/mi-cuenta`):** Permitir a los usuarios con membresía aprobada actualizar su nombre completo para mostrar y registrar opcionalmente su número de teléfono de contacto.
5. **Eliminación y Reasignación de Categorías (`/configuracion/categorias`):** Permitir a administradores eliminar categorías no protegidas. Si tienen movimientos históricos de dinero asociados, se exige seleccionar una categoría sustituta del mismo tipo para reasignar los movimientos de forma atómica antes de eliminar la categoría.
6. **Renombrado en Navegación Lateral a "Directorio" (`/participantes`):** Actualizar el rótulo en el menú principal lateral de "Participantes" a "Directorio" para representar con mayor precisión el acceso al directorio maestro de Jinetes, Caballos y Clubes.

---

## 2. Cambios en el Modelo de Datos (Prisma Schema)

### 2.1. Modelo `Usuario`
Se agrega el campo opcional `telefono` para registrar el contacto del usuario de la aplicación:

```prisma
model Usuario {
  id                          String             @id @default(cuid())
  correo                      String             @unique
  nombre                      String?
  telefono                    String?            // <-- NUEVO: Teléfono de contacto opcional
  imagen                      String?
  // ... resto de campos existentes
}
```

### 2.2. Modelo `Movimiento`
Para soportar la trazabilidad de ingresos asociados a conceptos operativos (pesebreras, pensiones, boxes, etc.), se añaden claves foráneas opcionales hacia `Binomio`, `Jinete`, `Caballo` y `Club`:

```prisma
model Movimiento {
  // ... campos existentes (id, montos, categoriaId, etc.)

  // NUEVOS: Vínculos opcionales para imputación operativa de ingresos
  binomioId             String?              @map("binomio_id")
  jineteId              String?              @map("jinete_id")
  caballoId             String?              @map("caballo_id")
  clubId                String?              @map("club_id")

  binomio               Binomio?             @relation(fields: [binomioId], references: [id])
  jinete                Jinete?              @relation(fields: [jineteId], references: [id])
  caballo               Caballo?             @relation(fields: [caballoId], references: [id])
  club                  Club?                @relation(fields: [clubId], references: [id])

  // Índices para consultas de balances y reportes operativos
  @@index([organizacionId, caballoId])
  @@index([organizacionId, jineteId])
  @@index([organizacionId, clubId])
  @@index([organizacionId, binomioId])
}
```

### 2.3. Deprecación y Limpieza de `Concepto` y `Cargo`
Dado que el proyecto se encuentra en fase de pruebas activas y no existen datos productivos:
* Se eliminan los modelos `Concepto` y `Cargo`.
* Se eliminan las relaciones `cargos` y `conceptos` de `Organizacion`, `Evento`, `Usuario`, `Binomio`, `Jinete`, `Club`, `Pago` y `Devolucion`.
* En `Pago` y `Devolucion`, la relación se simplifica exclusivamente a `inscripcionId` y `movimientoId`.

---

## 3. Lógica de Dominio y Reglas de Negocio

### 3.1. Eliminación y Reasignación de Pruebas
**Ubicación:** `src/dominio/inscripciones/binomios/acciones.ts`  
**Función:** `eliminarPrueba(id: string, reasignarAId?: string)`

#### Reglas de Validación:
1. **Permisos y Estado:** Exige rol `administrador` (`exigir(ctx, "administrador")`). El evento debe estar en estado `abierto`.
2. **Existencia:** La prueba debe existir y pertenecer a la organización y evento actual.
3. **Caso A (0 inscripciones asociadas):**
   * Se elimina el registro de `Prueba` directamente.
   * Se registra la acción en `RegistroAuditoria` con `accion: "eliminar"`.
4. **Caso B (>0 inscripciones asociadas):**
   * Es mandatorio proporcionar `reasignarAId`. Si no se envía, la acción retorna error: `"La prueba tiene X inscripciones. Debes seleccionar una prueba de destino para reasignarlas."`
   * La prueba de destino debe existir, pertenecer al mismo evento y ser distinta a la prueba a eliminar (`reasignarAId !== id`).
   * **Regla Antiduplicidad:** Un binomio no puede saltar dos veces en la misma prueba. La acción consulta si alguno de los binomios inscritos en la prueba a eliminar ya cuenta con una inscripción activa en la prueba de destino:
     ```ts
     const binomiosOrigen = inscripcionesOrigen.map(i => i.binomioId);
     const duplicados = await db.inscripcion.findMany({
       where: {
         pruebaId: reasignarAId,
         binomioId: { in: binomiosOrigen },
         anulado: false,
       },
       include: { binomio: { include: { jinete: true, caballo: true } } }
     });
     if (duplicados.length > 0) {
       return {
         exito: false,
         error: `No se puede reasignar: los siguientes binomios ya están inscritos en la prueba de destino: ${nombresDuplicados.join(", ")}.`
       };
     }
     ```
   * **Tratamiento de Inscripciones Retiradas/Anuladas e Integridad Referencial:**
     Las inscripciones en estado retirado o anulado (`anulado: true`, `retirado: true`) preservan la trazabilidad de pagos (`Pago`), devoluciones (`Devolucion`) y movimientos en Tesorería. En PostgreSQL, la relación `Inscripcion.pruebaId` opera bajo restricción `RESTRICT`. Por lo tanto:
     - Una prueba se considera de **Caso A (eliminación directa)** únicamente cuando cuenta con **0 registros totales en `Inscripcion`** (tanto activas como anuladas/retiradas).
     - Si la prueba cuenta con inscripciones históricas retiradas (incluso si tiene 0 activas), clasifica como **Caso B (reasignación requerida)** para transferir dichos registros históricos a una prueba de destino antes de ejecutar el borrado de la entidad `Prueba`.
     - La **Regla Antiduplicidad** solo evalúa colisiones entre binomios de inscripciones **activas** (`anulado: false`), permitiendo reasignar inscripciones retiradas sin falsos positivos de duplicidad.
   * **Transacción Atómica:**
     ```ts
     await db.$transaction([
       // 1. Reasignar todas las inscripciones (activas e históricas) a la nueva prueba
       db.inscripcion.updateMany({
         where: { pruebaId: id },
         data: { pruebaId: reasignarAId }
       }),
       // 2. Eliminar la prueba original
       db.prueba.delete({ where: { id } }),
       // 3. Registrar auditoría
       db.registroAuditoria.create({ ... })
     ]);
     ```

---

### 3.2. Centralización de Ingresos Operativos (Pesebreras, Pensiones, etc.)
**Ubicación:** `src/dominio/movimientos/acciones.ts`

#### Reglas de Validación:
1. Al registrar un movimiento de tipo `ingreso`, los campos `binomioId`, `jineteId`, `caballoId` y `clubId` son **opcionales**.
2. Si se especifica `caballoId`, permite emitir reportes de control de boxes (ej. listar todos los ingresos cuya categoría sea "Pesebreras" o "Pensión" filtrados por caballo).
3. Se retira de la lógica de inscripción de binomios la creación automática de cargos fijos (`cuotasBinomio`).

---

### 3.3. Creación Rápida de Participantes en Inscripción
**Ubicación:** Reutilización de acciones existentes en `src/dominio/inscripciones/participantes/acciones.ts`:
* `ejecutarCrearClub(ctx, datos: ClubInput)`
* `ejecutarCrearCaballo(ctx, datos: CaballoInput)`
* `ejecutarCrearJinete(ctx, datos: JineteInput)`

#### Comportamiento:
* Las acciones retornan la entidad recién creada (`id`, `nombre`, `clubId`, etc.).
* La interfaz cliente recibe el objeto, lo añade al listado en memoria y lo preselecciona en el formulario principal sin recargar la página (`router.refresh()` en segundo plano).

---

### 3.4. Edición de Perfil de Usuario
**Ubicación:** `src/dominio/acceso/acciones.ts`  
**Función:** `actualizarMiPerfil(datos: { nombre: string; telefono?: string })`

#### Reglas de Validación:
1. **Autenticación:** Requiere sesión activa (`session.user.id`).
2. **Membresía:** El usuario debe tener al menos una membresía en estado `activa` (aprobada por un administrador). Si está en estado `solicitada` o `revocada`, se rechaza con error 403.
3. **Formato:**
   * `nombre`: String recortado, mínimo 2 caracteres, máximo 120 caracteres. Obligatorio.
   * `telefono`: String recortado opcional, máximo 30 caracteres.
4. **Persistencia y Revalidación:** Se actualiza el registro en `Usuario` y se ejecutan `revalidatePath("/mi-cuenta")` y `revalidatePath("/", "layout")` para que el nombre se refleje instantáneamente en el encabezado y menú lateral.

---

### 3.5. Eliminación y Reasignación de Categorías
**Ubicación:** `src/dominio/organizacion/categorias.ts`  
**Función:** `eliminarCategoria(id: string, reasignarAId?: string)`

#### Reglas de Validación:
1. **Permisos:** Exclusivo para administradores (`exigir(ctx, "administrador")`).
2. **Protección de Sistema:** Si `categoria.claveSistema !== null`, se bloquea la eliminación: `"Las categorías del sistema están protegidas y no pueden ser eliminadas."`
3. **Caso A (0 movimientos registrados):**
   * Se elimina la categoría directamente de la base de datos.
   * Se registra en auditoría.
4. **Caso B (>0 movimientos registrados):**
   * Si no se especifica `reasignarAId`, se rechaza indicando: `"La categoría tiene X movimientos asociados. Debes seleccionar una categoría de destino para reasignarlos."`
   * La categoría de destino debe:
     - Existir y pertenecer a la misma organización.
     - Ser del mismo tipo (`ingreso` si la eliminada es de ingreso; `gasto` si es de gasto).
     - Estar activa (`activa: true`).
     - Ser distinta a la categoría a eliminar (`reasignarAId !== id`).
   * **Transacción Atómica:**
     ```ts
     await db.$transaction([
       // 1. Reasignar todos los movimientos
       db.movimiento.updateMany({
         where: { categoriaId: id },
         data: { categoriaId: reasignarAId }
       }),
       // 2. Eliminar la categoría
       db.categoria.delete({ where: { id } }),
       // 3. Registrar auditoría
       db.registroAuditoria.create({ ... })
     ]);
     ```

---

## 4. Diseño de Interfaz y Experiencia de Usuario (UX/UI)

### 4.1. Gestor de Pruebas (`src/app/(portal)/configuracion/pruebas/gestor-pruebas.tsx`)
* **Retiro de pestaña "Conceptos de cobro":** Se elimina el selector de pestañas superior. La pantalla se titula directamente **"Pruebas del Concurso"**.
* **Acción de Eliminar en Tarjeta de Prueba:**
  * Se añade botón con ícono de papelera (`Trash2` de `lucide-react`) en color rojo suave (`text-gasto hover:bg-problema-fondo`).
* **Modal de Eliminación / Reasignación (`Sheet` o `Dialog`):**
  * Si la prueba tiene **0 inscripciones**:
    * Mensaje: *¿Estás seguro de eliminar la prueba «Prueba 0.90m»? Esta acción no se puede deshacer.*
    * Botones: *Cancelar* | *Eliminar prueba*.
  * Si la prueba tiene **>0 inscripciones**:
    * Alerta visual llamativa: *La prueba tiene X inscripción(es) activa(s). Para eliminarla, debes transferir estas inscripciones a otra prueba.*
    * Selector desplegable: *Selecciona la prueba de destino*. Filtra pruebas activas del mismo evento (excluyendo la actual).
    * Validación en vivo: si se detecta colisión de binomios duplicados, se muestra la lista de binomios en conflicto y se deshabilita el botón de confirmación hasta resolver el conflicto.
    * Botón de acción: *Reasignar inscripciones y eliminar*.
* **Formulario de Alta / Edición de Prueba (Claridad en Restricciones de Edad):**
  * Para evitar fatiga cognitiva o confusión visual provocada por etiquetas repetitivas y visualmente similares («Edad mínima jinete» y «Edad máxima jinete»), los campos se agruparon y diferenciaron:
    * Encabezado de bloque: **«Restricción de edad del jinete»** con distintivo *«Opcional»*.
    * Entradas diferenciadas: **«Edad mínima (años)»** (placeholder *«Sin mínimo»*) y **«Edad máxima (años)»** (placeholder *«Sin máximo»*).
    * Microcopy de ayuda: *«Si la prueba no tiene restricción de edad, deja ambos campos vacíos.»*
    * Validación en cliente: alerta toast inmediata si la edad mínima ingresada supera a la edad máxima.

---

### 4.2. Formulario de Inscripción Rápida (`src/app/(portal)/inscripciones/nueva/formulario-nueva-inscripcion.tsx`)
* Se integran botones `+ Nuevo` en los componentes selectores:
  * `<SelectorJinete>`: Opción al final del dropdown o botón inline `+ Crear nuevo jinete`.
  * `<SelectorCaballo>`: Opción al final del dropdown o botón inline `+ Crear nuevo caballo`.
  * `<SelectorClub>`: Opción al final del dropdown o botón inline `+ Crear nuevo club`.
* **Hojas Emergentes (Bottom Sheets / Modales):**
  * Al hacer clic en `+ Crear`, se abre una hoja lateral/inferior sin recargar la página.
  * **Creación de Club:** Nombre (requerido), RUT y Contacto (opcionales).
  * **Creación de Caballo:** Nombre (requerido) y Club (requerido). Si el club no está en la lista, incluye un botón directo para dar de alta el club de forma encadenada.
  * **Creación de Jinete:** Nombre (requerido), Club (requerido), Fecha de nacimiento, RUT y Contacto (opcionales). También con alta encadenada de club.
* **Auto-selección:** Tras guardar con éxito en la hoja emergente, el nuevo registro se selecciona inmediatamente en el formulario principal y se cierra la hoja emergente.

---

### 4.3. Formulario de Movimiento de Ingreso (`src/app/(portal)/movimientos/nuevo/`)
* En el formulario de registro de ingreso, se agrega una sección colapsable opcional titulada:  
  **"Asignar a participante o caballo (opcional)"**
* Contiene selectores para:
  * *Caballo* (para control de pesebreras / boxes).
  * *Jinete* o *Binomio* (para identificar a quién corresponde el ingreso si es específico).
  * *Club*.
* Permite conciliar pagos de servicios del concurso que no correspondan a una inscripción deportiva específica.

---

### 4.4. Edición de Perfil en Mi Cuenta (`src/app/(portal)/mi-cuenta/`)
* En `/mi-cuenta`, dentro de la tarjeta de perfil del usuario:
  * Se añade un botón visible **"Editar perfil"** (ícono `UserCheck` o `Edit3`).
* Al pulsar, se despliega un formulario interactivo (inline o modal):
  * Input **Nombre completo**: prellenado con `usuario.nombre || ""`. Obligatorio.
  * Input **Teléfono de contacto**: prellenado con `usuario.telefono || ""`. Opcional.
  * Botones: *Cancelar* | *Guardar cambios*.
* Al guardar:
  * Mensaje de éxito (*Toast*: "Perfil actualizado correctamente").
  * El nuevo nombre se sincroniza de inmediato con el encabezado de la app y el menú lateral.

---

### 4.5. Gestor de Categorías (`src/app/(portal)/configuracion/categorias/gestor-categorias.tsx`)
* En cada ítem de categoría que **no tenga** `claveSistema`:
  * Se agrega botón de papelera (`Trash2`).
* Modal de Confirmación / Reasignación:
  * Si cuenta con **0 movimientos**: Confirmación simple de eliminación.
  * Si cuenta con **>0 movimientos**:
    * Alerta: *Esta categoría está asignada a X movimiento(s). Para poder eliminarla, selecciona la categoría de destino a la que se transferirán dichos movimientos.*
    * Selector de categorías: Solo muestra categorías activas del mismo tipo (`ingreso` o `gasto`), excluyendo la categoría actual.
    * Botón: *Reasignar movimientos y eliminar*.

---

## 5. Matriz de Pruebas Automatizadas (Vitest)

Se deberán incorporar pruebas unitarias y de integración en la suite existente:

| Archivo de Prueba | Casos a Verificar |
| :--- | :--- |
| `src/dominio/inscripciones/binomios/binomios.test.ts` | 1. Eliminar prueba con 0 inscripciones (éxito).<br>2. Eliminar prueba con inscripciones sin especificar destino (error de validación).<br>3. Eliminar prueba con inscripciones y reasignar (éxito, transaccional, conserva tarifas y pagos).<br>4. Bloqueo por colisión: binomio ya inscrito en la prueba destino (error y rollback).<br>5. Rechazo de eliminación por usuarios con rol ayudante u observador. |
| `src/dominio/organizacion/categorias.test.ts` | 1. Eliminar categoría sin movimientos (éxito).<br>2. Rechazo de eliminación de categoría de sistema (`claveSistema`).<br>3. Eliminar categoría con movimientos y reasignar a categoría válida (éxito, transaccional).<br>4. Rechazo de reasignación hacia categoría de tipo opuesto o inactiva.<br>5. Rechazo de eliminación por roles no administradores. |
| `src/dominio/acceso/acceso.test.ts` | 1. Actualizar perfil propio con membresía activa (éxito con nombre y teléfono).<br>2. Rechazo de actualización con nombre vacío o menor a 2 caracteres.<br>3. Rechazo de actualización si el usuario no tiene membresía aprobada. |
| `src/dominio/movimientos/movimientos.test.ts` | 1. Registrar ingreso con `caballoId` y `categoriaId` (éxito).<br>2. Verificar que los reportes de ingresos filtran adecuadamente por caballo. |

---

## 6. Plan de Ejecución Paso a Paso

Para la futura sesión de desarrollo, se recomienda seguir este orden secuencial para evitar conflictos de dependencias:

```
[Paso 1: Prisma & Migración]
  ├── Actualizar schema.prisma (telefono en Usuario, referencias en Movimiento, purga de Concepto/Cargo)
  └── Ejecutar `npx prisma db push` o migración

[Paso 2: Dominio & Acciones]
  ├── Implementar `eliminarPrueba` con reasignación y antiduplicidad
  ├── Implementar `eliminarCategoria` con reasignación
  ├── Implementar `actualizarMiPerfil`
  └── Adaptar `crearMovimiento` para recibir caballoId, jineteId, clubId, binomioId

[Paso 3: Tests Automatizados]
  └── Correr y validar suites en Vitest (pruebas, categorías, perfil, movimientos)

[Paso 4: UX/UI - Configuración & Cuenta]
  ├── Actualizar `gestor-pruebas.tsx` (remover tab conceptos, agregar modal eliminar/reasignar)
  ├── Actualizar `gestor-categorias.tsx` (agregar modal eliminar/reasignar)
  └── Actualizar `/mi-cuenta` (añadir formulario de edición de perfil)

[Paso 5: UX/UI - Inscripción & Movimientos]
  ├── Implementar alta rápida en selectores (Jinete, Caballo, Club)
  ├── Actualizar `/inscripciones/nueva` con hojas emergentes de creación
  ├── Actualizar `/movimientos/nuevo` con campos opcionales de asignación
  └── Limpiar referencias huérfanas de conceptos/cargos en `ficha-binomio.tsx` y vistas de inscripciones
```

---

## 7. Unificación de Movimientos de Tesorería y Cobro de Inscripciones

### 7.1. Motivación y Principios de Diseño
1. **Regla de Orden:** En cualquier selector o interfaz dual, **Ingreso** se ubica a la **izquierda** (color verde/esmeralda) y **Gasto** a la **derecha** (color rojo/carmín).
2. **Consolidación en Menú Rápido (`HojaRegistrar`):** En lugar de bifurcar en 4 tarjetas redundantes, el menú se simplifica a dos opciones directas:
   - **«Registrar movimiento»:** Abre el formulario unificado `/movimientos/nuevo` donde el usuario selecciona el tipo (Ingreso por defecto o Gasto).
   - **«Inscribir binomio»:** Abre `/inscripciones/nueva` para el registro deportivo en cancha.
3. **Cobro de Inscripciones Anidado en Ingreso:** Todo pago de inscripciones es fundamentalmente un ingreso de dinero en Tesorería. Al registrar un Ingreso en la categoría «Inscripciones», el formulario despliega dinámicamente el selector de participante (Binomio, Jinete o Club) y la lista de pruebas pendientes con su saldo para realizar el reparto directo (`repartoInscripciones`), extinguiendo la deuda deportiva en la misma transacción contable.
4. **Compatibilidad:** Los atajos directos (como «Registrar pago» en ficha de binomio) apuntan a `/movimientos/nuevo?tipo=ingreso&categoria=inscripciones&binomioId=[id]`, preseleccionando los campos de forma inmediata. La ruta `/inscripciones/pago` redirige de forma transparente a este flujo unificado.

### 7.2. Configuración de Entidad Asociada por Categoría y Herencia
1. **Configuración en Gestor de Categorías (`/configuracion/categorias`):**
   * Toda categoría (ingreso o gasto) permite configurar su **«Entidad deportiva asociada»**:
     - `Ninguna` (por defecto): Para conceptos generales sin sujeto directo (ej. bebidas, mantención general).
     - `Caballo`: Para pensiones de pesebreras, herrajes, veterinaria, etc.
     - `Jinete`: Para cuotas anuales de jinete, acreditaciones personales, etc.
     - `Binomio`: Para inscripciones deportivas y servicios específicos de binomios.
     - `Club`: Para garantías o aportes institucionales.
     - `Prueba`: Para premios o auspicios asignados a una prueba específica.
   * **Casilla «¿Es obligatorio?» (`exigeSujeto`):** Define si al seleccionar dicha categoría en el registro de un movimiento es mandatorio escoger la entidad o si puede quedar como opcional.
2. **Herencia Automática de Entidades:**
   * Al seleccionar un **Binomio**, el sistema guarda en el movimiento contable la herencia completa:
     - `movimiento.binomioId = binomio.id`
     - `movimiento.jineteId = binomio.jineteId`
     - `movimiento.caballoId = binomio.caballoId`
     - `movimiento.clubId = binomio.clubId`
   * Si se asocia a `Caballo`, se hereda `movimiento.clubId = caballo.clubId`.
   * Si se asocia a `Jinete`, se hereda `movimiento.clubId = jinete.clubId`.
   * Esto garantiza que al ingresar al Directorio de Jinetes, Caballos o Clubes, el historial de movimientos y estados de cuenta refleje automáticamente estos movimientos sin requerir ingresos dobles.

### 7.3. Simplificación Radical de UX/UI en Formulario de Movimientos
1. **Contraste de Monto:** El campo de monto utiliza `text-stone-950 font-black` con fondo blanco y alto contraste para legibilidad nítida en exteriores o celulares bajo luz solar.
2. **Medio de Pago Unificado (Eliminación de "¿Se recibió el dinero?" y "Naturaleza"):**
   * En **Ingreso**: Botones directos `[ Transferencia ] [ Efectivo ] [ Por cobrar ] [ En especie / Canje ]`.
     - Si marca `Transferencia`: Se despliega únicamente el campo *"Nombre / Titular de origen"*.
     - Si marca `Efectivo` o `Por cobrar`: El campo de origen permanece oculto.
     - Si marca `En especie / Canje`: Se registra con naturaleza en especie sin ingreso de caja física.
     - Se elimina por completo el bloque redundante "¿Ya se recibió el dinero?".
   * En **Gasto**: Botones directos `[ Transferencia ] [ Efectivo ] [ Por pagar ]`, eliminando el bloque "¿Ya se pagó?".
3. **Unificación en Campo Único de Observación:**
   * Se elimina el campo redundante *"Descripción corta"* dejando un solo cuadro de texto: **Observación** para cualquier detalle relevante.
4. **Formulario Adaptativo por Categoría:**
   * Se elimina la sección colapsable estática *"Asignar a participante o caballo"*.
   * El formulario despliega dinámicamente y únicamente el selector que la categoría configurada requiere (`Caballo`, `Jinete`, `Binomio`, `Club` o `Prueba`).
   * Si la categoría no asocia ninguna entidad, el formulario se mantiene ultra corto y sin elementos distractores.




### 7.4. Corrección de Causa Raíz, Selector Combobox y Configuración de Categorías del Sistema

#### 1. Causa Raíz del Problema de Categorías
* **Error de Arquitectura Next.js Server Actions:**
  En Next.js 15, los archivos marcados con `"use server"` tienen la restricción estricta de que **únicamente pueden exportar funciones asíncronas**. Si se exporta cualquier objeto, constante o esquema Zod (por ejemplo `export const clubSchema = z.object(...)`), Next.js genera en runtime el error `⨯ Error: A "use server" file can only export async functions, found object.`
  Este fallo impedía que las Server Actions de dominios vinculados respondieran, provocando que la llamada cliente `obtenerCategoriasSelector(tipo)` fallara silenciosamente y dejara la lista de categorías vacía.
* **Solución Implementada:**
  - Se eliminó el `export` innecesario de las constantes de esquemas (`clubSchema`, `apoderadoSchema`, `caballoSchema`, `jineteSchema`) en `src/dominio/inscripciones/participantes/acciones.ts`.
  - Se modificó la página `NuevoMovimientoPage` (Server Component) para consultar directamente las categorías activas en base de datos e inyectarlas como prop `categorias` al formulario cliente. De este modo, las categorías se renderizan de forma inmediata desde el HTML inicial sin depender de peticiones asíncronas cliente.

#### 2. Rediseño del Selector a Combobox con Búsqueda en Tiempo Real
* En `src/components/app/selector-categoria.tsx`, el antiguo `<select>` estático fue reemplazado por un **Combobox interactivo con buscador**:
  - **Buscador en tiempo real:** Permite escribir cualquier texto para filtrar instantáneamente por nombre de categoría, entidad deportiva asociada (`Caballo`, `Binomio`, `Prueba`, etc.) o clave de sistema.
  - **Insignias de contexto:** Muestra insignias visuales claras indicando si la categoría exige contraparte o si vincula a una entidad deportiva específica.
  - **Experiencia Móvil y Accesibilidad:** Botones táctiles de al menos 44px de alto, cierre automático al hacer clic fuera o pulsar la tecla `Escape`, y selección rápida con un solo toque.

#### 3. Configuración de Entidades en Categorías del Sistema y «Binomio y Prueba»
* **Edición en Categorías del Sistema:**
  En el gestor `/configuracion/categorias`, las categorías del sistema (como `Inscripciones`) ahora permiten que el administrador configure libremente su entidad deportiva asociada (`sujetoAsociado`) y si es obligatoria (`exigeSujeto`), bloqueando únicamente la modificación del nombre para preservar la integridad lógica del sistema.
* **Nueva Opción «Binomio y Prueba» (`binomio_prueba`):**
  - Se añadió la opción `binomio_prueba` tanto al crear como al editar categorías, permitiendo vincular movimientos a un binomio y una prueba específica simultáneamente.
  - La categoría del sistema `Inscripciones` se inicializa por defecto con `sujetoAsociado = "binomio_prueba"` y `exigeSujeto = true`.
  - En `/movimientos/nuevo`, si se selecciona una categoría con `binomio_prueba` fuera del flujo masivo de inscripciones, el formulario despliega automáticamente ambos selectores (Binomio y Prueba) y valida que ambos sean provistos antes de confirmar el registro.

### 7.5. Corrección de Selección In-Situ de Participantes y Hard Reset de Base de Datos

#### 1. Causa Raíz del Problema de Auto-Selección In-Situ
Al crear un Jinete, Caballo o Club a través del pop-up modal en `/inscripciones/nueva`, el registro se creaba exitosamente en la base de datos (y era visible en el Directorio), pero el formulario principal de inscripción no se auto-completaba con la entidad recién creada y los comboboxes indicaban "No se encontraron resultados":
* **Causa 1 (Desconexión de Estado entre Padre e Hijo):** Los componentes `SelectorJinete`, `SelectorCaballo` y `SelectorClub` gestionaban su propia lista interna local. El formulario padre (`FormularioNuevaInscripcion`) mantenía las listas maestras actualizadas en su propio estado (`listaJinetes`, `listaCaballos`, `listaClubes`), pero no las pasaba como props a los selectores hijos, por lo que el selector hijo intentaba resolver el nuevo ID contra su propia lista interna desactualizada o vacía.
* **Causa 2 (Acciones Cliente sin `"use server"`):** El archivo `consultas.ts` ejecutaba funciones de lectura del cliente sin directiva de Server Action, fallando silenciosamente al ser consumido desde componentes clientes.
* **Causa 3 (Falta de reactividad sincronizada):** Al cambiar la entidad seleccionada externamente (mediante prop de ID), los selectores no actualizaban de inmediato su estado visual interno si la lista aún no había terminado de hidratarse.

#### 2. Solución Implementada
* **Exportación de Server Actions:** Se exportaron `obtenerClubesActivos`, `obtenerJinetesActivos` y `obtenerCaballosActivos` directamente desde `src/dominio/inscripciones/participantes/acciones.ts` con directiva `"use server"` y retorno tipado.
* **Paso Directo de Opciones Disponibles (`*Disponibles`):**
  - `SelectorJinete` ahora acepta `jinetesDisponibles={listaJinetes}`.
  - `SelectorCaballo` ahora acepta `caballosDisponibles={listaCaballos}`.
  - `SelectorClub` ahora acepta `clubesDisponibles={listaClubes}`.
  - Tanto en `formulario-nueva-inscripcion.tsx` como en `formulario-movimiento.tsx`, los selectores reciben la colección precargada por el servidor y actualizada en memoria cliente.
* **Sincronización Reactiva Inmediata:** Se incorporaron `useEffect` en cada selector para resolver de forma instantánea el objeto seleccionado ante cualquier variación en el ID o en la lista de opciones disponibles, garantizando que tras cerrar el pop-up de creación el campo aparezca preseleccionado y visible.
* **Creación Encadenada de Clubes:** Se habilitaron accesos directos `+ Crear Club` dentro de las ventanas emergentes de Jinete y Caballo, permitiendo registrar un club al vuelo sin abandonar la creación del participante.
* **Zero-State Amigable en Pruebas:** Si un evento no tiene pruebas configuradas, el formulario de inscripción presenta una tarjeta informativa amigable con un enlace directo a `/configuracion/pruebas` para desbloquear la configuración técnica.

#### 3. Procedimiento de Hard Reset en Ambiente de Pruebas
Se implementó y ejecutó el script `scripts/hard-reset-pruebas.ts` sobre la base de datos de Railway en el entorno `pruebas`:
* **Eliminación Ordenada por Integridad Referencial:**
  1. `Pago` y `Devolucion`
  2. `Respaldo`
  3. `Traspaso`
  4. `Movimiento`
  5. `Inscripcion`
  6. `Binomio`
  7. `Prueba`
  8. `JineteApoderado` y `Apoderado`
  9. `Jinete`, `Caballo` y `Club`
  10. `Contraparte`
  11. `RegistroAuditoria`
* **Limpieza Estricta de Categorías:** Se eliminaron todas las categorías custom o históricas (274 registros generados durante tests). Se conservaron y configuraron únicamente las dos categorías del sistema:
  - `Inscripciones` (tipo: `ingreso`, claveSistema: `"inscripciones"`, sujetoAsociado: `"binomio_prueba"`, exigeSujeto: `true`, activa: `true`, orden: `0`).
  - `Devoluciones` (tipo: `gasto`, claveSistema: `"devoluciones"`, activa: `true`, orden: `999`).
* **Limpieza de Entidades Sintéticas:** Se purgaron los eventos de prueba y las 43 cuentas/membresías ficticias generadas en corridas de tests.
* **Entidades Preservadas:** Se conservaron intactos la Organización oficial (*Club Ecuestre Parronal Las Marias*), el Evento principal (*Concurso Ecuestre Parronal* en estado `abierto`) y la cuenta de administrador oficial (`rodrigodiaztapia@gmail.com`).

