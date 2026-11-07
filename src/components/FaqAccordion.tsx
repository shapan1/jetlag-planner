import { FAQ } from '../content/protocol'

export default function FaqAccordion() {
  return (
    <section className="section" aria-labelledby="faq-h">
      <h2 id="faq-h">Questions</h2>
      {FAQ.map((f) => (
        <details key={f.q} className="faq">
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </section>
  )
}
