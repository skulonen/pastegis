import Point from "@arcgis/core/geometry/Point";
import Multipoint from "@arcgis/core/geometry/Multipoint";
import Polyline from "@arcgis/core/geometry/Polyline";
import Polygon from "@arcgis/core/geometry/Polygon";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";

// List supported types only
const shapeTypes = {
  point: 1,
  pointZ: 9,
  pointM: 21,
  pointZM: 11,
  multipoint: 8,
  multipointZ: 20,
  multipointM: 28,
  multipointZM: 18,
  polyline: 3,
  polylineZ: 10,
  polylineM: 23,
  polylineZM: 13,
  polygon: 5,
  polygonM: 25,
  polygonZ: 19,
  polygonZM: 15,
  generalPoint: 52,
  generalMultipoint: 53,
  generalPolyline: 50,
  generalPolygon: 51,
};

export function parseEsriShape(
  base64Bytes: string,
  spatialReference: SpatialReference,
) {
  const array = Uint8Array.from(atob(base64Bytes), (v) => v.charCodeAt(0));
  const view = new DataView(array.buffer);
  let o = 0;

  const typeData = view.getInt32(0, true);
  o += 4;

  const type = typeData & 0x000000ff;
  const modifier = typeData & 0xff000000;

  const isPoint =
    type == shapeTypes.point ||
    type == shapeTypes.pointM ||
    type == shapeTypes.pointZM ||
    type == shapeTypes.pointZ ||
    type == shapeTypes.generalPoint;
  const isMultipoint =
    type == shapeTypes.multipoint ||
    type == shapeTypes.multipointM ||
    type == shapeTypes.multipointZM ||
    type == shapeTypes.multipointZ ||
    type == shapeTypes.generalMultipoint;
  const isPolyline =
    type == shapeTypes.polyline ||
    type == shapeTypes.polylineM ||
    type == shapeTypes.polylineZM ||
    type == shapeTypes.polylineZ ||
    type == shapeTypes.generalPolyline;
  const isPolygon =
    type == shapeTypes.polygon ||
    type == shapeTypes.polygonM ||
    type == shapeTypes.polygonZM ||
    type == shapeTypes.polygonZ ||
    type == shapeTypes.generalPolygon;

  const hasZ =
    (modifier & 0x80000000) == 0x80000000 ||
    type == shapeTypes.pointZ ||
    type == shapeTypes.pointZM ||
    type == shapeTypes.multipointZ ||
    type == shapeTypes.multipointZM ||
    type == shapeTypes.polylineZ ||
    type == shapeTypes.polylineZM ||
    type == shapeTypes.polygonZ ||
    type == shapeTypes.polygonZM;
  const hasM =
    (modifier & 0x40000000) == 0x40000000 ||
    type == shapeTypes.pointM ||
    type == shapeTypes.pointZM ||
    type == shapeTypes.multipointM ||
    type == shapeTypes.multipointZM ||
    type == shapeTypes.polylineM ||
    type == shapeTypes.polylineZM ||
    type == shapeTypes.polygonM ||
    type == shapeTypes.polygonZM;
  const hasID = (modifier & 0x10000000) == 0x10000000;
  const hasCurves = (modifier & 0x20000000) == 0x20000000;

  if (hasCurves) {
    throw new Error("Geometries with curves are unsupported");
  }

  function translateNaN(number: number) {
    return number < -1.0e38 ? NaN : number;
  }

  function parsePoints(pointCount: number) {
    const points: number[][] = [];
    for (let i = 0; i < pointCount; i++) {
      const x = view.getFloat64(o, true);
      o += 8;
      const y = view.getFloat64(o, true);
      o += 8;
      points.push([x, y]);
    }

    if (hasZ) {
      // Skip bounding box
      o += 2 * 8;

      for (let i = 0; i < pointCount; i++) {
        const z = translateNaN(view.getFloat64(o, true));
        o += 8;
        points[i].push(z);
      }
    }

    if (hasM) {
      // Skip bounding box
      o += 2 * 8;

      for (let i = 0; i < pointCount; i++) {
        const m = translateNaN(view.getFloat64(o, true));
        o += 8;
        points[i].push(m);
      }
    }

    if (hasID) {
      // Point IDs are not handled at the moment
    }

    return points;
  }

  if (isPoint) {
    const x = view.getFloat64(o, true);
    o += 8;
    const y = view.getFloat64(o, true);
    o += 8;

    let z: number | undefined = undefined;
    if (hasZ) {
      z = translateNaN(view.getFloat64(o, true));
      o += 8;
    }

    let m: number | undefined = undefined;
    if (hasM) {
      m = translateNaN(view.getFloat64(o, true));
      o += 8;
    }

    if (hasID) {
      // Point IDs are not handled at the moment
    }

    return new Point({ x, y, z, m, hasZ, hasM, spatialReference });
  }

  if (isMultipoint) {
    // Skip bounding box
    o += 4 * 8;

    const pointCount = view.getInt32(o, true);
    o += 4;

    const points = parsePoints(pointCount);

    return new Multipoint({ points, hasZ, hasM, spatialReference });
  }

  if (isPolyline || isPolygon) {
    // Skip bounding box
    o += 4 * 8;

    const partCount = view.getInt32(o, true);
    o += 4;
    const pointCount = view.getInt32(o, true);
    o += 4;

    const partIndices = [];
    for (let i = 0; i < partCount; i++) {
      partIndices.push(view.getInt32(o, true));
      o += 4;
    }

    const points = parsePoints(pointCount);

    // Split into parts
    const parts: number[][][] = [];
    for (let i = 0; i < partCount; i++) {
      const start = partIndices[i];
      const end = partIndices[i + 1];
      const part = points.slice(start, end);
      parts.push(part);
    }

    return isPolyline
      ? new Polyline({ paths: parts, hasZ, hasM, spatialReference })
      : new Polygon({ rings: parts, hasZ, hasM, spatialReference });
  }

  throw new Error("Unsupported geometry type");
}
