import * as geometryJsonUtils from "@arcgis/core/geometry/support/jsonUtils";
import Graphic from "@arcgis/core/Graphic";
import Extent from "@arcgis/core/geometry/Extent";
import Geometry from "@arcgis/core/geometry/Geometry";
import Point from "@arcgis/core/geometry/Point";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import FeatureSet from "@arcgis/core/rest/support/FeatureSet";
import GeoJSONLayer from "@arcgis/core/layers/GeoJSONLayer";

import { ImportedGraphicsLayer } from "../layers/imported-graphics-layer";
import { parseEsriShape } from "./esri-shape";

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
          geometry = parseEsriShape(bytes, spatialReference);
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
