import "./ZapPool.css";

import { ZapPoolPageInner } from "@/Pages/ZapPool/ZapPoolPageInner";
import { ZapPoolController } from "@/Utils/ZapPoolController";

export default function ZapPoolPage() {
  if (!ZapPoolController) {
    return null;
  }
  return <ZapPoolPageInner />;
}
