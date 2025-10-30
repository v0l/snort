import { Outlet } from "react-router-dom";

export { FollowsRelayHealth } from "./follows-relay-health";
export { PruneFollowList } from "./prune-follows";
export { default as SyncAccountTool } from "./sync-account";

export function ToolsPage() {
  return <Outlet />;
}
