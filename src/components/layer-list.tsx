import { useEffect, useState, type ComponentProps } from "react";

type Props = ComponentProps<"arcgis-layer-list"> & {
  onLayerClick?: (layer: __esri.Layer) => void;
};

export function LayerList({ onLayerClick, ...rest }: Props) {
  const [layerList, setLayerList] =
    useState<HTMLArcgisLayerListElement | null>();

  useEffect(() => {
    if (!layerList) {
      return;
    }

    const handle = layerList.selectedItems.on("change", () => {
      const [item] = layerList.selectedItems;
      if (item) {
        onLayerClick?.(item.layer as __esri.Layer);
        requestAnimationFrame(() => layerList.selectedItems.removeAll());
      }
    });
    return () => handle.remove();
  }, [layerList, onLayerClick]);

  return (
    <arcgis-layer-list ref={setLayerList} selectionMode="single" {...rest} />
  );
}
