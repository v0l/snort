import { Navigate, useLocation } from "react-router-dom";

import type { ManageHandle } from "@/Utils/Nip05/SnortServiceProvider";

import LNForwardAddress from "./LNAddress";
import TransferHandle from "./TransferHandle";
import Nip05 from "@/Components/User/Nip05";

export default function ManageHandleIndex() {
  const location = useLocation();
  const handle = location.state as ManageHandle;
  if (!handle) {
    return <Navigate to="/settings/handle" />;
  }
  return (
    <div className="flex flex-col gap-4">
      <h4>
        <Nip05 nip05={`${handle.handle}@${handle.domain}`} />
      </h4>
      <LNForwardAddress handle={handle} />
      <TransferHandle handle={handle} />
    </div>
  );
}
