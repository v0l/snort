import { LNURLSuccessAction } from "@snort/shared";
import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";

export function SuccessAction({ success }: { success: LNURLSuccessAction }) {
  return (
    <div className="flex items-center">
      <p className="flex gap-3">
        <Icon name="check" className="success" />
        {success?.description ?? <FormattedMessage defaultMessage="Paid" />}
      </p>
      {success.url && (
        <p>
          <a href={success.url} rel="noreferrer" target="_blank">
            {success.url}
          </a>
        </p>
      )}
    </div>
  );
}
