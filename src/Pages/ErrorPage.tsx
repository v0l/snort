import { useRouteError } from "react-router-dom";

const ErrorPage = () => {
  const error = useRouteError();

  console.error(error);
  return (
    <>
      <h4>An error has occured!</h4>
      <pre>{JSON.stringify(error, undefined, "  ")}</pre>
    </>
  );
};

export default ErrorPage;
