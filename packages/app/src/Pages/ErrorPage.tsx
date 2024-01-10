import { FormattedMessage } from "react-intl";
import { useRouteError } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import { db } from "@/Db";

const ErrorPage = () => {
  const error = useRouteError();

  console.error(error);
  return (
    <div className="p-2">
      <h4>
        <FormattedMessage defaultMessage="An error has occured!" id="FfYsOb" />
      </h4>
      <AsyncButton
        onClick={async () => {
          await db.delete();
          globalThis.localStorage.clear();
          globalThis.location.href = "/";
        }}>
        <FormattedMessage defaultMessage="Clear cache and reload" id="HWbkEK" />
      </AsyncButton>
      <h5>{error.message}</h5>
      <div className="my-2">{error.message}</div>
      <pre className="my-2 whitespace-pre-wrap">{error.stack}</pre>
    </div>
  );
};

export default ErrorPage;
