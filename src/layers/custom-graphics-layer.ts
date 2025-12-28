import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import {
  property,
  subclass,
} from "@arcgis/core/core/accessorSupport/decorators";
import Graphic from "@arcgis/core/Graphic";
import GraphicsLayer from "@arcgis/core/layers/GraphicsLayer";
import SimpleMarkerSymbol from "@arcgis/core/symbols/SimpleMarkerSymbol";
import SimpleLineSymbol from "@arcgis/core/symbols/SimpleLineSymbol";
import SimpleFillSymbol from "@arcgis/core/symbols/SimpleFillSymbol";
import PopupTemplate from "@arcgis/core/PopupTemplate";
import FieldsContent from "@arcgis/core/popup/content/FieldsContent";

export type CustomGraphicsLayerProperties = __esri.GraphicsLayerProperties & {
  color: string;
};

@subclass("pastegis.ExtendedGraphicsLayer2")
export class CustomGraphicsLayer extends GraphicsLayer {
  constructor(properties: CustomGraphicsLayerProperties) {
    super(properties);

    const handle = reactiveUtils.watch(
      () =>
        [this.pointSymbol, this.polylineSymbol, this.polygonSymbol] as const,
      ([pointSymbol, polylineSymbol, polygonSymbol]) => {
        for (const graphic of this.graphics) {
          const geometryType = graphic.geometry?.type;
          if (geometryType == "point" || geometryType == "multipoint") {
            graphic.symbol = pointSymbol;
          } else if (geometryType == "polyline") {
            graphic.symbol = polylineSymbol;
          } else if (geometryType == "polygon" || geometryType == "extent") {
            graphic.symbol = polygonSymbol;
          }
        }
      },
    );
    this.addHandles([handle]);
  }

  @property()
  color!: string;

  @property({ readOnly: true, dependsOn: ["color"] })
  get pointSymbol() {
    return new SimpleMarkerSymbol({
      color: this.color,
      size: 10,
      outline: { color: "white", width: 2 },
    });
  }

  @property({ readOnly: true, dependsOn: ["color"] })
  get polylineSymbol() {
    return new SimpleLineSymbol({
      color: this.color,
      width: 3,
    });
  }

  @property({ readOnly: true, dependsOn: ["color"] })
  get polygonSymbol() {
    return new SimpleFillSymbol({
      color: this.color + "60",
      outline: { color: this.color, width: 3 },
    });
  }

  @property({ readOnly: true })
  get popupTemplate() {
    return new PopupTemplate({
      content: ({ graphic }: { graphic: Graphic }) => [
        new FieldsContent({
          fieldInfos: Object.keys(graphic.attributes ?? {}).map(
            (fieldName) => ({
              fieldName,
            }),
          ),
        }),
      ],
      title: () => this.title,
    });
  }
}
