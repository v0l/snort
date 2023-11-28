import Icon from "@/Icons/Icon";
import useLoading from "@/Hooks/useLoading";
import Spinner from "@/Icons/Spinner";

export type AsyncIconProps = React.HTMLProps<HTMLDivElement> & {
  iconName: string;
  iconSize?: number;
  onClick?: (e: React.MouseEvent) => Promise<void> | void;
};

export function AsyncIcon(props: AsyncIconProps) {
  const { loading, handle } = useLoading(props.onClick, props.disabled);

  const mergedProps = { ...props } as Record<string, unknown>;
  delete mergedProps["iconName"];
  delete mergedProps["iconSize"];
  delete mergedProps["loading"];
  return (
    <div {...mergedProps} onClick={handle} className={props.className}>
      {loading ? <Spinner /> : <Icon name={props.iconName} size={props.iconSize} />}
      {props.children}
    </div>
  );
}
