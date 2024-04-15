import { NodeObject } from "react-force-graph-3d";

import { proxyImg } from "@/Hooks/useImgProxy";
import { GraphNode } from "@/Pages/NetworkGraph/types";
import { defaultAvatar } from "@/Utils";
import { LoginStore } from "@/Utils/Login";

export const avatar = (node: NodeObject<NodeObject<GraphNode>>) => {
  const login = LoginStore.snapshot();
  return node.profile?.picture
    ? proxyImg(node.profile?.picture, login.appData.json.preferences.imgProxyConfig)
    : defaultAvatar(node.address);
};
