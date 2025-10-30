import { useUserSearch } from "@snort/system-react";
import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import { ChatType, createChatLink } from "@/chat";
import Icon from "@/Components/Icons/Icon";
import Modal from "@/Components/Modal/Modal";
import ProfileImage from "@/Components/User/ProfileImage";
import ProfilePreview from "@/Components/User/ProfilePreview";
import useFollowsControls from "@/Hooks/useFollowControls";
import { appendDedupe, debounce } from "@/Utils";

export default function NewChatWindow() {
  const [show, setShow] = useState(false);
  const [newChat, setNewChat] = useState<Array<string>>([]);
  const [results, setResults] = useState<Array<string>>([]);
  const [term, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const search = useUserSearch();
  const { followList } = useFollowsControls();

  useEffect(() => {
    setNewChat([]);
    setSearchTerm("");
    setResults(followList.slice(0, 5));
  }, [show]);

  useEffect(() => {
    return debounce(500, () => {
      if (term) {
        search(term).then(setResults);
      } else {
        setResults(followList);
      }
    });
  }, [term]);

  function togglePubkey(a: string) {
    setNewChat(c => (c.includes(a) ? c.filter(v => v !== a) : appendDedupe(c, [a])));
  }

  function startChat() {
    setShow(false);
    if (newChat.length === 1) {
      navigate(createChatLink(ChatType.PrivateDirectMessage, newChat[0]));
    } else {
      navigate(createChatLink(ChatType.PrivateGroupChat, ...newChat));
    }
  }

  return (
    <>
      <button type="button" className="flex justify-center new-chat" onClick={() => setShow(true)}>
        <Icon name="plus" size={16} />
      </button>
      {show && (
        <Modal id="new-chat" onClose={() => setShow(false)} className="new-chat-modal">
          <div className="flex flex-col gap-4">
            <div className="flex justify-between">
              <h2>
                <FormattedMessage defaultMessage="New Chat" />
              </h2>
              <button onClick={startChat}>
                <FormattedMessage defaultMessage="Start chat" />
              </button>
            </div>
            <div className="flex flex-col gap-2">
              <h3>
                <FormattedMessage defaultMessage="Search users" />
              </h3>
              <input
                type="text"
                placeholder="npub/nprofile/nostr address"
                value={term}
                onChange={e => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex">
              {newChat.map(a => (
                <ProfileImage
                  key={`selected-${a}`}
                  pubkey={a}
                  showUsername={false}
                  link=""
                  onClick={() => togglePubkey(a)}
                />
              ))}
            </div>
            <div>
              <p>
                <FormattedMessage defaultMessage="People you follow" />
              </p>
              <div className="user-list flex flex-col gap-0.5">
                {results.map(a => {
                  return (
                    <ProfilePreview
                      pubkey={a}
                      key={`option-${a}`}
                      profileImageProps={{
                        link: "",
                      }}
                      options={{ about: false }}
                      actions={<></>}
                      onClick={() => togglePubkey(a)}
                      className={newChat.includes(a) ? "active" : undefined}
                    />
                  );
                })}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
