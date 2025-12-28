import {
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ComponentProps,
  type Ref,
} from "react";

export type AlertProps = Partial<ComponentProps<"calcite-alert">> & {
  message: string;
};

type AlertPropsWithKey = AlertProps & {
  key: number;
};

export type AlertManagerHandle = {
  open: (alert: AlertProps) => void;
};

type Props = {
  ref?: Ref<AlertManagerHandle>;
  defaultAlertProps?: ComponentProps<"calcite-alert">;
};

export function AlertManager({ ref, defaultAlertProps }: Props) {
  const [alerts, setAlerts] = useState<AlertPropsWithKey[]>([]);
  const latestKey = useRef<number>(0);

  function open(alert: AlertProps) {
    setAlerts((alerts) => [
      ...alerts,
      {
        ...alert,
        key: latestKey.current++,
      },
    ]);
  }

  const handle = useMemo(() => ({ open }), []);
  useImperativeHandle(ref, () => handle, [handle]);

  return alerts.map((alert) => (
    <calcite-alert
      open
      oncalciteAlertClose={() => setAlerts(alerts.filter((a) => a != alert))}
      label=""
      {...defaultAlertProps}
      {...alert}
      key={alert.key}
    >
      <div slot="message">{alert.message}</div>
    </calcite-alert>
  ));
}
