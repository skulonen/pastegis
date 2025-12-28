import { useMemo, useState, type ComponentProps } from "react";

import Collection from "@arcgis/core/core/Collection";
import ActionButton from "@arcgis/core/support/actions/ActionButton";

import { CopyDialog } from "./copy-dialog";

type Props = ComponentProps<"arcgis-popup">;

export function Popup(props: Props) {
  const [graphic, setGraphic] = useState<__esri.Graphic>();
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);

  const popupActions = useMemo(
    () =>
      new Collection<ActionButton>([
        new ActionButton({
          id: "copy",
          icon: "copy",
          title: "Copy",
        }),
      ]),
    [],
  );

  return (
    <>
      <arcgis-popup
        actions={popupActions}
        onarcgisPropertyChange={(event) => {
          if (event.detail.name == "selectedFeature") {
            setGraphic(event.currentTarget.selectedFeature ?? undefined);
          }
        }}
        onarcgisTriggerAction={(event) => {
          if (event.detail.action.id == "copy") {
            setCopyDialogOpen(true);
          }
        }}
        {...props}
      />

      {copyDialogOpen && graphic && (
        <CopyDialog
          open
          modal
          width="s"
          graphic={graphic}
          oncalciteDialogClose={() => setCopyDialogOpen(false)}
        />
      )}
    </>
  );
}
