import type { UniversityMapPin } from "./map-pins";

export interface UniversityPinCluster {
  /** Stable across renders: derived from the grid cell, not from array order. */
  id: string;
  /** Mean position of the members — where the cluster marker sits. */
  latitude: number;
  longitude: number;
  members: UniversityMapPin[];
}

/**
 * Groups university pins that would land on top of each other into single markers.
 *
 * The map plots real stored coordinates, and universities genuinely cluster: a metro area
 * like Boston or London carries a dozen institutions inside a fraction of a degree, which
 * at country zoom is a few pixels. Rendered individually they stack into one indistinct
 * blob where only the last-painted pin is hoverable and the rest are unreachable — the
 * others are drawn but effectively invisible and unclickable.
 *
 * Grid-snapping rather than a distance-based algorithm (DBSCAN and friends): it is
 * deterministic, order-independent, runs in one pass, and the boundary artefact it can
 * produce — two pins either side of a cell edge staying separate — is harmless here,
 * because a cluster of one renders exactly like an ordinary pin.
 *
 * `precision` is in degrees. The default merges a metro area while keeping genuinely
 * distinct cities apart.
 */
export function clusterUniversityPins(
  pins: UniversityMapPin[],
  precision = 0.3,
): UniversityPinCluster[] {
  if (precision <= 0) throw new Error("precision must be greater than 0");

  const cells = new Map<string, UniversityMapPin[]>();
  for (const pin of pins) {
    const row = Math.round(pin.latitude / precision);
    const col = Math.round(pin.longitude / precision);
    const key = `${row}:${col}`;
    const bucket = cells.get(key);
    if (bucket) bucket.push(pin);
    else cells.set(key, [pin]);
  }

  return Array.from(cells, ([id, members]) => ({
    id,
    latitude: members.reduce((sum, m) => sum + m.latitude, 0) / members.length,
    longitude: members.reduce((sum, m) => sum + m.longitude, 0) / members.length,
    members,
  }));
}

/**
 * Positions for a cluster's members once it is opened, fanned around the cluster centre so
 * each one becomes individually hoverable and clickable. Returned in SVG units relative to
 * the cluster marker, which is already geo-positioned — so this never has to know about
 * the projection.
 *
 * Radius grows with member count so a large cluster doesn't fan into an overlapping ring,
 * which would reintroduce the problem this is solving.
 */
export function fanOutOffsets(count: number): Array<{ x: number; y: number }> {
  if (count <= 1) return [{ x: 0, y: 0 }];
  const radius = Math.max(14, Math.min(34, 4.6 * count));
  return Array.from({ length: count }, (_, i) => {
    // Start at the top and go clockwise; -90° puts the first member above the centre
    // rather than to its right, which reads as a deliberate opening rather than a drift.
    const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
    return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
  });
}
