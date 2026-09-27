# Estado del Proyecto — Tesorería Parronal

Última actualización: 2026-09-27

## Resumen

Están aprobados el marco general y los componentes Organización y evento y Acceso y roles; todavía no hay código. Si se ejecutara lo aprobado, el proyecto tendría definidos:

- quién puede hacer qué: dos administradores, ayudantes, observadores y solicitantes;
- el modelo de datos: organización, evento, movimientos, jinetes, caballos, apoderados, clubes, binomios, inscripciones y pagos;
- cómo se calculan saldo de caja, por cobrar, por pagar y por validar;
- el stack técnico y las reglas de cumplimiento de datos personales.

Con Organización y evento, además: el club y el concurso se cargan por script; el administrador edita el nombre y logo del club, las fechas y lugar del evento, y las categorías; administradores y ayudantes crean auspiciadores y proveedores desde el celular al registrar, y el administrador corrige, desactiva y fusiona duplicados. Toda consulta queda aislada por organización y toda referencia entre registros se valida contra la organización. Las fechas del evento son los días del concurso y no restringen la fecha de los movimientos.

Con Acceso y roles, además: cada persona entra con su cuenta de Google (correo verificado) y acepta el aviso de privacidad en su primer ingreso; quien no está aprobado queda como solicitante y no ve ningún dato; el administrador aprueba o rechaza solicitudes (con un contador dentro del portal), invita por correo, cambia roles y revoca accesos, y la organización nunca queda sin administrador. La sesión dura 30 días en el celular, y revocar surte efecto en la siguiente acción. Ayudantes y observadores ven la lista de la comisión sin correos. La matriz de permisos se aplica en el servidor desde una sola tabla.

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
| Aislamiento en código | Función `obtenerContexto`, cliente Prisma extendido `db(ctx)` que agrega `organizacionId` y `exigirDeLaOrganizacion` para validar referencias; ESLint prohíbe el cliente sin extender | Organización y evento, §5.2 |
| Autenticación en código | Adaptador propio de Auth.js sobre `Usuario`, `Account` y `Session`; solo correos verificados por Google; sesión de 30 días renovable | Acceso y roles, §5.2 |
| Permisos en código | Tabla única `src/lib/permisos.ts` con `puede(ctx, accion)` y `exigir(ctx, accion)`, transcripción del marco §2.2 | Acceso y roles, §5.4 |
| Idioma del código | Dominio en español sin tildes; términos técnicos en inglés | Marco general, §8 |
| IA de conciliación (v1.1) | API de Claude, opcional | Marco general, §8 |

## Herramientas, proveedores e integraciones

| Herramienta | Uso | Documento |
|---|---|---|
| GitHub (`RodDiazT/ParronalTesoreria`) | Repositorio de documentos y código | Marco general, §10 |
| Railway | Hosting de app, base de datos y volumen | Marco general, §8 |
| Google (OAuth) | Inicio de sesión, alcances `openid email profile`, pantalla de consentimiento publicada | Marco general, §8; Acceso y roles, §5.7 |
| Anthropic (API de Claude) | Sugerencias de conciliación, v1.1 | Marco general, §8 y §9.4 |

## Componentes aprobados

| Componente | Qué hace | Ruta |
|---|---|---|
| Marco general | Raíz técnica: actores y permisos, modelo de dominio, reglas de negocio, stack, cumplimiento, alcance por versión y plan | `docs/marco-general/marco-general-proyecto.md` |
| Organización y evento | Aislamiento por organización, carga inicial por script, configuración del evento y de la organización (nombre y logo), categorías y contrapartes con fusión de duplicados | `docs/organizacion/organizacion-evento.md` |
| Acceso y roles | Ingreso con Google, aviso de privacidad, solicitudes, invitaciones, roles, revocación con mínimo de un administrador, lista de la comisión y matriz de permisos en el servidor | `docs/acceso/acceso-roles.md` |

## Control de cambios

| Fecha | Versión | Cambio | Motivo |
|---|---|---|---|
| 2026-09-27 | 1.0 | Creación del archivo de estado | Inicio del proyecto |
| 2026-09-27 | 1.1 | Se registra el marco general aprobado y el stack confirmado | Aprobación del marco general |
| 2026-09-27 | 1.2 | Se registra Organización y evento aprobado y el mecanismo de aislamiento en código | Aprobación de Organización y evento |
| 2026-09-27 | 1.3 | Organización y evento v1.1 aprobado: validación de referencias entre organizaciones y fechas del evento informativas | Aprobación de Organización y evento v1.1 |
| 2026-09-27 | 1.4 | Se registra Acceso y roles aprobado, el adaptador de autenticación y la tabla única de permisos | Aprobación de Acceso y roles |
