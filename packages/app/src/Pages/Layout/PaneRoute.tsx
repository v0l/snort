import { lazy, Suspense } from "react"
import { type RouteObject, useRoutes } from "react-router-dom"

import PageSpinner from "@/Components/PageSpinner"

const ThreadRoute = lazy(() => import("@/Components/Event/Thread/ThreadRoute").then(m => ({ default: m.ThreadRoute })))
const ProfilePage = lazy(() => import("@/Pages/Profile/ProfilePage"))
const NotificationsPage = lazy(() => import("@/Pages/Notifications/Notifications"))
const NostrLinkHandler = lazy(() => import("@/Pages/NostrLinkHandler"))

const paneRoutes: Array<RouteObject> = [
  { path: "/e/:id", element: <ThreadRoute /> },
  { path: "/p/:id", element: <ProfilePage /> },
  { path: "/notifications", element: <NotificationsPage /> },
  { path: "/:link", element: <NostrLinkHandler /> },
]

export function PaneRoute({ path }: { path: string }) {
  const element = useRoutes(paneRoutes, { pathname: path, search: "", hash: "", state: null, key: path })
  return <Suspense fallback={<PageSpinner />}>{element}</Suspense>
}
