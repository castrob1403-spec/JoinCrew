import EncabezadoUsuario from "../components/EncabezadoUsuario";
import { useUsuario } from "../components/Usuario";
import EstiloPagina from "../components/EstiloPagina";

export default function Premium() {
  const { user } = useUsuario();
  if (!user)
    return (
      <>
        <EstiloPagina archivos={["MemberPages.css"]} />
        <main className="pagina">
          <p>Cargando…</p>
        </main>
      </>
    );
  return (
    <>
      <EstiloPagina archivos={["MemberPages.css"]} />
      <EncabezadoUsuario user={user} />
      <main className="pagina">
        <p className="etiqueta">JOINCREW PREMIUM</p>
        <h1 className="titulo-pagina">Más enfoque para tu estudio</h1>
        <p className="subtitulo">
          El match, las salas públicas y los grupos pequeños siempre son
          gratuitos.
        </p>
        <section className="planes">
          <article className="plan">
            <p className="etiqueta">FREE</p>
            <h2>Gratis</h2>
            <div className="precio">$0</div>
            <ul>
              <li>Matches</li>
              <li>Salas públicas</li>
              <li>Perfil académico</li>
            </ul>
            <span className="secundario">Plan actual</span>
          </article>
          <article className="plan destacado">
            <p className="etiqueta">PREMIUM</p>
            <h2>Potencia tu ritmo</h2>
            <div className="precio">$4.99/mes</div>
            <ul>
              <li>Salas privadas grandes</li>
              <li>Planificador y hábitos</li>
              <li>Filtros avanzados</li>
              <li>Estadísticas de grupo</li>
            </ul>
            <button
              className="principal"
              type="button"
              onClick={() =>
                window.alert("Próximamente podrás activar Premium.")
              }
            >
              Quiero Premium
            </button>
          </article>
        </section>
      </main>
    </>
  );
}
