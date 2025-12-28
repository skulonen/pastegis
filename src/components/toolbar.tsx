import type { ComponentProps } from "react";

import SpatialReference from "@arcgis/core/geometry/SpatialReference";

import { CustomGraphicsLayer } from "../layers/custom-graphics-layer";
import { ImportedGraphicsLayer } from "../layers/imported-graphics-layer";
import { parseAsLayer } from "../util/parse";

type Props = ComponentProps<"div"> & {
  map: HTMLArcgisMapElement;
  layerDefaults: {
    color: string;
    spatialReference: SpatialReference;
  };
  onLayerAdded?: (layer: CustomGraphicsLayer) => void;
  onAllLayersDeleted?: () => void;
  onError?: (error: unknown) => void;
};

export function Toolbar({
  map,
  layerDefaults,
  onLayerAdded,
  onAllLayersDeleted,
  onError,
  ...rest
}: Props) {
  async function paste() {
    const source = await navigator.clipboard.readText();

    let layer: ImportedGraphicsLayer;
    try {
      layer = await parseAsLayer(
        source,
        layerDefaults.spatialReference,
        layerDefaults.color,
      );
    } catch (error) {
      if (onError) {
        onError?.(error);
        return;
      } else {
        throw error;
      }
    }
    addLayer(layer);
  }

  function create() {
    const layer = new CustomGraphicsLayer({ color: layerDefaults.color });
    addLayer(layer);
  }

  function addLayer(layer: CustomGraphicsLayer) {
    const layers = map.map!.layers;

    const usedTitles = new Set(layers.map((layer) => layer.title));
    const baseTitle = "New layer";
    let title = baseTitle;
    let i = 2;
    while (usedTitles.has(title)) {
      title = `${baseTitle} ${i++}`;
    }
    layer.title = title;

    layers.push(layer);
    map.goTo(layer.graphics);
    onLayerAdded?.(layer);
  }

  function deleteAll() {
    map.map!.layers.removeAll();
    onAllLayersDeleted?.();
  }

  return (
    <div {...rest}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1em" }}>
        <calcite-fab
          text="Paste"
          textEnabled
          icon="paste"
          scale="l"
          onClick={paste}
        />
        <calcite-fab
          text="Create"
          textEnabled
          icon="add-layer"
          scale="l"
          onClick={create}
        />
        <calcite-fab
          text="Delete all"
          textEnabled
          icon="trash"
          scale="l"
          kind="danger"
          onClick={deleteAll}
        />
      </div>
    </div>
  );
}
