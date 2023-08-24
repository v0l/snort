import Icon from "Icons/Icon";
import Spinner from "Icons/Spinner";
import { HTMLProps, useState } from "react";

export interface AsyncIconProps extends HTMLProps<HTMLDivElement> {
  iconName: string;
  iconSize?: number;
  loading?: boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => Promise<void>;
}

export function AsyncIcon(props: AsyncIconProps) {
  const [loading, setLoading] = useState(props.loading ?? false);

  async function handleClick(e: React.MouseEvent<HTMLDivElement>) {
    setLoading(true);
    try {
      if (props.onClick) {
        await props.onClick(e);
      }
    } catch (ex) {
      console.error(ex);
    }
    setLoading(false);
  }

  const mergedProps = { ...props } as Record<string, unknown>;
  delete mergedProps["iconName"];
  delete mergedProps["iconSize"];
  delete mergedProps["loading"];
  return (
    <div {...mergedProps} onClick={e => handleClick(e)}>
      {loading ? <Spinner /> : <Icon name={props.iconName} size={props.iconSize} />}
      {props.children}
    </div>
  );
}
