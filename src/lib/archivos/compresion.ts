/**
 * Utilidad de compresión de imágenes en el cliente mediante HTML5 Canvas.
 * Cumple con docs/movimientos/movimientos.md §3.1 y §5.5:
 * - Reducción a máx. 1600 px en el lado mayor.
 * - Formato JPEG con calidad 0.8.
 * - Descarte de metadatos EXIF (geolocalización y datos del dispositivo) para privacidad.
 * - Archivos PDF no se comprimen.
 */

export async function comprimirImagenRespaldo(archivo: File): Promise<File> {
  // Si es un documento PDF, pasa directo sin compresión
  if (archivo.type === "application/pdf") {
    return archivo;
  }

  // Si no es una imagen reconocible por el navegador, se devuelve tal cual para validación en servidor
  if (!archivo.type.startsWith("image/")) {
    return archivo;
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(archivo);

    img.onload = () => {
      URL.revokeObjectURL(url);

      const maxLado = 1600;
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      if (width > maxLado || height > maxLado) {
        if (width > height) {
          height = Math.round((height * maxLado) / width);
          width = maxLado;
        } else {
          width = Math.round((width * maxLado) / height);
          height = maxLado;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        // En caso de fallo con canvas, devolvemos el archivo original
        resolve(archivo);
        return;
      }

      // Dibujar imagen (esto automáticamente elimina metadatos EXIF al generar nuevos píxeles)
      ctx.drawImage(img, 0, 0, width, height);

      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(archivo);
            return;
          }

          // Generar nombre terminado en .jpg
          const nombreBase = archivo.name.replace(/\.[^/.]+$/, "");
          const archivoComprimido = new File([blob], `${nombreBase}.jpg`, {
            type: "image/jpeg",
            lastModified: Date.now(),
          });

          // Si por alguna razón comprimido quedó más grande que el original, devolvemos el original
          if (archivoComprimido.size > archivo.size && archivo.type === "image/jpeg") {
            resolve(archivo);
          } else {
            resolve(archivoComprimido);
          }
        },
        "image/jpeg",
        0.8
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(archivo);
    };

    img.src = url;
  });
}
