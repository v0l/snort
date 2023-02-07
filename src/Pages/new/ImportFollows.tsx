import { useMemo, useState } from "react";
import { useSelector } from "react-redux";

import { ApiHost } from "Const";
import AsyncButton from "Element/AsyncButton";
import FollowListBase from "Element/FollowListBase";
import { RootState } from "State/Store";
import { bech32ToHex } from "Util";
import { useNavigate } from "react-router-dom";

const TwitterFollowsApi = `${ApiHost}/api/v1/twitter/follows-for-nostr`;

export default function ImportFollows() {
  const navigate = useNavigate();
  const currentFollows = useSelector((s: RootState) => s.login.follows);
  const [twitterUsername, setTwitterUsername] = useState<string>("");
  const [follows, setFollows] = useState<string[]>([]);
  const [error, setError] = useState<string>("");

  const sortedTwitterFollows = useMemo(() => {
    return follows
      .map((a) => bech32ToHex(a))
      .sort((a, b) => (currentFollows.includes(a) ? 1 : -1));
  }, [follows, currentFollows]);

  async function loadFollows() {
    setFollows([]);
    setError("");
    try {
      let rsp = await fetch(`${TwitterFollowsApi}?username=${twitterUsername}`);
      let data = await rsp.json();
      if (rsp.ok) {
        if (Array.isArray(data) && data.length === 0) {
          setError(`No nostr users found for "${twitterUsername}"`);
        } else {
          setFollows(data);
        }
      } else if ("error" in data) {
        setError(data.error);
      } else {
        setError("Failed to load follows, please try again later");
      }
    } catch (e) {
      console.warn(e);
      setError("Failed to load follows, please try again later");
    }
  }

  return (
    <>
      <h2>Import Twitter Follows</h2>
      <p>
        Find your twitter follows on nostr (Data provided by{" "}
        <a href="https://nostr.directory" target="_blank" rel="noreferrer">
          nostr.directory
        </a>
        )
      </p>
      <div className="flex">
        <input
          type="text"
          placeholder="Twitter username.."
          className="f-grow mr10"
          value={twitterUsername}
          onChange={(e) => setTwitterUsername(e.target.value)}
        />
        <AsyncButton onClick={loadFollows}>Check</AsyncButton>
      </div>
      {error.length > 0 && <b className="error">{error}</b>}
      {sortedTwitterFollows.length > 0 && (
        <FollowListBase pubkeys={sortedTwitterFollows} />
      )}

      <button onClick={() => navigate("/new/discover")}>Next</button>
    </>
  );
}
