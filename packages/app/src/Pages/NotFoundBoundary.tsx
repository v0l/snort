import { isRouteErrorResponse, useRouteError } from "react-router-dom"

import ErrorPage from "@/Pages/ErrorPage"
import NotFoundPage from "@/Pages/NotFound"

export default function NotFoundBoundary() {
  const error = useRouteError()
  if (isRouteErrorResponse(error) && error.status === 404) {
    return <NotFoundPage />
  }
  return <ErrorPage />
}
