import { LNURLSuccessAction } from "@snort/shared";
import React from "react";
import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";

export function SuccessAction({ success }: { success: LNURLSuccessAction }) {
  return (
    <div className="flex items-center">
      <p className="flex g12">
        <Icon name="check" className="success" />
        {success?.description ?? <FormattedMessage defaultMessage="Paid" id="u/vOPu" />}
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
