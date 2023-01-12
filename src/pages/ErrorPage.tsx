import React, { FC } from "react";
import { useRouteError } from "react-router-dom";

const ErrorPage: FC = () => {
    const error = useRouteError();

    console.error(error);
    return (
        <>
            <h4>{error?.message ?? "Uknown error"}</h4>
            <pre>
                {JSON.stringify(error)}
            </pre>
        </>
    );
};

export default ErrorPage;
