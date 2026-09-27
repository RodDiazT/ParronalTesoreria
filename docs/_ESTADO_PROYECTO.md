# Estado del Proyecto — Tesorería Parronal

Última actualización: 2026-09-27

## Resumen

Está aprobado el marco general, que fija las reglas y el diseño del proyecto; todavía no hay componentes aprobados ni código. Si se ejecutara lo aprobado, el proyecto tendría definidos:

- quién puede hacer qué: dos administradores, ayudantes, observadores y solicitantes;
- el modelo de datos: organización, evento, movimientos, jinetes, caballos, apoderados, clubes, binomios, inscripciones y pagos;
- cómo se calculan saldo de caja, por cobrar, por pagar y por validar;
- el stack técnico y las reglas de cumplimiento de datos personales.

Cada pantalla se construye a partir del documento de su componente. El núcleo (acceso, movimientos, inscripciones con importación desde Excel y dashboard) debe estar en uso a más tardar el 2026-10-04.

## Stack o recursos confirmados

| Capa o recurso | Decisión | Documento que lo confirma |
|---|---|---|
| Aplicación | Next.js (App Router) con TypeScript | Marco general, §8 |
| Interfaz | Tailwind CSS, mobile-first | Marco general, §8 |
| Validación | Zod | Marco general, §8 |
| Base de datos | PostgreSQL de Railway | Marco general, §8 |
| Acceso a datos | Prisma | Marco general, §8 |
| Autenticación | Auth.js con Google, sesiones en base de datos | Marco general, §8 |
| Archivos de respaldo | Volumen persistente de Railway, servidos solo por la app | Marco general, §8 |
| Pruebas | Vitest (reglas, permisos, aislamiento) | Marco general, §8 |
| Despliegue | Cuenta Railway existente de Rod, URL de la plataforma | Marco general, §8 |
| Idioma del código | Dominio en español sin tildes; términos técnicos en inglés | Marco general, §8 |
| IA de conciliación (v1.1) | API de Claude, opcional | Marco general, §8 |

## Herramientas, proveedores e integraciones

| Herramienta | Uso | Documento |
|---|---|---|
| GitHub (`RodDiazT/parronaltesoreria`) | Repositorio de documentos y código | Marco general, §10 |
| Railway | Hosting de app, base de datos y volumen | Marco general, §8 |
| Google (OAuth) | Inicio de sesión | Marco general, §8 |
| Anthropic (API de Claude) | Sugerencias de conciliación, v1.1 | Marco general, §8 y §9.4 |

## Componentes aprobados

| Componente | Qué hace | Ruta |
|---|---|---|
| Marco general | Raíz técnica: actores y permisos, modelo de dominio, reglas de negocio, stack, cumplimiento, alcance por versión y plan | `docs/marco-general/marco-general-proyecto.md` |

## Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 1.0 | Creación del archivo de estado | Inicio del proyecto |
| 2026-09-27 | 1.1 | Se registra el marco general aprobado y el stack confirmado | Aprobación del marco general |
