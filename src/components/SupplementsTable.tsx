import { SUPPLEMENTS } from '../content/protocol'

export default function SupplementsTable() {
  return (
    <section className="section" aria-labelledby="supp-h">
      <h2 id="supp-h">Supplements, in plain terms</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th scope="col">Supplement</th>
              <th scope="col">Dose and timing</th>
              <th scope="col">Evidence</th>
            </tr>
          </thead>
          <tbody>
            {SUPPLEMENTS.map((s) => (
              <tr key={s.name}>
                <th scope="row">
                  {s.name}
                  <small>Similar to Flykitt “{s.flykittName}”</small>
                </th>
                <td>
                  {s.dose}, {s.when}
                  <small>{s.note}</small>
                </td>
                <td>
                  <span className={`pill ev-${s.evidence}`}>{s.evidence}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}
