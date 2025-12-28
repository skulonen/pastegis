import type { ComponentProps } from "react";

import SpatialReference from "@arcgis/core/geometry/SpatialReference";

const commonItems = [
  {
    title: "Web Mercator",
    wkid: SpatialReference.WebMercator.wkid!.toString(),
  },
  {
    title: "WGS 84",
    wkid: SpatialReference.WGS84.wkid!.toString(),
  },
];

const finlandSpatialReferences = [
  { title: "ETRS-TM35FIN", wkid: "3067" },
  { title: "ETRS-GK19", wkid: "3873" },
  { title: "ETRS-GK20", wkid: "3874" },
  { title: "ETRS-GK21", wkid: "3875" },
  { title: "ETRS-GK22", wkid: "3876" },
  { title: "ETRS-GK23", wkid: "3877" },
  { title: "ETRS-GK24", wkid: "3878" },
  { title: "ETRS-GK25", wkid: "3879" },
  { title: "ETRS-GK26", wkid: "3880" },
  { title: "ETRS-GK27", wkid: "3881" },
  { title: "ETRS-GK28", wkid: "3882" },
  { title: "ETRS-GK29", wkid: "3883" },
  { title: "ETRS-GK30", wkid: "3884" },
  { title: "ETRS-GK31", wkid: "3885" },
];

export function SpatialReferencePicker(
  props: ComponentProps<"calcite-combobox">,
) {
  function renderItems(items: { title: string; wkid: string }[]) {
    return items.map(({ title, wkid }) => (
      <calcite-combobox-item
        key={wkid}
        value={wkid}
        heading={`${title} (${wkid})`}
      />
    ));
  }

  return (
    <calcite-combobox allowCustomValues {...props}>
      <calcite-combobox-item-group label="Common">
        {renderItems(commonItems)}
      </calcite-combobox-item-group>
      <calcite-combobox-item-group label="Finland">
        {renderItems(finlandSpatialReferences)}
      </calcite-combobox-item-group>
    </calcite-combobox>
  );
}
