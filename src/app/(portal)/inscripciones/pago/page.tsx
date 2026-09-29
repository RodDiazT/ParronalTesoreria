import { redirect } from "next/navigation";

export const metadata = {
  title: "Registrar Pago · Tesorería",
  description: "Redirigiendo a registro unificado de movimientos...",
};

export default async function PagoInscripcionPage({
  searchParams,
}: {
  searchParams: Promise<{ binomioId?: string; jineteId?: string; clubId?: string }>;
}) {
  const params = await searchParams;
  const sp = new URLSearchParams();
  sp.set("tipo", "ingreso");
  sp.set("categoria", "inscripciones");
  if (params.binomioId) sp.set("binomioId", params.binomioId);
  if (params.jineteId) sp.set("jineteId", params.jineteId);
  if (params.clubId) sp.set("clubId", params.clubId);

  redirect(`/movimientos/nuevo?${sp.toString()}`);
}
