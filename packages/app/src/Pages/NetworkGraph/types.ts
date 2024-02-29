import { CachedMetadata, UID } from "@snort/system";

export interface GraphNode {
  id: UID;
  profile?: CachedMetadata;
  distance: number;
  val: number;
  inboundCount: number;
  outboundCount: number;
  color?: string;
  visible: boolean;
  // curvature?: number;
}

export interface GraphLink {
  source: UID;
  target: UID;
  distance: number;
}

interface GraphMetadata {
  // usersByFollowDistance?: Map<number, Set<UID>>;
  userCountByDistance: number[];
  nodes?: Map<number, GraphNode>;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  meta?: GraphMetadata;
}

export enum Direction {
  INBOUND,
  OUTBOUND,
  BOTH,
}

export interface GraphConfig {
  direction: Direction;
  renderLimit: number | null;
  showDistance: number;
}

export const NODE_LIMIT = 500;
