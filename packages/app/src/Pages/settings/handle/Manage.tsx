import { ManageHandle } from "@/Utils/Nip05/SnortServiceProvider";
import { Navigate, useLocation } from "react-router-dom";
import LNForwardAddress from "./LNAddress";
import TransferHandle from "./TransferHandle";

export default function ManageHandleIndex() {
  const location = useLocation();
  const handle = location.state as ManageHandle;
  if (!handle) {
    return <Navigate to="/settings/handle" />;
  }
  return (
    <>
      <h3 className="nip05">
        {handle.handle}@
        <span className="domain" data-domain={handle.domain?.toLowerCase()}>
          {handle.domain}
        </span>
      </h3>
      <LNForwardAddress handle={handle} />
      <TransferHandle handle={handle} />
    </>
  );
}
