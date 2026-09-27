"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Rol, EstadoMembresia } from "@prisma/client";
import {
  aprobarSolicitud,
  rechazarSolicitud,
  invitar,
  cambiarRol,
  revocar,
  reactivar,
  suprimirDatosUsuario,
  resumenPendientesDe,
} from "@/dominio/acceso/acciones";
import { ChipEstado } from "@/components/app/estado";
import { formatearFecha } from "@/lib/presentacion/formato";

export interface UsuarioDTO {
  id: string;
  correo: string;
  nombre: string | null;
  imagen: string | null;
  ultimoIngresoEn: Date | null;
}

export interface MembresiaDTO {
  id: string;
  usuarioId: string;
  rol: Rol | null;
  estado: EstadoMembresia;
  mensajeSolicitud: string | null;
  solicitadaEn: Date | null;
  aprobadaEn: Date | null;
  revocadaEn: Date | null;
  motivoRevocacion: string | null;
  version: number;
  usuario: UsuarioDTO;
}

interface GestorUsuariosProps {
  membresias: MembresiaDTO[];
  usuarioActualId: string;
}

export function GestorUsuarios({ membresias, usuarioActualId }: GestorUsuariosProps) {
  const router = useRouter();
  const [pestana, setPestana] = useState<"solicitudes" | "activos" | "sinAcceso">("solicitudes");
  const [isPending, startTransition] = useTransition();
  const [errorModal, setErrorModal] = useState<string | null>(null);

  // Estados de Modales
  const [modalInvitarAbierto, setModalInvitarAbierto] = useState(false);
  const [correoInvitar, setCorreoInvitar] = useState("");
  const [rolInvitar, setRolInvitar] = useState<Rol>("ayudante");

  const [solicitudAprobar, setSolicitudAprobar] = useState<MembresiaDTO | null>(null);
  const [rolAprobar, setRolAprobar] = useState<Rol | "">("");

  const [solicitudRechazar, setSolicitudRechazar] = useState<MembresiaDTO | null>(null);
  const [motivoRechazo, setMotivoRechazo] = useState("");

  const [membresiaCambiarRol, setMembresiaCambiarRol] = useState<MembresiaDTO | null>(null);
  const [rolNuevo, setRolNuevo] = useState<Rol>("ayudante");

  const [membresiaRevocar, setMembresiaRevocar] = useState<MembresiaDTO | null>(null);
  const [motivoRevocacion, setMotivoRevocacion] = useState("");
  const [pendientesRevocar, setPendientesRevocar] = useState<{ porValidar: number; reembolsosPendientes: number; total: number } | null>(null);

  const [membresiaReactivar, setMembresiaReactivar] = useState<MembresiaDTO | null>(null);
  const [rolReactivar, setRolReactivar] = useState<Rol>("ayudante");

  const [membresiaSuprimir, setMembresiaSuprimir] = useState<MembresiaDTO | null>(null);

  // Filtrado de listas
  const solicitudes = membresias.filter((m) => m.estado === "solicitada");
  const activos = membresias.filter((m) => m.estado === "activa");
  const sinAcceso = membresias.filter((m) => m.estado === "revocada");

  const totalActivos = activos.length;
  const superaTopeCinco = totalActivos > 5;

  // Handlers de Acciones
  const handleInvitar = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorModal(null);

    startTransition(async () => {
      try {
        await invitar({ correo: correoInvitar, rol: rolInvitar });
        setModalInvitarAbierto(false);
        setCorreoInvitar("");
        router.refresh();
      } catch (err: any) {
        setErrorModal(err?.message || "Error al enviar la invitación.");
      }
    });
  };

  const handleAprobar = async () => {
    if (!solicitudAprobar || !rolAprobar) return;
    setErrorModal(null);

    startTransition(async () => {
      try {
        await aprobarSolicitud({
          membresiaId: solicitudAprobar.id,
          rol: rolAprobar as Rol,
          version: solicitudAprobar.version,
        });
        setSolicitudAprobar(null);
        router.refresh();
      } catch (err: any) {
        setErrorModal(err?.message || "Error al aprobar la solicitud.");
      }
    });
  };

  const handleRechazar = async () => {
    if (!solicitudRechazar) return;
    setErrorModal(null);

    startTransition(async () => {
      try {
        await rechazarSolicitud({
          membresiaId: solicitudRechazar.id,
          motivo: motivoRechazo || undefined,
          version: solicitudRechazar.version,
        });
        setSolicitudRechazar(null);
        setMotivoRechazo("");
        router.refresh();
      } catch (err: any) {
        setErrorModal(err?.message || "Error al rechazar la solicitud.");
      }
    });
  };

  const handleCambiarRol = async () => {
    if (!membresiaCambiarRol) return;
    setErrorModal(null);

    startTransition(async () => {
      try {
        await cambiarRol({
          membresiaId: membresiaCambiarRol.id,
          rol: rolNuevo,
          version: membresiaCambiarRol.version,
        });
        setMembresiaCambiarRol(null);
        router.refresh();
      } catch (err: any) {
        setErrorModal(err?.message || "Error al cambiar el rol.");
      }
    });
  };

  const abrirModalRevocar = async (mem: MembresiaDTO) => {
    setMembresiaRevocar(mem);
    setMotivoRevocacion("");
    setErrorModal(null);
    setPendientesRevocar(null);

    try {
      const res = await resumenPendientesDe(mem.usuarioId);
      setPendientesRevocar(res);
    } catch {
      // Si falla o no hay pendientes, ignorar
    }
  };

  const handleRevocar = async () => {
    if (!membresiaRevocar || !motivoRevocacion.trim()) return;
    setErrorModal(null);

    startTransition(async () => {
      try {
        await revocar({
          membresiaId: membresiaRevocar.id,
          motivo: motivoRevocacion,
          version: membresiaRevocar.version,
        });
        setMembresiaRevocar(null);
        setMotivoRevocacion("");
        router.refresh();
      } catch (err: any) {
        setErrorModal(err?.message || "Error al revocar el acceso.");
      }
    });
  };

  const handleReactivar = async () => {
    if (!membresiaReactivar) return;
    setErrorModal(null);

    startTransition(async () => {
      try {
        await reactivar({
          membresiaId: membresiaReactivar.id,
          rol: rolReactivar,
          version: membresiaReactivar.version,
        });
        setMembresiaReactivar(null);
        router.refresh();
      } catch (err: any) {
        setErrorModal(err?.message || "Error al reactivar el acceso.");
      }
    });
  };

  const handleSuprimir = async () => {
    if (!membresiaSuprimir) return;
    setErrorModal(null);

    startTransition(async () => {
      try {
        await suprimirDatosUsuario({
          membresiaId: membresiaSuprimir.id,
        });
        setMembresiaSuprimir(null);
        router.refresh();
      } catch (err: any) {
        setErrorModal(err?.message || "Error al suprimir los datos.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Aviso de tope de 5 usuarios no bloqueante (§3.5) */}
      {superaTopeCinco && (
        <div className="rounded-xl border border-falta-fondo bg-falta-fondo/30 p-3.5 text-xs text-falta-texto font-medium flex items-center gap-2">
          <span>⚠️</span>
          <span>
            Hay {totalActivos} personas con acceso activo. El portal está pensado y optimizado para una escala de 5 usuarios.
          </span>
        </div>
      )}

      {/* Barra de acción: Invitar usuario */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs text-texto-suave">Accesos activos: </span>
          <span className="text-xs font-bold text-texto">{totalActivos}</span>
        </div>
        <button
          type="button"
          onClick={() => {
            setModalInvitarAbierto(true);
            setErrorModal(null);
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-acento px-3.5 py-2 text-xs font-semibold text-sobre-acento hover:opacity-95 cursor-pointer shadow-sm transition-opacity"
        >
          <span>+ Invitar por correo</span>
        </button>
      </div>

      {/* Pestañas de Navegación */}
      <div className="flex border-b border-borde">
        <button
          type="button"
          onClick={() => setPestana("solicitudes")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium cursor-pointer transition-colors ${
            pestana === "solicitudes"
              ? "border-acento text-acento font-semibold"
              : "border-transparent text-texto-suave hover:text-texto"
          }`}
        >
          <span>Solicitudes</span>
          {solicitudes.length > 0 && (
            <span className="rounded-full bg-falta-fondo px-1.5 py-0.2 text-[10px] font-bold text-falta-texto">
              {solicitudes.length}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setPestana("activos")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium cursor-pointer transition-colors ${
            pestana === "activos"
              ? "border-acento text-acento font-semibold"
              : "border-transparent text-texto-suave hover:text-texto"
          }`}
        >
          <span>Con acceso</span>
          <span className="rounded-full bg-superficie px-1.5 py-0.2 text-[10px] font-bold text-texto-suave">
            {activos.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setPestana("sinAcceso")}
          className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-xs font-medium cursor-pointer transition-colors ${
            pestana === "sinAcceso"
              ? "border-acento text-acento font-semibold"
              : "border-transparent text-texto-suave hover:text-texto"
          }`}
        >
          <span>Sin acceso</span>
          {sinAcceso.length > 0 && (
            <span className="rounded-full bg-fuera-fondo px-1.5 py-0.2 text-[10px] font-bold text-fuera-texto">
              {sinAcceso.length}
            </span>
          )}
        </button>
      </div>

      {/* PESTAÑA 1: SOLICITUDES PENDIENTES */}
      {pestana === "solicitudes" && (
        <div className="space-y-3">
          {solicitudes.length === 0 ? (
            <div className="rounded-2xl border border-borde bg-superficie p-8 text-center text-xs text-texto-suave">
              No hay solicitudes de acceso pendientes.
            </div>
          ) : (
            solicitudes.map((s) => (
              <div
                key={s.id}
                className="rounded-2xl border border-borde bg-superficie p-4 space-y-3 shadow-xs"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    {s.usuario.imagen ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={s.usuario.imagen}
                        alt=""
                        className="h-10 w-10 rounded-full border border-borde object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-superficie border border-borde text-texto font-bold text-xs">
                        {s.usuario.nombre?.[0] || s.usuario.correo[0].toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 className="text-sm font-semibold text-texto">
                        {s.usuario.nombre || "Usuario sin nombre"}
                      </h3>
                      <p className="text-xs text-texto-suave font-mono">
                        {s.usuario.correo}
                      </p>
                    </div>
                  </div>
                  <ChipEstado tono="falta" texto="Pendiente" />
                </div>

                {s.mensajeSolicitud && (
                  <div className="rounded-xl border border-borde bg-fondo p-3 text-xs text-texto-suave italic">
                    &ldquo;{s.mensajeSolicitud}&rdquo;
                  </div>
                )}

                <div className="flex items-center justify-between text-[11px] text-texto-suave pt-1 border-t border-borde">
                  <span>
                    Solicitada el {formatearFecha(s.solicitadaEn, "larga")}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSolicitudRechazar(s);
                        setMotivoRechazo("");
                        setErrorModal(null);
                      }}
                      className="rounded-lg border border-borde bg-fondo px-2.5 py-1 text-xs font-medium text-gasto hover:bg-problema-fondo/20 transition-colors cursor-pointer"
                    >
                      Rechazar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setSolicitudAprobar(s);
                        setRolAprobar("");
                        setErrorModal(null);
                      }}
                      className="rounded-lg bg-acento px-3 py-1 text-xs font-semibold text-sobre-acento hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      Aprobar
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* PESTAÑA 2: CON ACCESO (MIEMBROS ACTIVOS E INVITADOS) */}
      {pestana === "activos" && (
        <div className="space-y-3">
          {activos.length === 0 ? (
            <div className="rounded-2xl border border-borde bg-superficie p-8 text-center text-xs text-texto-suave">
              No hay miembros con acceso activo.
            </div>
          ) : (
            activos.map((m) => {
              const nuncaIngreso = m.usuario.ultimoIngresoEn === null;
              const esPropio = m.usuarioId === usuarioActualId;

              return (
                <div
                  key={m.id}
                  className="rounded-2xl border border-borde bg-superficie p-4 space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      {m.usuario.imagen ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={m.usuario.imagen}
                          alt=""
                          className="h-10 w-10 rounded-full border border-borde object-cover"
                        />
                      ) : (
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-superficie border border-borde text-texto font-bold text-xs">
                          {m.usuario.nombre?.[0] || m.usuario.correo[0].toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold text-texto">
                            {m.usuario.nombre || "Usuario invitado"}
                          </h3>
                          {esPropio && (
                            <span className="rounded bg-fondo border border-borde px-1.5 py-0.2 text-[10px] font-bold text-texto-suave">
                              Tú
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-texto-suave font-mono">
                          {m.usuario.correo}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      <ChipEstado
                        tono={
                          m.rol === "administrador"
                            ? "listo"
                            : m.rol === "ayudante"
                            ? "falta"
                            : "fuera"
                        }
                        texto={
                          m.rol === "administrador"
                            ? "Administrador"
                            : m.rol === "ayudante"
                            ? "Ayudante"
                            : "Observador"
                        }
                      />
                      {nuncaIngreso && (
                        <span className="text-[10px] text-falta-texto font-medium">
                          Invitado, sin ingreso
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-texto-suave pt-1 border-t border-borde">
                    <span>
                      {nuncaIngreso
                        ? `Invitado el ${formatearFecha(m.aprobadaEn, "larga")}`
                        : `Último ingreso: ${formatearFecha(m.usuario.ultimoIngresoEn, "corta")}`}
                    </span>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMembresiaCambiarRol(m);
                          setRolNuevo(m.rol ?? "ayudante");
                          setErrorModal(null);
                        }}
                        className="rounded-lg border border-borde bg-fondo px-2.5 py-1 text-xs font-medium text-texto hover:bg-superficie transition-colors cursor-pointer"
                      >
                        Cambiar rol
                      </button>
                      <button
                        type="button"
                        onClick={() => abrirModalRevocar(m)}
                        className="rounded-lg border border-problema-fondo bg-problema-fondo/20 px-2.5 py-1 text-xs font-medium text-problema-texto hover:bg-problema-fondo/40 transition-colors cursor-pointer"
                      >
                        Revocar
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* PESTAÑA 3: SIN ACCESO (REVOCADOS Y RECHAZADOS) */}
      {pestana === "sinAcceso" && (
        <div className="space-y-3">
          {sinAcceso.length === 0 ? (
            <div className="rounded-2xl border border-borde bg-superficie p-8 text-center text-xs text-texto-suave">
              No hay usuarios rechazados o revocados.
            </div>
          ) : (
            sinAcceso.map((m) => {
              const fueRechazo = m.aprobadaEn === null;
              const correoSuprimido = m.usuario.correo.startsWith("suprimido-");

              return (
                <div
                  key={m.id}
                  className="rounded-2xl border border-borde bg-superficie p-4 space-y-3 opacity-90 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-texto">
                        {m.usuario.nombre || "Usuario"}
                      </h3>
                      <p className="text-xs text-texto-suave font-mono">
                        {correoSuprimido ? "(Datos suprimidos conforme a ley)" : m.usuario.correo}
                      </p>
                    </div>
                    <ChipEstado
                      tono="fuera"
                      texto={fueRechazo ? "Rechazada" : "Revocado"}
                    />
                  </div>

                  {m.motivoRevocacion && (
                    <div className="rounded-xl border border-borde bg-fondo p-2.5 text-xs text-texto-suave">
                      <span className="font-semibold text-texto">Motivo interno: </span>
                      {m.motivoRevocacion}
                    </div>
                  )}

                  <div className="flex items-center justify-between text-[11px] text-texto-suave pt-1 border-t border-borde">
                    <span>
                      {fueRechazo
                        ? `Rechazado el ${formatearFecha(m.revocadaEn, "larga")}`
                        : `Revocado el ${formatearFecha(m.revocadaEn, "larga")}`}
                    </span>

                    <div className="flex items-center gap-2">
                      {!correoSuprimido && (
                        <button
                          type="button"
                          onClick={() => {
                            setMembresiaSuprimir(m);
                            setErrorModal(null);
                          }}
                          className="rounded-lg border border-borde bg-fondo px-2.5 py-1 text-xs font-medium text-texto-suave hover:text-gasto transition-colors cursor-pointer"
                        >
                          Suprimir datos
                        </button>
                      )}
                      {!correoSuprimido && (
                        <button
                          type="button"
                          onClick={() => {
                            setMembresiaReactivar(m);
                            setRolReactivar("ayudante");
                            setErrorModal(null);
                          }}
                          className="rounded-lg bg-acento px-3 py-1 text-xs font-semibold text-sobre-acento hover:opacity-90 transition-opacity cursor-pointer"
                        >
                          Reactivar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ====================================================================== */}
      {/* MODALES Y DIÁLOGOS DE CONFIRMACIÓN */}
      {/* ====================================================================== */}

      {/* Modal 1: Invitar por correo */}
      {modalInvitarAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-borde bg-superficie p-6 shadow-lg">
            <h2 className="text-base font-bold text-texto mb-1">
              Invitar usuario por correo
            </h2>
            <p className="text-xs text-texto-suave mb-4">
              La persona podrá entrar directamente con su cuenta de Google y se le asignará el rol elegido.
            </p>

            {errorModal && (
              <div className="mb-4 rounded-xl border border-problema-fondo bg-problema-fondo/40 p-2.5 text-xs text-problema-texto font-medium">
                {errorModal}
              </div>
            )}

            <form onSubmit={handleInvitar} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-texto mb-1">
                  Correo de Google
                </label>
                <input
                  type="email"
                  required
                  placeholder="ejemplo@gmail.com"
                  value={correoInvitar}
                  onChange={(e) => setCorreoInvitar(e.target.value)}
                  className="w-full rounded-xl border border-borde bg-fondo px-3 py-2 text-xs text-texto placeholder:text-texto-suave/50 focus:outline-none focus:ring-1 focus:ring-acento"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-texto mb-1">
                  Rol asignado
                </label>
                <select
                  value={rolInvitar}
                  onChange={(e) => setRolInvitar(e.target.value as Rol)}
                  className="w-full rounded-xl border border-borde bg-fondo px-3 py-2 text-xs text-texto focus:outline-none focus:ring-1 focus:ring-acento"
                >
                  <option value="ayudante">Ayudante (registro y operaciones)</option>
                  <option value="administrador">Administrador (control total)</option>
                  <option value="observador">Observador (solo lectura)</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setModalInvitarAbierto(false)}
                  className="rounded-xl border border-borde px-3 py-2 text-xs font-medium text-texto hover:bg-fondo"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-acento px-4 py-2 text-xs font-semibold text-sobre-acento hover:opacity-95 disabled:opacity-50"
                >
                  {isPending ? "Invitando…" : "Invitar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Aprobar Solicitud */}
      {solicitudAprobar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-borde bg-superficie p-6 shadow-lg">
            <h2 className="text-base font-bold text-texto mb-1">
              Aprobar solicitud de acceso
            </h2>
            <p className="text-xs text-texto-suave mb-4">
              Para {solicitudAprobar.usuario.nombre || solicitudAprobar.usuario.correo}.
              Elige el rol con el que ingresará.
            </p>

            {errorModal && (
              <div className="mb-4 rounded-xl border border-problema-fondo bg-problema-fondo/40 p-2.5 text-xs text-problema-texto font-medium">
                {errorModal}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-texto mb-1">
                  Rol (obligatorio, sin preselección)
                </label>
                <select
                  value={rolAprobar}
                  onChange={(e) => setRolAprobar(e.target.value as Rol)}
                  className="w-full rounded-xl border border-borde bg-fondo px-3 py-2 text-xs text-texto focus:outline-none focus:ring-1 focus:ring-acento"
                >
                  <option value="">Selecciona un rol…</option>
                  <option value="ayudante">Ayudante</option>
                  <option value="administrador">Administrador</option>
                  <option value="observador">Observador</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSolicitudAprobar(null)}
                  className="rounded-xl border border-borde px-3 py-2 text-xs font-medium text-texto hover:bg-fondo"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!rolAprobar || isPending}
                  onClick={handleAprobar}
                  className="rounded-xl bg-acento px-4 py-2 text-xs font-semibold text-sobre-acento hover:opacity-95 disabled:opacity-40"
                >
                  {isPending ? "Aprobando…" : "Confirmar aprobación"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 3: Rechazar Solicitud */}
      {solicitudRechazar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-borde bg-superficie p-6 shadow-lg">
            <h2 className="text-base font-bold text-texto mb-1">
              Rechazar solicitud
            </h2>
            <p className="text-xs text-texto-suave mb-4">
              El solicitante verá solo &ldquo;No tienes acceso&rdquo;. El motivo es una nota interna que solo ven los administradores.
            </p>

            {errorModal && (
              <div className="mb-4 rounded-xl border border-problema-fondo bg-problema-fondo/40 p-2.5 text-xs text-problema-texto font-medium">
                {errorModal}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-texto mb-1">
                  Motivo interno (opcional)
                </label>
                <textarea
                  rows={2}
                  placeholder="Nota interna de la comisión…"
                  value={motivoRechazo}
                  onChange={(e) => setMotivoRechazo(e.target.value)}
                  className="w-full rounded-xl border border-borde bg-fondo p-2.5 text-xs text-texto focus:outline-none focus:ring-1 focus:ring-acento resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setSolicitudRechazar(null)}
                  className="rounded-xl border border-borde px-3 py-2 text-xs font-medium text-texto hover:bg-fondo"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleRechazar}
                  className="rounded-xl bg-gasto px-4 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                >
                  {isPending ? "Rechazando…" : "Rechazar solicitud"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 4: Cambiar Rol */}
      {membresiaCambiarRol && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-borde bg-superficie p-6 shadow-lg">
            <h2 className="text-base font-bold text-texto mb-1">
              Cambiar rol de usuario
            </h2>
            <p className="text-xs text-texto-suave mb-3">
              Para {membresiaCambiarRol.usuario.nombre || membresiaCambiarRol.usuario.correo}.
            </p>

            {membresiaCambiarRol.usuarioId === usuarioActualId && rolNuevo !== "administrador" && (
              <div className="mb-4 rounded-xl border border-problema-fondo bg-problema-fondo/30 p-2.5 text-xs text-problema-texto font-medium">
                ⚠️ Atención: Te quitarás el rol de Administrador. Perderás el acceso a Usuarios y Configuración de inmediato.
              </div>
            )}

            {errorModal && (
              <div className="mb-4 rounded-xl border border-problema-fondo bg-problema-fondo/40 p-2.5 text-xs text-problema-texto font-medium">
                {errorModal}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-texto mb-1">
                  Nuevo rol
                </label>
                <select
                  value={rolNuevo}
                  onChange={(e) => setRolNuevo(e.target.value as Rol)}
                  className="w-full rounded-xl border border-borde bg-fondo px-3 py-2 text-xs text-texto focus:outline-none focus:ring-1 focus:ring-acento"
                >
                  <option value="ayudante">Ayudante</option>
                  <option value="administrador">Administrador</option>
                  <option value="observador">Observador</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMembresiaCambiarRol(null)}
                  className="rounded-xl border border-borde px-3 py-2 text-xs font-medium text-texto hover:bg-fondo"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleCambiarRol}
                  className="rounded-xl bg-acento px-4 py-2 text-xs font-semibold text-sobre-acento hover:opacity-95 disabled:opacity-50"
                >
                  {isPending ? "Guardando…" : "Guardar cambio"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 5: Revocar Acceso */}
      {membresiaRevocar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-borde bg-superficie p-6 shadow-lg">
            <h2 className="text-base font-bold text-texto mb-1">
              Revocar acceso
            </h2>
            <p className="text-xs text-texto-suave mb-3">
              Se cerrarán de inmediato todas las sesiones activas de{" "}
              {membresiaRevocar.usuario.nombre || membresiaRevocar.usuario.correo}.
            </p>

            {/* Advertencia de pendientes según §3.5 */}
            {pendientesRevocar && pendientesRevocar.total > 0 && (
              <div className="mb-4 rounded-xl border border-falta-fondo bg-falta-fondo/30 p-2.5 text-xs text-falta-texto font-medium space-y-1">
                <p className="font-bold">Registros abiertos por esta persona:</p>
                {pendientesRevocar.porValidar > 0 && (
                  <p>• {pendientesRevocar.porValidar} movimientos por validar u observados.</p>
                )}
                {pendientesRevocar.reembolsosPendientes > 0 && (
                  <p>• {pendientesRevocar.reembolsosPendientes} gastos pendientes de reembolso.</p>
                )}
                <p className="text-[11px] opacity-80 pt-1">
                  Se conservan en el sistema para que los administradores los gestionen.
                </p>
              </div>
            )}

            {errorModal && (
              <div className="mb-4 rounded-xl border border-problema-fondo bg-problema-fondo/40 p-2.5 text-xs text-problema-texto font-medium">
                {errorModal}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-texto mb-1">
                  Motivo de revocación (obligatorio)
                </label>
                <textarea
                  rows={2}
                  required
                  placeholder="Ej: Término de labores en la comisión…"
                  value={motivoRevocacion}
                  onChange={(e) => setMotivoRevocacion(e.target.value)}
                  className="w-full rounded-xl border border-borde bg-fondo p-2.5 text-xs text-texto focus:outline-none focus:ring-1 focus:ring-acento resize-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMembresiaRevocar(null)}
                  className="rounded-xl border border-borde px-3 py-2 text-xs font-medium text-texto hover:bg-fondo"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={!motivoRevocacion.trim() || isPending}
                  onClick={handleRevocar}
                  className="rounded-xl bg-gasto px-4 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
                >
                  {isPending ? "Revocando…" : "Confirmar revocación"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 6: Reactivar Acceso */}
      {membresiaReactivar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-borde bg-superficie p-6 shadow-lg">
            <h2 className="text-base font-bold text-texto mb-1">
              Reactivar acceso
            </h2>
            <p className="text-xs text-texto-suave mb-4">
              Para {membresiaReactivar.usuario.nombre || membresiaReactivar.usuario.correo}.
              Elige el rol con el que volverá a ingresar.
            </p>

            {errorModal && (
              <div className="mb-4 rounded-xl border border-problema-fondo bg-problema-fondo/40 p-2.5 text-xs text-problema-texto font-medium">
                {errorModal}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-texto mb-1">
                  Rol asignado
                </label>
                <select
                  value={rolReactivar}
                  onChange={(e) => setRolReactivar(e.target.value as Rol)}
                  className="w-full rounded-xl border border-borde bg-fondo px-3 py-2 text-xs text-texto focus:outline-none focus:ring-1 focus:ring-acento"
                >
                  <option value="ayudante">Ayudante</option>
                  <option value="administrador">Administrador</option>
                  <option value="observador">Observador</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setMembresiaReactivar(null)}
                  className="rounded-xl border border-borde px-3 py-2 text-xs font-medium text-texto hover:bg-fondo"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={isPending}
                  onClick={handleReactivar}
                  className="rounded-xl bg-acento px-4 py-2 text-xs font-semibold text-sobre-acento hover:opacity-95 disabled:opacity-50"
                >
                  {isPending ? "Reactivando…" : "Reactivar acceso"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal 7: Suprimir Datos Personales (Ley 19.628 / 21.719) */}
      {membresiaSuprimir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-borde bg-superficie p-6 shadow-lg">
            <h2 className="text-base font-bold text-texto mb-1">
              Suprimir datos personales
            </h2>
            <p className="text-xs text-texto-suave mb-3">
              Conforme a la Ley 19.628 y Ley 21.719 de protección de datos personales.
            </p>

            <div className="mb-4 rounded-xl border border-borde bg-fondo p-3 text-xs text-texto-suave space-y-2">
              <p>• Se anonimizará el correo reemplazándolo por un identificador anónimo.</p>
              <p>• Se borrará su imagen de perfil y cuentas vinculadas.</p>
              <p>• Se conservará el nombre para la trazabilidad histórica de los movimientos contables registrados o validados.</p>
              <p>• Esta acción es irreversible.</p>
            </div>

            {errorModal && (
              <div className="mb-4 rounded-xl border border-problema-fondo bg-problema-fondo/40 p-2.5 text-xs text-problema-texto font-medium">
                {errorModal}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMembresiaSuprimir(null)}
                className="rounded-xl border border-borde px-3 py-2 text-xs font-medium text-texto hover:bg-fondo"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isPending}
                onClick={handleSuprimir}
                className="rounded-xl bg-gasto px-4 py-2 text-xs font-semibold text-white hover:opacity-95 disabled:opacity-50"
              >
                {isPending ? "Suprimiendo…" : "Confirmar supresión"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
