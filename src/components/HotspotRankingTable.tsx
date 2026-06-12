import type { AccidentHotspot } from '../types/accident';
import type { Translation } from '../i18n';
import { getGoogleMapsUrl } from '../utils/accidents';

export function HotspotRankingTable({
  hotspots,
  t,
}: {
  hotspots: AccidentHotspot[];
  t: Translation;
}) {
  return (
    <section className="chart-block hotspot-table-block">
      <h3>{t.topHotspots}</h3>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{t.location}</th>
              <th>{t.district}</th>
              <th>{t.total}</th>
              <th>A1</th>
              <th>A2</th>
            </tr>
          </thead>
          <tbody>
            {hotspots.slice(0, 10).map((hotspot) => (
              <tr key={hotspot.id}>
                <td>
                  <a
                    href={getGoogleMapsUrl(hotspot.latitude, hotspot.longitude)}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {hotspot.location}
                  </a>
                </td>
                <td>{hotspot.district ?? '-'}</td>
                <td>{hotspot.totalCount.toLocaleString()}</td>
                <td>{hotspot.a1Count.toLocaleString()}</td>
                <td>{hotspot.a2Count.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
