/**
 * Utility for validating geographic coordinates and polygon structures
 * used by Leaflet / React-Leaflet components.
 * 
 * Prevents Leaflet runtime error: "Error: latlngs not passed"
 * which occurs when <Polygon positions={...}> or polygon.getCenter()
 * is called with empty, null, undefined, or malformed coordinate arrays.
 */

/**
 * Checks whether an item represents a valid [latitude, longitude] pair
 * or a { lat, lng } coordinate object with finite numeric values.
 */
export function isValidPoint(p: any): boolean {
  if (!p) return false;
  if (Array.isArray(p)) {
    return (
      p.length >= 2 &&
      typeof p[0] === 'number' &&
      !isNaN(p[0]) &&
      isFinite(p[0]) &&
      typeof p[1] === 'number' &&
      !isNaN(p[1]) &&
      isFinite(p[1])
    );
  }
  if (typeof p === 'object') {
    const lat = p.lat ?? p.latitude;
    const lng = p.lng ?? p.lon ?? p.longitude;
    return (
      typeof lat === 'number' &&
      !isNaN(lat) &&
      isFinite(lat) &&
      typeof lng === 'number' &&
      !isNaN(lng) &&
      isFinite(lng)
    );
  }
  return false;
}

/**
 * Validates whether coordinates passed to Leaflet <Polygon> are non-empty
 * and structurally sound.
 * 
 * A valid Leaflet polygon ring requires at least 3 distinct coordinate pairs.
 * If coords is null, undefined, [], [[]], or has < 3 valid points,
 * this function returns false.
 */
export function isValidPolygonCoordinates(coords: any): boolean {
  if (!coords || !Array.isArray(coords) || coords.length === 0) {
    return false;
  }

  const first = coords[0];
  if (!first) return false;

  // Case 1: coords is a flat array of points: [ [lat, lng], [lat, lng], [lat, lng], ... ]
  if (isValidPoint(first)) {
    if (coords.length < 3) return false;
    return coords.every(isValidPoint);
  }

  // Case 2: coords is an array of rings: [ [ [lat, lng], ... ], ... ]
  if (Array.isArray(first)) {
    if (first.length === 0) return false;
    const firstSub = first[0];
    if (isValidPoint(firstSub)) {
      if (first.length < 3) return false;
      return first.every(isValidPoint);
    }

    // Case 3: coords is a MultiPolygon: [ [ [ [lat, lng], ... ] ] ]
    if (Array.isArray(firstSub) && firstSub.length > 0 && isValidPoint(firstSub[0])) {
      if (firstSub.length < 3) return false;
      return firstSub.every(isValidPoint);
    }
  }

  return false;
}

/**
 * Sanitizes a polygon ring of coordinates:
 * 1. Validates each point is finite, valid, and within geographic bounds.
 * 2. Normalizes points to [lat, lng] format.
 * 3. Removes consecutive duplicate vertices.
 * 4. Strips the duplicate closing vertex if present (GeoJSON format stores v[last] == v[0],
 *    whereas Leaflet and simple polygon rings represent vertices as distinct points V0..Vn-1).
 */
export function sanitizePolygonRing(coords: any): [number, number][] {
  if (!coords || !Array.isArray(coords)) return [];
  const clean: [number, number][] = [];

  for (const pt of coords) {
    if (!pt) continue;
    let lat: number | undefined;
    let lng: number | undefined;

    if (Array.isArray(pt)) {
      lat = pt[0];
      lng = pt[1];
    } else if (typeof pt === 'object') {
      lat = pt.lat ?? pt.latitude;
      lng = pt.lng ?? pt.lon ?? pt.longitude;
    }

    if (typeof lat !== 'number' || typeof lng !== 'number' || !Number.isFinite(lat) || !Number.isFinite(lng)) {
      continue;
    }

    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      continue;
    }

    if (clean.length > 0) {
      const prev = clean[clean.length - 1];
      if (Math.abs(prev[0] - lat) < 1e-7 && Math.abs(prev[1] - lng) < 1e-7) {
        continue;
      }
    }

    clean.push([lat, lng]);
  }

  // Strip duplicate closing point if present
  if (clean.length >= 2) {
    const first = clean[0];
    const last = clean[clean.length - 1];
    if (Math.abs(first[0] - last[0]) < 1e-7 && Math.abs(first[1] - last[1]) < 1e-7) {
      clean.pop();
    }
  }

  return clean;
}

/**
 * Filters an array of land cover items or polygon objects,
 * returning only those that have valid polygon coordinates.
 */
export function filterValidPolygons<T extends { coordinates?: any }>(items: T[] | null | undefined): T[] {
  if (!items || !Array.isArray(items)) return [];
  return items.filter(item => isValidPolygonCoordinates(item.coordinates));
}

/**
 * Calculates geodesic area in Hectares (Ha) for a polygon ring using spherical excess
 * on the WGS 84 ellipsoid radius (6,378,137 m).
 *
 * @param coords Array of [latitude, longitude] pairs
 * @returns Geodesic area in hectares rounded to 2 decimal places
 */
export function calculateGeodesicAreaHa(coords: [number, number][]): number {
  const clean = sanitizePolygonRing(coords);
  if (clean.length < 3) return 0;

  // Ensure ring is closed for spherical excess calculation
  const points = [...clean, [clean[0][0], clean[0][1]] as [number, number]];

  let totalExcess = 0;
  const rad = Math.PI / 180;
  for (let i = 0; i < points.length - 1; i++) {
    const p1 = points[i];
    const p2 = points[i + 1];
    totalExcess += (p2[1] - p1[1]) * rad * (2 + Math.sin(p1[0] * rad) + Math.sin(p2[0] * rad));
  }

  const radius = 6378137; // WGS 84 major radius in meters
  const areaSqMeters = Math.abs((totalExcess * radius * radius) / 2.0);
  const areaHa = areaSqMeters / 10000.0;

  return Number(areaHa.toFixed(2));
}

/**
 * Calculates bounding-box or average centroid [lat, lng] for a polygon ring.
 */
export function calculatePolygonCentroid(coords: [number, number][]): [number, number] {
  const clean = sanitizePolygonRing(coords);
  if (clean.length === 0) return [-2.5, 118]; // Default Indonesia center
  let minLat = Infinity, maxLat = -Infinity, minLng = Infinity, maxLng = -Infinity;
  let count = 0;

  clean.forEach(([lat, lng]) => {
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      if (lat < minLat) minLat = lat;
      if (lat > maxLat) maxLat = lat;
      if (lng < minLng) minLng = lng;
      if (lng > maxLng) maxLng = lng;
      count++;
    }
  });

  if (count === 0 || !Number.isFinite(minLat)) return [-2.5, 118];
  return [Number(((minLat + maxLat) / 2).toFixed(6)), Number(((minLng + maxLng) / 2).toFixed(6))];
}

/**
 * Checks whether two line segments (p1-q1) and (p2-q2) intersect in 2D space.
 */
function ccw(a: [number, number], b: [number, number], c: [number, number]): number {
  return (c[1] - a[1]) * (b[0] - a[0]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(p: [number, number], q: [number, number], r: [number, number]): boolean {
  return (
    q[0] <= Math.max(p[0], r[0]) + 1e-9 &&
    q[0] >= Math.min(p[0], r[0]) - 1e-9 &&
    q[1] <= Math.max(p[1], r[1]) + 1e-9 &&
    q[1] >= Math.min(p[1], r[1]) - 1e-9
  );
}

export function doLineSegmentsIntersect(
  p1: [number, number],
  q1: [number, number],
  p2: [number, number],
  q2: [number, number]
): boolean {
  const o1 = ccw(p1, q1, p2);
  const o2 = ccw(p1, q1, q2);
  const o3 = ccw(p2, q2, p1);
  const o4 = ccw(p2, q2, q1);

  const eps = 1e-10;

  // General case: strictly opposite orientations
  if (
    ((o1 > eps && o2 < -eps) || (o1 < -eps && o2 > eps)) &&
    ((o3 > eps && o4 < -eps) || (o3 < -eps && o4 > eps))
  ) {
    return true;
  }

  // Collinear overlap cases
  if (Math.abs(o1) <= eps && onSegment(p1, p2, q1)) return true;
  if (Math.abs(o2) <= eps && onSegment(p1, q2, q1)) return true;
  if (Math.abs(o3) <= eps && onSegment(p2, p1, q2)) return true;
  if (Math.abs(o4) <= eps && onSegment(p2, q1, q2)) return true;

  return false;
}

/**
 * Checks whether a polygon ring self-intersects (has kinks / cross-overs).
 * Uses sanitized distinct vertices [V0..Vn-1] to prevent false self-intersections
 * caused by duplicate closing vertices in GeoJSON polygons.
 */
export function checkPolygonSelfIntersection(rawCoords: [number, number][]): {
  hasSelfIntersection: boolean;
  intersectingSegments?: [[number, number], [number, number]];
} {
  const coords = sanitizePolygonRing(rawCoords);
  if (!coords || coords.length < 4) {
    return { hasSelfIntersection: false };
  }

  const n = coords.length;
  for (let i = 0; i < n; i++) {
    const p1 = coords[i];
    const q1 = coords[(i + 1) % n];

    for (let j = i + 1; j < n; j++) {
      // Skip adjacent segments:
      // (i, i+1) is adjacent; (0, n-1) is adjacent in closed ring.
      if (Math.abs(i - j) <= 1 || (i === 0 && j === n - 1)) {
        continue;
      }

      const p2 = coords[j];
      const q2 = coords[(j + 1) % n];

      if (doLineSegmentsIntersect(p1, q1, p2, q2)) {
        return {
          hasSelfIntersection: true,
          intersectingSegments: [p1, p2],
        };
      }
    }
  }

  return { hasSelfIntersection: false };
}

/**
 * Validates a manual polygon before saving.
 */
export function validateManualPolygon(rawCoords: [number, number][]): { valid: boolean; reason?: string } {
  const coords = sanitizePolygonRing(rawCoords);
  if (!coords || coords.length === 0) {
    return { valid: false, reason: 'Titik koordinat tidak boleh kosong.' };
  }
  if (coords.length < 3) {
    return { valid: false, reason: `Polygon harus memiliki minimal 3 titik batas (saat ini ${coords.length} titik).` };
  }

  // Check distinct points
  const distinct = new Set<string>();
  for (const [lat, lng] of coords) {
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
      return { valid: false, reason: 'Terdapat titik koordinat di luar batas geografis valid (-90 s/d 90 lat, -180 s/d 180 lng).' };
    }
    distinct.add(`${lat.toFixed(6)},${lng.toFixed(6)}`);
  }

  if (distinct.size < 3) {
    return { valid: false, reason: 'Polygon harus memiliki minimal 3 titik sudut yang berbeda.' };
  }

  const selfInter = checkPolygonSelfIntersection(coords);
  if (selfInter.hasSelfIntersection) {
    return {
      valid: false,
      reason: 'Garis batas polygon saling berpotongan (self-intersection). Sesuaikan susunan titik agar tidak saling bersilangan.'
    };
  }

  const areaHa = calculateGeodesicAreaHa(coords);
  if (areaHa <= 0) {
    return { valid: false, reason: 'Luas polygon bernilai 0 atau tidak valid (titik-titik mungkin sejajar dalam satu garis lurus).' };
  }

  return { valid: true };
}

/**
 * Checks whether a single point [lat, lng] is inside a polygon ring using ray-casting.
 */
export function isPointInsidePolygon(point: [number, number], polygon: [number, number][]): boolean {
  const clean = sanitizePolygonRing(polygon);
  if (!clean || clean.length < 3) return false;
  const [lat, lng] = point;
  let inside = false;
  for (let i = 0, j = clean.length - 1; i < clean.length; j = i++) {
    const [xi, yi] = clean[i];
    const [xj, yj] = clean[j];
    const intersect = ((yi > lng) !== (yj > lng)) &&
      (lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Checks whether an inner polygon is completely contained within an outer polygon.
 * Returns containment ratio, counts, and validation status.
 */
export function isPolygonInsidePolygon(
  inner: [number, number][],
  outer: [number, number][]
): {
  inside: boolean;
  outsideCount: number;
  totalPoints: number;
} {
  const cleanInner = sanitizePolygonRing(inner);
  const cleanOuter = sanitizePolygonRing(outer);
  if (!cleanInner || !cleanOuter || cleanInner.length < 3 || cleanOuter.length < 3) {
    return { inside: true, outsideCount: 0, totalPoints: cleanInner?.length || 0 };
  }
  let outsideCount = 0;
  for (const pt of cleanInner) {
    if (!isPointInsidePolygon(pt, cleanOuter)) {
      outsideCount++;
    }
  }
  return {
    inside: outsideCount === 0,
    outsideCount,
    totalPoints: cleanInner.length,
  };
}

/**
 * Determines the optimal edge/segment index of a polygon ring to insert a free-placed point.
 * Preserves the exact coordinates of the clicked point (does NOT project or distort it).
 * Evaluates all polygon segments including closing segment, sorts by minimum detour and
 * perpendicular distance, and selects the best candidate that maintains topological validity
 * and zero self-intersection.
 */
export function findBestInsertionSegmentForFreePoint(
  pt: [number, number],
  rawCoords: [number, number][]
): { bestIndex: number; hasValidInsertion: boolean; cost?: number; errorReason?: string } {
  const coords = sanitizePolygonRing(rawCoords);
  if (!coords || coords.length < 3) {
    return { bestIndex: 0, hasValidInsertion: true, cost: 0 };
  }

  const n = coords.length;
  const dist = (p1: [number, number], p2: [number, number]) =>
    Math.sqrt((p1[0] - p2[0]) ** 2 + (p1[1] - p2[1]) ** 2);

  // Evaluate every segment i between coords[i] and coords[(i + 1) % n]
  const candidates = coords.map((_, i) => {
    const a = coords[i];
    const b = coords[(i + 1) % n];

    // Detour cost: (dist(a, pt) + dist(pt, b)) - dist(a, b)
    const da = dist(a, pt);
    const db = dist(pt, b);
    const dab = dist(a, b);
    const detour = (da + db) - dab;

    // Perpendicular / projection distance to segment
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const lenSq = dx * dx + dy * dy;
    let t = lenSq === 0 ? 0 : ((pt[0] - a[0]) * dx + (pt[1] - a[1]) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));
    const projLat = a[0] + t * dx;
    const projLng = a[1] + t * dy;
    const segDist = Math.sqrt((pt[0] - projLat) ** 2 + (pt[1] - projLng) ** 2);

    // Combined metric: detour + perpendicular distance weight
    const cost = detour + segDist * 0.5;

    // Simulate inserting pt at index i + 1
    const insertIdx = i + 1;
    const testCoords: [number, number][] = [
      ...coords.slice(0, insertIdx),
      pt,
      ...coords.slice(insertIdx),
    ];
    const check = checkPolygonSelfIntersection(testCoords);

    return {
      index: i,
      cost,
      detour,
      segDist,
      hasSelfIntersection: check.hasSelfIntersection,
    };
  });

  // Sort candidates by lowest cost first
  candidates.sort((c1, c2) => c1.cost - c2.cost);

  // Choose the best valid candidate that produces NO self-intersections
  const validCandidates = candidates.filter(c => !c.hasSelfIntersection);

  if (validCandidates.length > 0) {
    return {
      bestIndex: validCandidates[0].index,
      hasValidInsertion: true,
      cost: validCandidates[0].cost,
    };
  }

  // If all edge insertions cause self-intersection:
  return {
    bestIndex: candidates[0].index,
    hasValidInsertion: false,
    cost: candidates[0].cost,
    errorReason: 'Titik di lokasi ini menyebabkan garis polygon saling berpotongan (self-intersection). Silakan klik pada posisi lain.'
  };
}

