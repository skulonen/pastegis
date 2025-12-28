import SpatialReference from "@arcgis/core/geometry/SpatialReference";
import * as centroidOperator from "@arcgis/core/geometry/operators/centroidOperator";
import * as projectOperator from "@arcgis/core/geometry/operators/projectOperator";

export type StringifyGeometryType = "original" | "extent" | "centroid";
export type StringifyFormat = "json-feature" | "json-geometry" | "csv";

export type StringifyOptions = {
  graphic: __esri.Graphic;
  geometryType: StringifyGeometryType;
  spatialReference: SpatialReference;
  format: StringifyFormat;
};

export function stringify({
  graphic,
  geometryType,
  spatialReference,
  format,
}: StringifyOptions) {
  const tempGraphic = graphic.clone();

  let geometry = tempGraphic.geometry;
  if (geometry) {
    if (!geometry.spatialReference.equals(spatialReference)) {
      geometry = projectOperator.execute(geometry, spatialReference);
    }
  }
  if (geometry) {
    if (geometryType == "extent") {
      geometry = geometry.extent!;
    } else if (geometryType == "centroid") {
      geometry = centroidOperator.execute(geometry);
    }
  }
  tempGraphic.geometry = geometry;

  if (format == "json-feature") {
    const j = tempGraphic.toJSON();
    return JSON.stringify({ attributes: j.attributes, geometry: j.geometry });
  } else if (format == "json-geometry") {
    return JSON.stringify(tempGraphic.geometry!.toJSON());
  } else if (format == "csv") {
    if (tempGraphic.geometry!.type == "point") {
      const { x, y } = tempGraphic.geometry!;
      return `${x},${y}`;
    } else if (tempGraphic.geometry!.type == "extent") {
      const { xmin, ymin, xmax, ymax } = tempGraphic.geometry!;
      return `${xmin},${ymin},${xmax},${ymax}`;
    }
  }
  return undefined;
}
