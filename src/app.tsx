import { useState } from "react";

import SpatialReference from "@arcgis/core/geometry/SpatialReference";

import {
  AlertManager,
  type AlertManagerHandle,
} from "./components/alert-manager";
import { LayerList } from "./components/layer-list";
import { LayerProperties } from "./components/layer-properties";
import { Popup } from "./components/popup";
import { Toolbar } from "./components/toolbar";
import type { CustomGraphicsLayer } from "./layers/custom-graphics-layer";

const layerDefaults = {
  color: "#0000ff",
  spatialReference: SpatialReference.WGS84,
};

function App() {
  const [map, setMap] = useState<HTMLArcgisMapElement | null>();
  const [alertManager, setAlertManager] = useState<AlertManagerHandle | null>();
  const [selectedLayer, setSelectedLayer] = useState<CustomGraphicsLayer>();

  function handleError(error: unknown) {
    alertManager!.open({
      kind: "danger",
      message: `${error}`,
    });
    console.error(error);
  }

  return (
    <>
      <calcite-shell>
        <calcite-shell-panel slot="panel-start" resizable>
          <calcite-flow>
            <calcite-flow-item heading="Layers" selected={!selectedLayer}>
              <LayerList
                referenceElement={map ?? undefined}
                dragEnabled
                onLayerClick={(layer) =>
                  setSelectedLayer(layer as CustomGraphicsLayer)
                }
              />
            </calcite-flow-item>

            {selectedLayer && (
              <LayerProperties
                key={selectedLayer.id}
                heading="Properties"
                selected
                map={map!}
                layer={selectedLayer}
                layerDefaults={layerDefaults}
                sketchProps={{
                  slot: "bottom-left",
                  layout: "vertical",
                }}
                onClose={() => setSelectedLayer(undefined)}
              />
            )}
          </calcite-flow>
        </calcite-shell-panel>

        <arcgis-map ref={setMap} basemap="topo-vector" zoom={5} center="25,65">
          <Toolbar
            slot="top-left"
            map={map!}
            layerDefaults={layerDefaults}
            onLayerAdded={setSelectedLayer}
            onAllLayersDeleted={() => setSelectedLayer(undefined)}
            onError={handleError}
          />
          <Popup
            slot="popup"
            dockEnabled
            dockOptions={{
              position: "top-right",
              breakpoint: false,
              buttonEnabled: false,
            }}
          />
        </arcgis-map>
      </calcite-shell>

      <AlertManager
        ref={setAlertManager}
        defaultAlertProps={{
          label: "",
          icon: true,
          autoClose: true,
          autoCloseDuration: "fast",
          placement: "top-end",
          style: { "--calcite-alert-width": "20em" },
        }}
      />
    </>
  );
}

export default App;
