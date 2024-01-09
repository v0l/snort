import { CachedMetadata, socialGraphInstance, STR, UID } from "@snort/system";
import { SnortContext } from "@snort/system-react";
import { useContext, useEffect, useState } from "react";
import { NodeObject } from "react-force-graph-3d";
import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import { proxyImg } from "@/Hooks/useImgProxy";
import { LoginStore } from "@/Utils/Login";

import { defaultAvatar } from "../Utils";

interface GraphNode {
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

interface GraphLink {
  source: UID;
  target: UID;
  distance: number;
}

interface GraphMetadata {
  // usersByFollowDistance?: Map<number, Set<UID>>;
  userCountByDistance: number[];
  nodes?: Map<number, GraphNode>;
}

interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  meta?: GraphMetadata;
}

enum Direction {
  INBOUND,
  OUTBOUND,
  BOTH,
}

const avatar = (node: NodeObject<NodeObject<GraphNode>>) => {
  const login = LoginStore.snapshot();
  return node.profile?.picture
    ? proxyImg(node.profile?.picture, login.appData.item.preferences.imgProxyConfig)
    : defaultAvatar(node.address);
};

const NODE_LIMIT = 500;

interface GraphConfig {
  direction: Direction;
  renderLimit: number | null;
  showDistance: number;
}

const NetworkGraph = () => {
  const [graphData, setGraphData] = useState(null as GraphData | null);
  const [graphConfig, setGraphConfig] = useState({
    direction: Direction.OUTBOUND,
    renderLimit: NODE_LIMIT,
    showDistance: 2,
  });
  const [open, setOpen] = useState(false);
  const system = useContext(SnortContext);
  // const [showDistance, setShowDistance] = useState(2);
  // const [direction, setDirection] = useState(Direction.OUTBOUND);
  // const [renderLimit, setRenderLimit] = useState(NODE_LIMIT);

  const [ForceGraph3D, setForceGraph3D] = useState(null);
  const [THREE, setTHREE] = useState(null);

  useEffect(() => {
    // Dynamically import the modules
    import("react-force-graph-3d").then(module => {
      setForceGraph3D(module.default);
    });
    import("three").then(module => {
      setTHREE(module);
    });
  }, []);

  const handleCloseGraph = () => {
    setOpen(false);
  };

  const handleKeyDown = (event: { key: string }) => {
    if (event.key === "Escape") {
      handleCloseGraph();
    }
  };

  useEffect(() => {
    if (open) {
      window.addEventListener("keydown", handleKeyDown);
    }

    // Cleanup function to remove the event listener
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const updateConfig = async (changes: Partial<GraphConfig>) => {
    setGraphConfig(old => {
      const newConfig = Object.assign({}, old, changes);
      updateGraph(newConfig).then(graph => setGraphData(graph));
      return newConfig;
    });
  };

  const toggleConnections = () => {
    if (graphConfig.direction === Direction.OUTBOUND) {
      updateConfig({ direction: Direction.BOTH });
    } else {
      updateConfig({ direction: Direction.OUTBOUND });
    }
  };

  const updateGraph = async (newConfig?: GraphConfig) => {
    const { direction, renderLimit, showDistance } = newConfig ?? graphConfig;
    const nodes = new Map<number, GraphNode>();
    const links: GraphLink[] = [];
    const nodesVisited = new Set<UID>();
    const userCountByDistance = Array.from(
      { length: 6 },
      (_, i) => socialGraphInstance.usersByFollowDistance.get(i)?.size || 0,
    );

    // Go through all the nodes
    for (let distance = 0; distance <= showDistance; ++distance) {
      const users = socialGraphInstance.usersByFollowDistance.get(distance);
      if (!users) break;
      for (const UID of users) {
        if (renderLimit && nodes.size >= renderLimit) break; // Temporary hack
        const inboundCount = socialGraphInstance.followersByUser.get(UID)?.size || 0;
        const outboundCount = socialGraphInstance.followedByUser.get(UID)?.size || 0;
        const pubkey = STR(UID);
        const node = {
          id: UID,
          address: pubkey,
          profile: system.profileLoader.cache.getFromCache(pubkey),
          distance,
          inboundCount,
          outboundCount,
          visible: true, // Setting to false only hides the rendered element, does not prevent calculations
          // curvature: 0.6,
          // Node size is based on the follower count
          val: Math.log10(inboundCount) + 1, // 1 followers -> 1, 10 followers -> 2, 100 followers -> 3, etc.,
        } as GraphNode;
        // A visibility boost for the origin user:
        if (node.distance === 0) {
          node.val = 10; // they're always larger than life
          node.color = "#603285";
        }
        nodes.set(UID, node);
      }
    }

    // Add links
    for (const node of nodes.values()) {
      if (direction === Direction.OUTBOUND || direction === Direction.BOTH) {
        for (const followedID of socialGraphInstance.followedByUser.get(node.id) ?? []) {
          if (!nodes.has(followedID)) continue; // Skip links to nodes that we're not rendering
          if (nodesVisited.has(followedID)) continue;
          links.push({
            source: node.id,
            target: followedID,
            distance: node.distance,
          });
        }
      }
      // TODO: Fix filtering
      /*      if (direction === Direction.INBOUND || direction === Direction.BOTH) {
        for (const followerID of socialGraphInstance.followersByUser.get(node.id) ?? []) {
          if (nodesVisited.has(followerID)) continue;
          const follower = nodes.get(followerID);
          if (!follower) continue; // Skip links to nodes that we're not rendering
          links.push({
            source: followerID,
            target: node.id,
            distance: follower.distance,
          });
        }
      }*/
      nodesVisited.add(node.id);
    }

    // Squash cases, where there are a lot of nodes

    const graph: GraphData = {
      nodes: [...nodes.values()],
      links,
      meta: {
        nodes,
        userCountByDistance,
      },
    };

    // console.log('!!', graph);
    // for (const l of links) {
    //   if (!nodes.has(l.source)) {
    //     console.log('source missing:', l.source);
    //   }
    //   if (!nodes.has(l.target)) {
    //     console.log('target missing:', l.target);
    //   }
    // }

    return graph;
  };

  const refreshData = async () => {
    updateGraph().then(setGraphData);
  };

  useEffect(() => {
    refreshData();
  }, []);

  if (!ForceGraph3D || !THREE) return null;

  return (
    <div>
      {!open && (
        <button
          className="btn btn-primary"
          onClick={() => {
            setOpen(true);
            refreshData();
          }}>
          <FormattedMessage defaultMessage="Show graph" id="ha8JKG" />
        </button>
      )}
      {open && graphData && (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-20">
          <button className="absolute top-6 right-6 z-30 btn hover:bg-gray-900" onClick={handleCloseGraph}>
            <Icon name="x" size={24} />
          </button>
          <div className="absolute top-6 right-0 left-0 z-20 flex flex-col content-center justify-center text-center">
            <div className="text-center pb-2">Degrees of separation</div>
            <div className="flex flex-row justify-center space-x-4">
              {graphData.meta?.userCountByDistance?.map((value, i) => {
                if (i === 0 || value <= 0) return null;
                const isSelected = graphConfig.showDistance === i;
                return (
                  <button
                    key={i}
                    className={`btn bg-gray-900 py-4 h-auto flex-col ${
                      isSelected ? "bg-gray-600 hover:bg-gray-600" : "hover:bg-gray-800"
                    }`}
                    onClick={() => isSelected || updateConfig({ showDistance: i })}>
                    <div className="text-lg block leading-none">{i}</div>
                    <div className="text-xs">({value})</div>
                  </button>
                );
              })}
            </div>
          </div>
          <ForceGraph3D
            graphData={graphData}
            nodeThreeObject={(node: NodeObject<NodeObject<GraphNode>>) => {
              const imgTexture = new THREE.TextureLoader().load(avatar(node));
              imgTexture.colorSpace = THREE.SRGBColorSpace;
              const material = new THREE.SpriteMaterial({ map: imgTexture });
              const sprite = new THREE.Sprite(material);
              sprite.scale.set(12, 12, 1);

              return sprite;
            }}
            nodeLabel={node => `${node.profile?.name || node.address}`}
            nodeAutoColorBy="distance"
            linkAutoColorBy="distance"
            linkDirectionalParticles={0}
            nodeVisibility="visible"
            numDimensions={3}
            linkDirectionalArrowLength={0}
            nodeOpacity={0.9}
          />
          <div className="absolute bottom-6 right-6">
            <button className="text-lg" onClick={() => toggleConnections()}>
              Showing: {graphConfig.direction === Direction.OUTBOUND ? "Outbound" : "All"} connections
            </button>
          </div>
          <div className="absolute bottom-6 left-6">
            <span className="text-lg">Render limit: {graphConfig.renderLimit} nodes</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default NetworkGraph;
