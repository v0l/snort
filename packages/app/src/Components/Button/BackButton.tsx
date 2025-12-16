import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import type { ReactNode } from "react";

interface BackButtonProps {
  text?: ReactNode;
  onClick?(): void;
}

export default function BackButton({ text, onClick }: BackButtonProps) {
  return (
    <div
      className="flex gap-2 items-center cursor-pointer hover:underline"
      onClick={() => {
        onClick?.();
      }}>
      <Icon name="arrowBack" />
      <span>{text || <FormattedMessage defaultMessage="Back" />}</span>
    </div>
  );
}
