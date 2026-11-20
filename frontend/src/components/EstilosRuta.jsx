import { useLayoutEffect } from "react";
import { useLocation } from "react-router";

const estilosPorRuta = {
  "/": ["IndexStyle.css"],
  "/login": ["auth.css"],
  "/registro": ["auth.css"],
  "/verificar": ["auth.css"],
  "/contacto": ["ContactoStyle.css"],
  "/app": ["AppStyle.css", "AsistenteIA.css"],
  "/admin": ["AdminStyle.css"],
  "/admin/grupo": ["AdminStyle.css"],
  "/notificaciones": ["MemberPages.css", "NotificacionesStyle.css"],
};

const rutasMiembro = [
  "/calendario",
  "/chat",
  "/grupos",
  "/grupo",
  "/grupo-chat",
  "/matches",
  "/perfil",
  "/premium",
  "/sala",
];

function obtenerEstilos(ruta) {
  if (rutasMiembro.includes(ruta)) {
    return ["MemberPages.css", "AsistenteIA.css"];
  }

  return estilosPorRuta[ruta] || ["IndexStyle.css"];
}

function cargarEstilo(archivo) {
  const enlaceExistente = document.querySelector(
    `link[data-estilo-ruta="${archivo}"]`,
  );

  if (enlaceExistente) {
    return Promise.resolve();
  }

  return new Promise((resolver) => {
    const enlace = document.createElement("link");
    enlace.rel = "stylesheet";
    enlace.href = `/css/${archivo}`;
    enlace.dataset.estiloRuta = archivo;
    enlace.onload = resolver;
    enlace.onerror = resolver;
    document.head.append(enlace);
  });
}

export default function EstilosRuta() {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    const archivos = obtenerEstilos(pathname);
    document.body.classList.add("cargando-estilos");

    Promise.all(archivos.map(cargarEstilo)).then(() => {
      document.querySelectorAll("link[data-estilo-ruta]").forEach((enlace) => {
        if (!archivos.includes(enlace.dataset.estiloRuta)) {
          enlace.remove();
        }
      });

      document.body.classList.remove("cargando-estilos");
    });
  }, [pathname]);

  return null;
}
