import { useEffect } from "react";

export default function EstiloPagina({ archivos }) {
  const clave = archivos.join("|");

  useEffect(() => {
    const enlaces = archivos.map((archivo) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `/css/${archivo}`;
      document.head.append(link);
      return link;
    });

    return () => enlaces.forEach((link) => link.remove());
  }, [clave]);

  return null;
}
