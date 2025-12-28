import { useState, useEffect, type ComponentProps } from "react";
import { createPortal } from "react-dom";

import * as reactiveUtils from "@arcgis/core/core/reactiveUtils";
import SpatialReference from "@arcgis/core/geometry/SpatialReference";

import { SpatialReferencePicker } from "./spatial-reference-picker";
import type { CustomGraphicsLayer } from "../layers/custom-graphics-layer";
import { ImportedGraphicsLayer } from "../layers/imported-graphics-layer";

type LayerPropertiesProps = ComponentProps<"calcite-flow-item"> & {
  map: HTMLArcgisMapElement;
  layer: CustomGraphicsLayer;
  layerDefaults?: {
    color: string;
    spatialReference: SpatialReference;
  };
  sketchProps?: ComponentProps<"arcgis-sketch">;
  onClose?: () => void;
};

export function LayerProperties({
  map,
  layer,
  layerDefaults,
  sketchProps,
  onClose,
  ...rest
}: LayerPropertiesProps) {
  const [sketch, setSketch] = useState<HTMLArcgisSketchElement | null>();
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!sketch) {
      return;
    }

    const updateSketchSymbols = () => {
      sketch.pointSymbol = layer.pointSymbol;
      sketch.polylineSymbol = layer.polylineSymbol;
      sketch.polygonSymbol = layer.polygonSymbol;
    };

    const layerSymbolsHandle = reactiveUtils.watch(
      () => [layer.pointSymbol, layer.polylineSymbol, layer.polygonSymbol],
      updateSketchSymbols,
    );
    updateSketchSymbols();

    if (editing) {
      sketch.layer = layer;
    } else {
      sketch.layer = undefined;
      sketch.cancel();
    }

    return () => {
      sketch.layer = undefined;
      sketch.cancel();
      layerSymbolsHandle.remove();
    };
  }, [sketch, layer, editing]);

  return (
    <>
      <calcite-flow-item oncalciteFlowItemBack={onClose} {...rest}>
        <calcite-block expanded label="Properties">
          <calcite-label>
            Title
            <calcite-input
              value={layer.title ?? ""}
              oncalciteInputChange={(event) =>
                (layer.title = event.currentTarget.value)
              }
            />
          </calcite-label>
          <calcite-label>
            Color
            <calcite-color-picker
              channelsDisabled
              fieldDisabled
              hexDisabled
              savedDisabled
              format="hex"
              value={layer.color}
              oncalciteColorPickerChange={(event) => {
                if (event.currentTarget.value) {
                  const color = event.currentTarget.value as string;
                  layer.color = color;
                  if (layerDefaults) {
                    layerDefaults.color = color;
                  }
                }
              }}
              style={{ inlineSize: "auto", minInlineSize: "auto" }}
            />
          </calcite-label>
          {layer instanceof ImportedGraphicsLayer && (
            <calcite-label>
              Spatial reference
              <SpatialReferencePicker
                label=""
                selectionMode="single-persist"
                value={layer.sourceSpatialReference.wkid?.toString()}
                oncalciteComboboxChange={(event) => {
                  const spatialReference = new SpatialReference({
                    wkid: parseInt(event.currentTarget.value as string),
                  });
                  layer.sourceSpatialReference = spatialReference;
                  map.goTo(layer.graphics);
                  if (layerDefaults) {
                    layerDefaults.spatialReference = spatialReference;
                  }
                }}
              />
            </calcite-label>
          )}
          {layer instanceof ImportedGraphicsLayer && (
            <calcite-label>
              Source
              <calcite-text-area
                readOnly
                rows={5}
                scale="s"
                resize="none"
                value={layer.source}
              />
            </calcite-label>
          )}
        </calcite-block>

        <div
          slot="footer"
          style={{ width: "100%", display: "grid", gap: "0.5em" }}
        >
          <calcite-button
            width="full"
            appearance="outline-fill"
            iconStart="layer-zoom-to"
            onClick={() => {
              map.goTo(layer.graphics);
            }}
          >
            Zoom to layer
          </calcite-button>
          <calcite-button
            width="full"
            appearance="outline-fill"
            iconStart={editing ? "x" : "pencil"}
            onClick={() => {
              setEditing(!editing);
            }}
            checked
            selected
          >
            {editing ? "Stop editing" : "Edit features"}
          </calcite-button>
          <calcite-button
            width="full"
            appearance="outline-fill"
            iconStart="trash"
            kind="danger"
            onClick={() => {
              map.map!.remove(layer);
              onClose?.();
            }}
          >
            Delete layer
          </calcite-button>
        </div>
      </calcite-flow-item>

      {createPortal(
        <arcgis-sketch
          ref={setSketch}
          defaultGraphicsLayerDisabled
          {...sketchProps}
        />,
        map,
      )}
    </>
  );
}
