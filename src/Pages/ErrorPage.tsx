import { FormattedMessage } from "react-intl";
import { useRouteError } from "react-router-dom";

const ErrorPage = () => {
  const error = useRouteError();

  console.error(error);
  return (
    <>
      <h4>
        <FormattedMessage defaultMessage="An error has occured!" />
      </h4>
      <pre>{JSON.stringify(error, undefined, "  ")}</pre>
    </>
  );
};

export default ErrorPage;
