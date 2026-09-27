import { obtenerContexto, db } from "@/lib/contexto";
import { Estructura } from "@/components/app/estructura";
import { itemsMenu } from "@/lib/presentacion/menu";
import { formatearFecha } from "@/lib/presentacion/formato";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await obtenerContexto();

  // Consulta de datos de la organización para nombre y logo
  const organizacion = await db(ctx).organizacion.findUnique({
    where: { id: ctx.organizacionId },
    select: {
      nombre: true,
      logoRuta: true,
    },
  });

  // Contadores de usuario para el menú y el punto en el encabezado
  let solicitudesPendientes = 0;
  let porValidar = 0;
  let misObservados = 0;

  if (ctx.rol === "administrador") {
    solicitudesPendientes = await db(ctx).membresia.count({
      where: { estado: "solicitada" },
    });
    porValidar = await db(ctx).movimiento.count({
      where: { estadoValidacion: "por_validar" },
    });
  } else if (ctx.rol === "ayudante") {
    misObservados = await db(ctx).movimiento.count({
      where: {
        estadoValidacion: "observado",
        registradoPorId: ctx.usuario.id,
      },
    });
  }

  const totalPendientes = solicitudesPendientes + porValidar + misObservados;

  const gruposMenu = itemsMenu(ctx, {
    porValidar,
    usuariosSolicitudes: solicitudesPendientes,
    misObservados,
    total: totalPendientes,
  });

  return (
    <Estructura
      nombreOrganizacion={organizacion?.nombre || "Club Parronal"}
      nombreEvento={ctx.evento?.nombre || "Concurso Ecuestre"}
      fechaEvento={ctx.evento ? formatearFecha(ctx.evento.fechaInicio, "corta") : ""}
      tieneLogo={Boolean(organizacion?.logoRuta)}
      usuarioNombre={ctx.usuario.nombre || ctx.usuario.correo}
      usuarioRol={ctx.rol}
      totalPendientes={totalPendientes}
      gruposMenu={gruposMenu}
    >
      {children}
    </Estructura>
  );
}
