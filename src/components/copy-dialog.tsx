import { type ComponentProps, useState, useMemo } from "react";

import SpatialReference from "@arcgis/core/geometry/SpatialReference";

import { SpatialReferencePicker } from "./spatial-reference-picker";
import {
  type StringifyFormat,
  type StringifyGeometryType,
  stringify,
} from "../util/stringify";

type Props = ComponentProps<"calcite-dialog"> & {
  graphic: __esri.Graphic;
};

export function CopyDialog({ graphic, ...rest }: Props) {
  const [geometryType, setGeometryType] =
    useState<StringifyGeometryType>("original");
  const [spatialReference, setSpatialReference] = useState<string | undefined>(
    graphic.geometry?.spatialReference.wkid?.toString(),
  );
  const [format, setFormat] = useState<StringifyFormat>("json-feature");

  const result = useMemo(() => {
    if (!spatialReference) {
      return undefined;
    }
    try {
      const sr = new SpatialReference({ wkid: parseInt(spatialReference) });
      return stringify({ graphic, geometryType, spatialReference: sr, format });
    } catch {
      return undefined;
    }
  }, [graphic, geometryType, spatialReference, format]);

  return (
    <calcite-dialog heading="Copy feature" {...rest}>
      <calcite-label>
        Geometry
        <calcite-segmented-control
          value={geometryType}
          oncalciteSegmentedControlChange={(event) =>
            setGeometryType(event.currentTarget.value as StringifyGeometryType)
          }
        >
          <calcite-segmented-control-item
            iconStart="shapes"
            value="original"
            checked={geometryType == "original"}
          >
            Original
          </calcite-segmented-control-item>
          <calcite-segmented-control-item
            iconStart="extent"
            value="extent"
            checked={geometryType == "extent"}
          >
            Extent
          </calcite-segmented-control-item>
          <calcite-segmented-control-item
            iconStart="point"
            value="centroid"
            checked={geometryType == "centroid"}
          >
            Centroid
          </calcite-segmented-control-item>
        </calcite-segmented-control>
      </calcite-label>

      <calcite-label>
        Spatial reference
        <SpatialReferencePicker
          label="Spatial reference"
          selectionMode="single-persist"
          overlayPositioning="fixed"
          value={spatialReference}
          oncalciteComboboxChange={(event) =>
            setSpatialReference(event.currentTarget.value as string)
          }
        />
      </calcite-label>

      <calcite-label>
        Format
        <calcite-combobox
          label="Format"
          overlayPositioning="fixed"
          selectionMode="single-persist"
          value={format}
          oncalciteComboboxChange={(event) =>
            setFormat(event.currentTarget.value as StringifyFormat)
          }
        >
          <calcite-combobox-item value="json-feature" heading="JSON feature" />
          <calcite-combobox-item
            value="json-geometry"
            heading="JSON geometry"
          />
          <calcite-combobox-item
            value="csv"
            heading="Comma-separated coordinates"
          />
        </calcite-combobox>
      </calcite-label>

      <calcite-label>
        Result
        <calcite-text-area
          readOnly
          rows={5}
          scale="s"
          resize="none"
          value={result}
        >
          <calcite-button
            slot="footer-end"
            iconStart="copy"
            disabled={!result}
            onClick={() => navigator.clipboard.writeText(result!)}
          >
            Copy
          </calcite-button>
        </calcite-text-area>
      </calcite-label>
    </calcite-dialog>
  );
}
