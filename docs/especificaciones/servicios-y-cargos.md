# Especificación Técnica: Servicios y Cargos Operativos, Tarifas Estándar y Reparto Multiconcepto

## 1. Contexto y Objetivos

En la operación ecuestre de terreno (concursos, exhibiciones y eventos hípicos), los participantes comprometen diversos servicios operativos asociados a sus entidades deportivas (caballos, jinetes, clubes o binomios), tales como:
- **Pensión y Pesebreras** (asociadas a caballos).
- **Alimento, Fardo y Viruta** (asociadas a caballos).
- **Acreditaciones o Cenas de Camaradería** (asociadas a jinetes).
- **Boxes o Espacios de Club** (asociados a clubes).

### Principios Rectores:
1. **Desacoplamiento Operativo vs Financiero:**
   El compromiso de un servicio (hecho operativo) crea una cuenta por cobrar (`Cargo`), independiente del movimiento bancario. No se registra un movimiento financiero de dinero hasta que efectivamente ingresa el flujo a caja o cuenta corriente.
2. **Reparto Multiconcepto Unificado:**
   Los participantes suelen transferir un monto global que cubre simultáneamente la inscripción y uno o más servicios (ej. transferencia de $105.000 que salda una inscripción de $80.000 y una pensión de $25.000). El sistema permite imputar un único movimiento de ingreso a múltiples inscripciones y cargos mediante registros `Pago`, manteniendo la cuadratura matemática exacta sin duplicar movimientos.
3. **Fricción Cero en Terreno (Tarifas Estándar):**
   Las categorías configuradas con entidad asociada pueden definir una tarifa base (`tarifaBaseClp`). Al asignar el servicio, el monto sugerido se precarga automáticamente, eliminando tipeos repetitivos. Si un servicio tiene tarifas distintas (ej. pensión básica vs premium), se definen como categorías independientes.
4. **Visibilidad Inmediata en Directorio (Submenú Dinámico):**
   Las categorías activas de servicio aparecen directamente indentadas bajo el ítem **Directorio** en la barra lateral con íconos distintivos (🐎 Caballo, 👤 Jinete, 🏛️ Club, 👥 Binomio), permitiendo acceder a la nómina de cada servicio en un solo clic.
5. **Nómina con Semáforo y Cobro Rápido:**
   Cada servicio cuenta con su pantalla `/servicios/[categoriaId]` con métricas consolidadas (Total Asignados, Recaudado, Saldo por cobrar), filtros de estado, semáforo visual (🟢 Pagado, 🟡 Parcial, 🔴 Pendiente), botón de cobro rápido en un clic y botón para copiar recordatorio pre-redactado para WhatsApp.
6. **Integración en Fichas de Participantes:**
   Las fichas individuales (ej. `/participantes/caballos/[id]`) incorporan una sección dedicada de "Servicios y Cargos del Concurso" con botón de alta directa, y el estado de cuenta global integra de forma transparente tanto inscripciones como cargos.

---

## 2. Modelo de Datos y Esquema Prisma

### 2.1 Modelo `Cargo` (`prisma/schema.prisma`)
```prisma
model Cargo {
  id               String       @id @default(cuid())
  organizacionId   String       @map("organizacion_id")
  eventoId         String       @map("evento_id")
  categoriaId      String       @map("categoria_id")

  // Sujeto imputado (al menos uno según la configuración de la categoría)
  caballoId        String?      @map("caballo_id")
  jineteId         String?      @map("jinete_id")
  clubId           String?      @map("club_id")
  binomioId        String?      @map("binomio_id")

  cantidad         Int          @default(1)
  tarifaClp        Int          @map("tarifa_clp")
  montoClp         Int          @map("monto_clp") // cantidad * tarifaClp

  descripcion      String?
  motivoAjuste     String?      @map("motivo_ajuste")
  anulado          Boolean      @default(false)
  motivoAnulacion  String?      @map("motivo_anulacion")
  anuladoPorId     String?      @map("anulado_por_id")
  anuladoEn        DateTime?    @map("anulado_en")

  claveCliente     String       @map("clave_cliente")
  registradoPorId  String       @map("registrado_por_id")
  version          Int          @default(1)
  creadoEn         DateTime     @default(now()) @map("creado_en")
  actualizadoEn    DateTime     @updatedAt @map("actualizado_en")

  // Relaciones
  organizacion     Organizacion @relation(fields: [organizacionId], references: [id])
  evento           Evento       @relation(fields: [eventoId], references: [id])
  categoria        Categoria    @relation(fields: [categoriaId], references: [id])
  caballo          Caballo?     @relation(fields: [caballoId], references: [id])
  jinete           Jinete?      @relation(fields: [jineteId], references: [id])
  club             Club?        @relation(fields: [clubId], references: [id])
  binomio          Binomio?     @relation(fields: [binomioId], references: [id])
  registradoPor    Usuario      @relation("CargoRegistradoPor", fields: [registradoPorId], references: [id])
  anuladoPor       Usuario?     @relation("CargoAnuladoPor", fields: [anuladoPorId], references: [id])

  pagos            Pago[]
  devoluciones     Devolucion[]

  @@unique([organizacionId, eventoId, claveCliente])
  @@index([organizacionId, eventoId, categoriaId])
  @@index([organizacionId, caballoId])
  @@index([organizacionId, jineteId])
  @@index([organizacionId, clubId])
  @@index([organizacionId, binomioId])
  @@map("cargo")
}
```

### 2.2 Extensiones a Modelos Existentes
- **`Categoria`:**
  - `tarifaBaseClp Int? @map("tarifa_base_clp")`: tarifa sugerida en pesos chilenos para servicios estándar.
  - `cargos Cargo[]`: relación 1 a N con cargos operativos.
- **`Pago`:**
  - `cargoId String? @map("cargo_id")`: clave foránea opcional a `Cargo`.
  - `cargo Cargo? @relation(fields: [cargoId], references: [id])`.
  - Un pago puede imputar a una `Inscripcion` (existente) o a un `Cargo` (nuevo).
- **`Devolucion`:**
  - `cargoId String? @map("cargo_id")`: enlace opcional a `Cargo` para devoluciones de servicios anulados tras haber sido abonados.
- **`Usuario`:**
  - Relaciones `cargosRegistrados` y `cargosAnulados`.
- **`Caballo`, `Jinete`, `Club`, `Binomio`:**
  - Relación `cargos Cargo[]`.

---

## 3. Capa de Dominio y Lógica de Negocio (`src/dominio/servicios/cargos.ts`)

### 3.1 Server Actions Principales
- **`crearCargo(datos: CrearCargoInput)`:**
  Valida permisos (`inscripciones.inscribir`), verifica evento abierto y pertenencia a la organización (`exigirDeLaOrganizacion`). Valida la presencia del sujeto requerido (`caballoId`, `jineteId`, `clubId` o `binomioId`). Calcula `montoClp = cantidad * tarifaClp`. Soporta idempotencia mediante `claveCliente`.
  Si se especifica `pagoInmediato`, crea dentro de la misma transacción el movimiento de ingreso en la categoría del servicio y el registro `Pago` vinculado al cargo.
- **`editarCargo(datos: EditarCargoInput)`:**
  Permite ajustar cantidad, tarifa o descripción del servicio. Implementa control optimista de concurrencia mediante `version`: si el cargo fue modificado concurrentemente, arroja `ConflictoVersionError`. Registra `motivoAjuste` en auditoría.
- **`anularCargo(id: string, motivo: string, version: number)`:**
  Anula el cargo marcando `anulado: true`, registrando auditoría. Regla de negocio estricta: **bloquea la anulación si el cargo tiene pagos vigentes asociados** (requiere desasignar los pagos previamente para proteger la cuadratura contable).
- **`listarCargosPorCategoria(ctx, categoriaId)`:**
  Consulta la nómina de cargos del evento activo para la categoría, calculando en tiempo real:
  - `pagadoClp`: suma de pagos vigentes (`anulado: false`).
  - `saldoClp`: `Math.max(0, montoClp - pagadoClp)`.
  - `estado`: `"pagado"` (saldo 0), `"parcial"` (pagado > 0) o `"pendiente"` (pagado 0).
  - Totales agregados: `totalCargos`, `totalRecaudado`, `totalPorCobrar`, `cantidadTotal`.
- **`obtenerCargosPorSujeto(ctx, filtros)`:**
  Consulta los cargos vigentes asociados a un caballo, jinete, club o binomio en el evento actual con sus respectivos pagos y fechas.

---

## 4. Reparto Multiconcepto de Pagos

El motor de pagos en `src/dominio/inscripciones/binomios/pagos.ts` fue ampliado para admitir ítems heterogéneos:
```ts
export interface RepartoItemInput {
  id: string; // inscripcionId o cargoId
  tipo?: "inscripcion" | "cargo";
  montoClp: number;
}
```
En `ejecutarRegistrarPagoInscripciones` y `ejecutarAsignarPorAsignar`:
1. Valida que `sum(reparto.montoClp) === montoClp`.
2. Para cada ítem con `tipo === "cargo"`:
   - Bloquea la fila del cargo en PostgreSQL (`SELECT FOR UPDATE`).
   - Verifica que el monto a pagar no exceda el saldo pendiente del cargo.
   - Crea el registro `Pago` con `cargoId: item.id`.
3. Para cada ítem con `tipo === "inscripcion"`:
   - Ejecuta las validaciones clásicas de aranceles de prueba.
   - Crea el registro `Pago` con `inscripcionId: item.id`.
4. El hecho financiero queda respaldado en **un único `Movimiento` bancario**, garantizando cuadratura contable estricta en caja y bancos.

---

## 5. Experiencia de Usuario e Interfaz (UX/UI)

### 5.1 Submenú Dinámico en Navegación Lateral
- `src/lib/presentacion/menu.ts` y `src/app/(portal)/layout.tsx`:
  Detecta automáticamente las categorías activas de ingreso que tienen un `sujetoAsociado` configurado.
  Las inyecta como `subItems` bajo el ítem **Directorio** (`/participantes`), acompañadas de íconos temáticos y badges con el conteo de cargos con saldo pendiente en el concurso en curso.
- `src/components/app/menu-principal.tsx`:
  Renderizado responsivo indentado con borde guía sutil, destacando con estilo activo cuando el usuario se encuentra navegando la nómina del servicio correspondiente.

### 5.2 Pantalla de Nómina del Servicio (`/servicios/[categoriaId]`)
- **Cabecera Contextual:** Nombre del servicio, sujeto asociado y tarifa estándar precargada. Botón de alta rápida `+ Asignar [Caballo/Jinete/...]`.
- **Tarjetas KPI:**
  - *Asignados:* Conteo total de sujetos y monto bruto contratado.
  - *Recaudado:* Monto abonado e indicador porcentual de cobertura.
  - *Por Cobrar:* Saldo total pendiente de cobro y conteo de cuentas abiertas.
- **Pestañas y Filtro en Vivo:** Pestañas *Todos*, *Por cobrar* y *Pagados*, acompañadas de buscador de texto por nombre o club.
- **Tarjetas con Semáforo:**
  - 🟢 **Pagado:** Insignia verde y estado completado.
  - 🟡 **Parcial:** Insignia ámbar indicando monto abonado y resta pendiente.
  - 🔴 **Pendiente:** Insignia roja destacando deuda total.
- **Acciones Rápidas:**
  - *Cobrar:* Abre modal de pago rápido en un clic (Transferencia o Efectivo, sugiriendo el saldo exacto).
  - *WhatsApp:* Copia al portapapeles mensaje de cortesía pre-redactado con montos y saldos listo para enviar.
  - *Editar / Ajustar:* Modificación de cantidad, tarifa o nota con justificación en auditoría.
  - *Anular:* Anulación segura protegida contra registros con pagos.

### 5.3 Fichas de Participantes y Estado de Cuenta
- En `/participantes/caballos/[id]` se incorpora la sección "Servicios y Cargos del Concurso" que permite registrar consumos (ej. pesebrera adicional, fardo) directamente desde la ficha del caballo.
- La función centralizada `estadoCuenta` consolida tanto inscripciones como cargos en una vista única y en el texto exportable para WhatsApp.

---

## 6. Verificación y Cobertura de Pruebas

La implementación cuenta con una suite completa de pruebas de integración en `src/dominio/servicios/cargos.test.ts`:
1. `crea un cargo con tarifa estándar y sujeto caballo` (PASÓ).
2. `crea un cargo con pago inmediato y movimiento vinculado` (PASÓ).
3. `edita exitosamente un cargo e incrementa su versión (concurrencia)` (PASÓ).
4. `anula un cargo sin pagos correctamente` (PASÓ).
5. `bloquea la anulación si el cargo tiene pagos vigentes` (PASÓ).
6. `distribuye 1 movimiento de transferencia entre 1 inscripción y 1 cargo operativo` (PASÓ).
7. `impide que una organización distinta consulte o modifique cargos (multi-tenant)` (PASÓ).
Adicionalmente, se actualizaron y superaron al 100% las suites `menu.test.ts` (4 tests) y `categorias.test.ts` (13 tests).
