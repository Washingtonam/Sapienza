export function App() {
  return (
    <main className="page-shell">
      <nav><strong>SAPIENZA</strong><span>Catholic School</span><button>Sign in</button></nav>
      <section className="hero">
        <p className="eyebrow">Forming minds. Shaping character.</p>
        <h1>Learn with purpose.<br /><em>Live with faith.</em></h1>
        <p className="intro">A connected school community for students, families, teachers, and alumni.</p>
        <div className="actions"><button className="primary">Explore Sapienza</button><button className="text-button">Admissions <span>↗</span></button></div>
      </section>
      <section className="portal-strip"><div><small>PORTALS</small><h2>Everything your school day needs.</h2></div><div className="portal-links"><a>Student portal <span>→</span></a><a>Staff portal <span>→</span></a><a>Family resources <span>→</span></a></div></section>
    </main>
  );
}
