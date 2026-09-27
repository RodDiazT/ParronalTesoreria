"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useRef } from "react";
import { Camera, Upload, X, FileText, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { comprimirImagenRespaldo } from "@/lib/archivos/compresion";

export interface ArchivoSeleccionado {
  id: string;
  file: File;
  previewUrl?: string;
  esPdf: boolean;
  tamanoFormateado: string;
}

interface CapturaRespaldoProps {
  archivos: ArchivoSeleccionado[];
  onChange: (archivos: ArchivoSeleccionado[]) => void;
  maxArchivos?: number;
  deshabilitado?: boolean;
}

export function CapturaRespaldo({
  archivos,
  onChange,
  maxArchivos = 5,
  deshabilitado = false,
}: CapturaRespaldoProps) {
  const [procesando, setProcesando] = useState(false);
  const [errorLocal, setErrorLocal] = useState<string | null>(null);

  const inputCamaraRef = useRef<HTMLInputElement>(null);
  const inputArchivoRef = useRef<HTMLInputElement>(null);

  const formatearBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const procesarArchivos = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setErrorLocal(null);
    setProcesando(true);

    try {
      const nuevos: ArchivoSeleccionado[] = [];

      for (let i = 0; i < fileList.length; i++) {
        if (archivos.length + nuevos.length >= maxArchivos) {
          setErrorLocal(`Máximo ${maxArchivos} archivos permitidos.`);
          break;
        }

        const file = fileList[i];

        // Validar tamaño inicial (máximo 15 MB antes de compresión)
        if (file.size > 15 * 1024 * 1024) {
          setErrorLocal(`El archivo "${file.name}" supera el tamaño máximo de 15 MB.`);
          continue;
        }

        const esPdf = file.type === "application/pdf";
        let archivoFinal = file;

        // Comprimir imagen en el navegador
        if (!esPdf && file.type.startsWith("image/")) {
          archivoFinal = await comprimirImagenRespaldo(file);
        }

        let previewUrl: string | undefined;
        if (!esPdf && archivoFinal.type.startsWith("image/")) {
          previewUrl = URL.createObjectURL(archivoFinal);
        }

        nuevos.push({
          id: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
          file: archivoFinal,
          previewUrl,
          esPdf,
          tamanoFormateado: formatearBytes(archivoFinal.size),
        });
      }

      onChange([...archivos, ...nuevos]);
    } catch (err: any) {
      console.error("Error al procesar archivos:", err);
      setErrorLocal("Ocurrió un error al preparar los archivos de respaldo.");
    } finally {
      setProcesando(false);
      if (inputCamaraRef.current) inputCamaraRef.current.value = "";
      if (inputArchivoRef.current) inputArchivoRef.current.value = "";
    }
  };

  const eliminarArchivo = (id: string) => {
    const item = archivos.find((a) => a.id === id);
    if (item?.previewUrl) {
      URL.revokeObjectURL(item.previewUrl);
    }
    onChange(archivos.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-3">
      {/* Botones de acción táctiles grandes */}
      <div className="grid grid-cols-2 gap-2">
        {/* Tomar foto (abre cámara nativa en móvil) */}
        <input
          ref={inputCamaraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          disabled={deshabilitado || procesando || archivos.length >= maxArchivos}
          onChange={(e) => procesarArchivos(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full flex items-center justify-center gap-2 border-dashed border-2 border-emerald-600/40 hover:bg-emerald-50 text-emerald-800 font-medium"
          disabled={deshabilitado || procesando || archivos.length >= maxArchivos}
          onClick={() => inputCamaraRef.current?.click()}
        >
          <Camera className="w-5 h-5 text-emerald-600" />
          <span>Tomar foto</span>
        </Button>

        {/* Subir archivo / galería */}
        <input
          ref={inputArchivoRef}
          type="file"
          accept="image/jpeg,image/png,application/pdf"
          multiple
          className="hidden"
          disabled={deshabilitado || procesando || archivos.length >= maxArchivos}
          onChange={(e) => procesarArchivos(e.target.files)}
        />
        <Button
          type="button"
          variant="outline"
          className="h-12 w-full flex items-center justify-center gap-2 border-dashed border-2 border-stone-300 hover:bg-stone-50 text-stone-700 font-medium"
          disabled={deshabilitado || procesando || archivos.length >= maxArchivos}
          onClick={() => inputArchivoRef.current?.click()}
        >
          <Upload className="w-5 h-5 text-stone-500" />
          <span>Subir archivo</span>
        </Button>
      </div>

      {procesando && (
        <p className="text-xs text-stone-500 animate-pulse flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-ping" />
          Comprimiendo y optimizando archivo para envío rápido...
        </p>
      )}

      {errorLocal && (
        <div className="flex items-center gap-2 text-xs text-rose-600 bg-rose-50 p-2 rounded border border-rose-200">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{errorLocal}</span>
        </div>
      )}

      {/* Lista de archivos seleccionados */}
      {archivos.length > 0 && (
        <div className="space-y-2 pt-1">
          <p className="text-xs font-semibold text-stone-600 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            {archivos.length} {archivos.length === 1 ? "respaldo preparado" : "respaldos preparados"}:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {archivos.map((a) => (
              <div
                key={a.id}
                className="flex items-center justify-between p-2 bg-white rounded-lg border border-stone-200 shadow-sm"
              >
                <div className="flex items-center gap-2.5 overflow-hidden">
                  {a.esPdf ? (
                    <div className="w-10 h-10 rounded bg-rose-50 border border-rose-200 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-rose-600" />
                    </div>
                  ) : a.previewUrl ? (
                    <img
                      src={a.previewUrl}
                      alt="Vista previa"
                      className="w-10 h-10 rounded object-cover border border-stone-200 shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-stone-100 flex items-center justify-center shrink-0">
                      <Camera className="w-5 h-5 text-stone-400" />
                    </div>
                  )}
                  <div className="truncate">
                    <p className="text-xs font-medium text-stone-900 truncate">{a.file.name}</p>
                    <p className="text-[11px] text-stone-500">{a.tamanoFormateado}</p>
                  </div>
                </div>

                {!deshabilitado && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-8 w-8 p-0 text-stone-400 hover:text-rose-600 hover:bg-rose-50"
                    onClick={() => eliminarArchivo(a.id)}
                    aria-label="Eliminar respaldo"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
