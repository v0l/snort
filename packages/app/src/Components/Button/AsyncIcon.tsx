import Icon from "@/Components/Icons/Icon";
import Spinner from "@/Components/Icons/Spinner";
import useLoading from "@/Hooks/useLoading";

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
