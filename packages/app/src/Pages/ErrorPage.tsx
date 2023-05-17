import { db } from "Db";
import AsyncButton from "Element/AsyncButton";
import { FormattedMessage } from "react-intl";
import { useRouteError } from "react-router-dom";

const ErrorPage = () => {
  const error = useRouteError();

  console.error(error);
  return (
    <div className="main-content page">
      <h4>
        <FormattedMessage defaultMessage="An error has occured!" />
      </h4>
      <AsyncButton
        onClick={async () => {
          await db.delete();
          globalThis.localStorage.clear();
          globalThis.location.href = "/";
        }}>
        <FormattedMessage defaultMessage="Clear cache and reload" />
      </AsyncButton>
      {
        <pre>
          {JSON.stringify(
            error instanceof Error ? { name: error.name, message: error.message, stack: error.stack } : error,
            undefined,
            "  "
          )}
        </pre>
      }
    </div>
  );
};

export default ErrorPage;
