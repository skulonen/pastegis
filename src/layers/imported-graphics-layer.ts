import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import * as projectOperator from "@arcgis/core/geometry/operators/projectOperator";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";

import {
  type CustomGraphicsLayerProperties,
  CustomGraphicsLayer,
} from "./custom-graphics-layer";

export type ImportedGraphicsLayerProperties = CustomGraphicsLayerProperties & {
  source: string;
  sourceSpatialReference: SpatialReference;
};

@subclass("pastegis.ImportedGraphicsLayer")
export class ImportedGraphicsLayer extends CustomGraphicsLayer {
  constructor(properties: ImportedGraphicsLayerProperties) {
    super(properties);

    this.graphics.on("before-add", (event) => {
      if (
        event.item.geometry &&
        !event.item.geometry.spatialReference.equals(
          this.sourceSpatialReference,
        )
      ) {
        event.item.geometry = projectOperator.execute(
          event.item.geometry,
          this.sourceSpatialReference,
        );
      }
    });

    const handle = reactiveUtils.watch(
      () => this.sourceSpatialReference,
      (sourceSpatialReference) => {
        for (const graphic of this.graphics) {
          if (graphic.geometry) {
            const newGeometry = graphic.geometry.clone();
            newGeometry.spatialReference = sourceSpatialReference;
            graphic.geometry = newGeometry;
          }
        }
      },
    );
    this.addHandles([handle]);
  }

  @property({ constructOnly: true })
  source!: string;

  @property()
  sourceSpatialReference!: SpatialReference;
}
