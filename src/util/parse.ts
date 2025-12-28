import * as geometryJsonUtils from "@arcgis/core/geometry/support/jsonUtils";
import Graphic from "@arcgis/core/Graphic";
import Extent from "@arcgis/core/geometry/Extent";
import Geometry from "@arcgis/core/geometry/Geometry";
import Point from "@arcgis/core/geometry/Point";
import Multipoint from "@arcgis/core/geometry/Multipoint";
import Polyline from "@arcgis/core/geometry/Polyline";
import Polygon from "@arcgis/core/geometry/Polygon";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";

import { ImportedGraphicsLayer } from "../layers/imported-graphics-layer";

export type ParseResult = {
  graphics: Graphic[];
  unknownSpatialReference?: boolean;
};

export async function parseAsLayer(
  source: string,
  defaultSpatialReference: SpatialReference,
  color: string,
) {
  const { graphics, unknownSpatialReference } = await parseAsGraphics(source);

  let sourceSpatialReference: SpatialReference;
  if (unknownSpatialReference) {
    sourceSpatialReference = defaultSpatialReference;
    for (const graphic of graphics) {
      if (graphic.geometry) {
        graphic.geometry.spatialReference = defaultSpatialReference;
      }
    }
  } else {
    sourceSpatialReference = graphics[0].geometry!.spatialReference;
  }

  return new ImportedGraphicsLayer({
    source,
    sourceSpatialReference,
    graphics,
    color,
  });
}

export async function parseAsGraphics(source: string): Promise<ParseResult> {
  try {
    source = decodeURIComponent(source);
  } catch {
    // Source was not URI encoded
  }

  let json: any = undefined;
  try {
    json = JSON.parse(source);
  } catch {
    // Source was not JSON
  }

  if (json && typeof json == "object") {
    if (json.type) {
      // GeoJSON (spatial reference is always WGS84)
      let featureCollection;
      if (json.type == "FeatureCollection") {
        featureCollection = json;
      } else {
        let feature;
        if (json.type == "Feature") {
          feature = json;
        } else {
          feature = {
            type: "Feature",
            properties: {},
            geometry: json,
          };
        }
        featureCollection = {
          type: "FeatureCollection",
          features: [feature],
        };
      }
      const blob = new Blob([JSON.stringify(featureCollection)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const layer = new GeoJSONLayer({ url });
      const featureSet = await layer.queryFeatures();
      return {
        graphics: featureSet.features,
      };
    }

    // Esri JSON (feature set should have a spatial reference, features and geometries may not)
    if (json.features) {
      const featureSet: FeatureSet = FeatureSet.fromJSON(json);
      return {
        graphics: featureSet.features,
      };
    } else if (json.geometry) {
      const feature: Graphic = Graphic.fromJSON(json);
      return {
        graphics: [feature],
        unknownSpatialReference: !json.geometry?.spatialReference,
      };
    } else {
      const geometry = geometryJsonUtils.fromJSON(json);
      if (geometry) {
        return {
          graphics: [new Graphic({ geometry })],
          unknownSpatialReference: !json.spatialReference,
        };
      }
    }
  }

  let document: Document | undefined = undefined;
  try {
    const parser = new DOMParser();
    document = parser.parseFromString(source, "application/xml");
  } catch {
    // Source was not XML
  }

  if (document) {
    const graphics: Graphic[] = [];

    // ArcGIS Pro clipboard (has spatial reference)
    for (const propertyArray of document.querySelectorAll(
      ":scope > ArrayOfPropertySet > PropertySet > PropertyArray",
    )) {
      const attributes: any = {};
      let geometry: Geometry | undefined = undefined;

      for (const property of propertyArray.querySelectorAll(
        ":scope > PropertySetProperty",
      )) {
        const key = property.querySelector(":scope > Key")!;
        const value = property.querySelector(":scope > Value")!;
        const valueType = value.getAttribute("xsi:type")!;

        if (
          valueType == "typens:PointB" ||
          valueType == "typens:MultipointB" ||
          valueType == "typens:PolylineB" ||
          valueType == "typens:PolygonB"
        ) {
          const wkid = value.querySelector(":scope > SpatialReference > WKID")!;
          const spatialReference = new SpatialReference({
            wkid: parseInt(wkid.textContent),
          });
          const bytes = value.querySelector(":scope > Bytes")!.textContent;
          geometry = parseShapeBytes(bytes, spatialReference);
        } else {
          attributes[key.textContent] = value.textContent;
        }
      }

      graphics.push(new Graphic({ attributes, geometry }));
    }

    if (graphics.length > 0) {
      return { graphics };
    }
  }

  const parts = source.split(",").map((s) => parseFloat(s.trim()));

  if (parts.every((n) => !isNaN(n))) {
    // Comma-separated coordinates (no spatial reference)
    let geometry: Geometry | undefined = undefined;
    if (parts.length == 2) {
      const [x, y] = parts;
      geometry = new Point({ x, y });
    } else if (parts.length == 4) {
      const [xmin, ymin, xmax, ymax] = parts;
      geometry = new Extent({ xmin, ymin, xmax, ymax });
    }
    if (geometry) {
      return {
        graphics: [new Graphic({ geometry })],
        unknownSpatialReference: true,
      };
    }
  }

  throw new Error("Unknown format");
}

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

function parseShapeBytes(
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

  // const hasZ =
  //   (modifier & 0x80000000) == 0x80000000 ||
  //   type == shapeTypes.pointZ ||
  //   type == shapeTypes.pointZM ||
  //   type == shapeTypes.multipointZ ||
  //   type == shapeTypes.multipointZM ||
  //   type == shapeTypes.polylineZ ||
  //   type == shapeTypes.polylineZM ||
  //   type == shapeTypes.polygonZ ||
  //   type == shapeTypes.polygonZM;
  // const hasM =
  //   (modifier & 0x40000000) == 0x40000000 ||
  //   type == shapeTypes.pointM ||
  //   type == shapeTypes.pointZM ||
  //   type == shapeTypes.multipointM ||
  //   type == shapeTypes.multipointZM ||
  //   type == shapeTypes.polylineM ||
  //   type == shapeTypes.polylineZM ||
  //   type == shapeTypes.polygonM ||
  //   type == shapeTypes.polygonZM;
  // const hasID = (modifier & 0x10000000) == 0x10000000;
  const hasCurves = (modifier & 0x20000000) == 0x20000000;

  if (hasCurves) {
    throw new Error("Geometries with curves are unsupported");
  }

  // TODO parse Zs, Ms and IDs

  if (isPoint) {
    const x = view.getFloat64(o, true);
    o += 8;
    const y = view.getFloat64(o, true);
    o += 8;
    return new Point({ x, y, spatialReference });
  } else if (isMultipoint) {
    // Skip bounding box
    o += 4 * 8;

    const pointCount = view.getInt32(o, true);
    o += 4;

    const points: number[][] = [];
    for (let i = 0; i < pointCount; i++) {
      const x = view.getFloat64(o, true);
      o += 8;
      const y = view.getFloat64(o, true);
      o += 8;
      points.push([x, y]);
    }

    return new Multipoint({ points, spatialReference });
  } else if (isPolyline || isPolygon) {
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

    const parts: number[][][] = [];
    let part: number[][] | undefined = undefined;
    for (let i = 0; i < pointCount; i++) {
      if (partIndices.includes(i)) {
        part = [];
        parts.push(part);
      }
      const x = view.getFloat64(o, true);
      o += 8;
      const y = view.getFloat64(o, true);
      o += 8;
      if (part) {
        part.push([x, y]);
      }
    }

    return isPolyline
      ? new Polyline({ paths: parts, spatialReference })
      : new Polygon({ rings: parts, spatialReference });
  } else {
    throw new Error("Unsupported geometry type");
  }
}
