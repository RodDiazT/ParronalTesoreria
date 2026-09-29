# Mejoras 2: Especificación Técnica y Plan de Usabilidad UX/UI Integral

**Fecha:** 29 de Septiembre de 2026  
**Estado:** Propuesta de Implementación para Aprobación (v1.0)  
**Sistema:** Tesorería Club Parronal — Gestión de Concursos Ecuestres  
**Destinatario:** Rod / Equipo de Desarrollo  

---

## 1. Resumen Ejecutivo y Diagnóstico Global

Tras una auditoría minuciosa de flujos, componentes y ergonomía de uso en terreno, se identificaron fallas operativas y puntos de fricción cognitiva en la plataforma. El presente documento formaliza el diagnóstico técnico, las decisiones de diseño y el plan de implementación para transformar la plataforma en una herramienta rápida, minimalista y libre de bloqueos en dispositivos móviles.

### 1.1 Hallazgos Críticos Resueltos en esta Especificación

1. **Bug Crítico de Categorías Ocultas (`/movimientos/nuevo`):**
   - **Causa:** En `movimientos/nuevo/page.tsx`, la consulta Prisma `claveSistema: { not: "devoluciones" }` en SQL estándar descarta silenciosamente todas las filas donde `clave_sistema IS NULL`.
   - **Efecto:** Todas las categorías creadas manualmente por el usuario desaparecen de la lista desplegable en gastos.
   - **Solución:** Reemplazar por `OR: [{ claveSistema: null }, { claveSistema: { not: "devoluciones" } }]` o usar `ejecutarObtenerCategoriasSelector`.

2. **Apilamiento y z-index Oculto de Modales Anidados (`/inscripciones/nueva`):**
   - **Causa:** Al estar en el modal de *Crear Jinete* o *Crear Caballo* y tocar *"+ Crear Club"*, el modal de Club se monta con `z-50`, pero al estar antes en el DOM que el modal de Jinete (también `z-50`), queda físicamente **detrás** del modal de Jinete. El usuario cree que no reaccionó y solo lo ve al cerrar Jinete.
   - **Solución:** Dotar a `<Sheet>` de soporte para niveles de elevación (`nivel` o `zIndex?: number`, e.g. `z-[60]` para sub-modales anidados), permitiendo que el modal hijo se superponga con su propio backdrop sin cerrar el modal padre ni perder datos.

3. **Dualidad Redundante de Fechas en Movimientos:**
   - **Problema:** Exigir dos fechas independientes (*"Fecha del movimiento"* y *"Fecha en que se pagó"*).
   - **Efecto:** Confusión cognitiva innecesaria en el 98% de los registros que ocurren en el mismo día, duplicación de toques de calendario y riesgo de choques de validación (`min/max`).
   - **Solución:** Unificar en **un solo campo "Fecha"** (por defecto Hoy). El backend sincroniza `fechaPago = fecha` para movimientos pagados.

4. **Invasión de Inputs de Ajuste en Pruebas de Inscripción (`/inscripciones/nueva`):**
   - **Problema:** Al marcar cualquier prueba, se despliegan automáticamente dos inputs obligando a ver ajuste de tarifa y motivo.
   - **Efecto:** Satura el 50% de la pantalla con campos que solo se usan en el ~5% de los casos (becas o descuentos).
   - **Solución:** Prueba limpia y compacta por defecto, con micro-enlace opcional `"+ Tarifa especial / Beca"`.

5. **Fricción en Respaldo y Casilla Punitiva de Culpabilidad:**
   - **Problema:** Componente de fotos en el paso 3 que bloquea el envío a menos que se suba foto o se marque la casilla obligatoria *"No tengo respaldo físico ni digital (exige observación obligatoria)"*.
   - **Solución:** Reubicar al final del formulario y convertir en un botón amigable `[ + Adjuntar comprobante / foto ]` con nota explicativa opcional.

6. **Redundancia Contraparte vs Nombre de Origen en Ingresos:**
   - **Problema:** En transferencias se pide seleccionar Contraparte y además escribir a mano el Titular de la cuenta.
   - **Solución:** La Contraparte asume la titularidad por defecto; solo se abre campo si pagó un tercero no registrado.

7. **Sobrecarga de Campos en Altas Rápidas en Pista:**
   - **Problema:** Modales in-situ que piden RUT, chip, teléfono o fecha de nacimiento mientras se está en la pista.
   - **Solución:** **Único campo obligatorio: Nombre**. Todo lo demás colapsado en `"+ Datos opcionales"`.

8. **Pestañas Horizontales Saturadas en `/movimientos`:**
   - **Problema:** 7 pestañas deslizantes sin contadores numéricos visibles.
   - **Solución:** Reducir a 3 vistas directas con badges numéricos en tiempo real (`Todos`, `Por validar (N)`, `Pendientes`).

---

## 2. Arquitectura Técnica de las Mejoras

### 2.1 Componente `Sheet` con Soporte de Apilamiento (Stacking z-index)
Se actualiza `src/components/ui/sheet.tsx` para aceptar la propiedad `nivel?: number` o `zIndex?: number`:

```typescript
interface SheetProps {
  abierta: boolean;
  alCerrar: () => void;
  posicion?: "abajo" | "izquierda" | "centro";
  titulo?: string;
  descripcion?: string;
  children: React.ReactNode;
  mostrarCerrar?: boolean;
  className?: string;
  zIndex?: number; // Por defecto 50. Para modales anidados: 60, 70, etc.
}
```
- Cuando un modal se abre desde dentro de otro (e.g. `modalClub` invocado desde `modalJinete`), recibe `zIndex={60}`.
- Su backdrop se sitúa en `z-[59]` o `z-[60]`, garantizando visualmente que el modal hijo flota por encima del modal padre.
- Al cerrar el modal hijo, el modal padre continúa abierto con sus datos intactos y el nuevo club preseleccionado en su select.

### 2.2 Sincronización de Fechas en Dominio de Movimientos
En `src/app/(portal)/movimientos/nuevo/formulario-movimiento.tsx` y `src/dominio/movimientos/acciones.ts`:
- La interfaz presenta un único control de fecha:
  ```tsx
  <Label htmlFor="fecha">Fecha *</Label>
  <Input id="fecha" type="date" value={fecha} max={hoyChile} ... />
  ```
- En el payload de envío:
  - Si el movimiento está `pagado`: `fechaPago = fecha`.
  - Si el movimiento está `pendiente`: `fechaPago = null`.
- Se preserva la columna `fechaPago` en la base de datos PostgreSQL y la trazabilidad de auditoría intacta.

---

## 3. Plan de Implementación por Fases

### Fase 1: Correcciones Críticas de Bloqueo Inmediato
- **Meta:** Restaurar visibilidad de categorías y resolver el solapamiento de modales.
- **Acciones:**
  1. Corregir consulta de categorías en `src/app/(portal)/movimientos/nuevo/page.tsx` permitiendo `claveSistema: null`.
  2. Implementar `zIndex` configurable en `src/components/ui/sheet.tsx`.
  3. Configurar elevación `zIndex={60}` para `modalClub` en `formulario-nueva-inscripcion.tsx` cuando se invoca desde jinete o caballo.

### Fase 2: Simplificación Radical del Formulario de Movimientos
- **Meta:** Reducir el tiempo de registro en terreno de 50s a 15s.
- **Acciones:**
  1. Unificar a un único campo de **Fecha**.
  2. Reordenar el flujo: Monto -> Categoría -> Contraparte/Sujeto -> Medio de Pago y Fecha -> Respaldo/Nota.
  3. Compactar selector de "Quién pagó" a un control segmentado minimalista `[ Caja del Club | Reembolso Personal ]`.
  4. Eliminar campo redundante de "Nombre de origen" cuando ya hay contraparte seleccionada.
  5. Transformar el área de comprobantes a formato amigable no bloqueante.

### Fase 3: Optimización de Modales In-Situ ("One-Touch")
- **Meta:** Altas instantáneas en 3 segundos.
- **Acciones:**
  1. En modales in-situ de Club, Jinete, Caballo y Contraparte: fijar `Nombre` como único campo obligatorio.
  2. Plegar RUT, teléfono, microchip y notas en acordeón opcional colapsado.
  3. En selección de pruebas de inscripción, colapsar los inputs de descuento/ajuste bajo un botón `"+ Tarifa especial"`.

### Fase 4: Limpieza de Listados y Dashboard
- **Meta:** Visibilidad inmediata en pantallas móviles.
- **Acciones:**
  1. En `/movimientos`, consolidar las pestañas en 3 vistas principales con insignias en tiempo real (`Por validar (N)`).
  2. Verificar eventos de blur/click en selectores para pantallas táctiles Safari iOS.
  3. Ejecución y validación de la suite completa de pruebas automatizadas.
