import { ABOUT } from '../content/protocol'

export default function AboutSection() {
  return (
    <section className="section" aria-labelledby="about-h">
      <h2 id="about-h">{ABOUT.title}</h2>
      {ABOUT.paragraphs.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
    </section>
  )
}
