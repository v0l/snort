import { delegationToToken, parseDelegationToken, verifyDelegation } from "Nip26";
import { useEffect, useState } from "react";
import { FormattedMessage, useIntl } from "react-intl";
import { useDispatch, useSelector } from "react-redux";
import { setDelegation } from "State/Login";
import { RootState } from "State/Store";

export default function DelegationPage() {
  const dispatch = useDispatch();
  const [from, setFrom] = useState(new Date().toISOString().split("Z")[0]);
  const [to, setTo] = useState(new Date(new Date().getTime() + 1000 * 60 * 60 * 24 * 30).toISOString().split("Z")[0]);

  const delegation = useSelector((s: RootState) => s.login.delegation);
  const [newToken, setNewToken] = useState("");
  const [newDelegator, setNewDelegator] = useState("");
  const [newSig, setNewSig] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (delegation) {
      setNewToken(delegationToToken(delegation));
      setNewDelegator(delegation.delegator ?? "");
      setNewSig(delegation.sig ?? "");
    }
  }, [delegation]);

  async function trySetDelegation() {
    try {
      setError("");
      const parsedToken = parseDelegationToken(newToken);
      parsedToken.sig = newSig;
      parsedToken.delegator = newDelegator;
      console.debug(parsedToken);
      if (!(await verifyDelegation(parsedToken))) {
        throw new Error("Invalid delegation, invalid sig");
      }

      dispatch(setDelegation(parsedToken));
    } catch (e) {
      setError((e as Error).message);
    }
  }

  return (
    <>
      <h3>
        <FormattedMessage defaultMessage="Delegation" />
      </h3>
      <div className="form-group card">
        <div>
          <FormattedMessage defaultMessage="Delegation Token" />
        </div>
        <div>
          <input
            type="text"
            placeholder="nostr:delegation:"
            value={newToken}
            onChange={e => setNewToken(e.target.value)}
          />
        </div>
      </div>
      <div className="form-group card">
        <div>
          <FormattedMessage defaultMessage="Delegator Pubkey" />
        </div>
        <div>
          <input type="text" value={newDelegator} onChange={e => setNewDelegator(e.target.value)} />
        </div>
      </div>
      <div className="form-group card">
        <div>
          <FormattedMessage defaultMessage="Delegator Signature" />
        </div>
        <div>
          <input type="text" value={newSig} onChange={e => setNewSig(e.target.value)} />
        </div>
      </div>
      <button className="button mb10" onClick={() => trySetDelegation()}>
        <FormattedMessage defaultMessage="Save" />
      </button>
      {error && <b className="error m10">{error}</b>}
      <div className="flex mb10">
        <FormattedMessage defaultMessage="OR" />
        <div className="divider w-max"></div>
      </div>
      <div className="form-group card">
        <div>
          <FormattedMessage defaultMessage="Kinds" />
        </div>
        <div>
          <select multiple={true}>
            <option value={0}>[0] SetMetadata</option>
            <option value={1} selected={true}>
              [1] TextNote
            </option>
            <option value={3}>[3] Contacts</option>
            <option value={4}>[4] DM's</option>
            <option value={5}>[5] Delete</option>
            <option value={6}>[6] Repost</option>
            <option value={7} selected={true}>
              [7] Reaction
            </option>
            <option value={9734} selected={true}>
              [9734] Zap
            </option>
            <option value={10_002}>[10002] Relay List Metadata</option>
            <option value={27_235} selected={true}>
              [27235] Snort Nostr Address Managment
            </option>
            <option value={30_000}>[30000] Pubkey lists (Blocked/Muted)</option>
            <option value={30_001}>[30001] Event lists (Pinned/Bookmarked)</option>
          </select>
        </div>
      </div>
      <div className="form-group card">
        <div>
          <FormattedMessage defaultMessage="Valid From" />
        </div>
        <div>
          <input type="datetime-local" value={from} onChange={e => setFrom(e.target.value)} />
        </div>
      </div>
      <div className="form-group card">
        <div>
          <FormattedMessage defaultMessage="Valid Until" />
        </div>
        <div>
          <input type="datetime-local" value={to} onChange={e => setTo(e.target.value)} />
        </div>
      </div>
      <button className="button">
        <FormattedMessage defaultMessage="Show QR" />
      </button>
    </>
  );
}
