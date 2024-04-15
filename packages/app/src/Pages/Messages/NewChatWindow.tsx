import { decodeTLV, EventKind } from "@snort/system";
import { useUserSearch } from "@snort/system-react";
import React, { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";

import { ChatType, createChatLink } from "@/chat";
import { Nip28ChatSystem } from "@/chat/nip28";
import Icon from "@/Components/Icons/Icon";
import Modal from "@/Components/Modal/Modal";
import ProfileImage from "@/Components/User/ProfileImage";
import ProfilePreview from "@/Components/User/ProfilePreview";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useFollowsControls from "@/Hooks/useFollowControls";
import useLogin from "@/Hooks/useLogin";
import Nip28ChatProfile from "@/Pages/Messages/Nip28ChatProfile";
import { appendDedupe, debounce } from "@/Utils";
import { LoginSession, LoginStore } from "@/Utils/Login";

export default function NewChatWindow() {
  const [show, setShow] = useState(false);
  const [newChat, setNewChat] = useState<Array<string>>([]);
  const [results, setResults] = useState<Array<string>>([]);
  const [term, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const search = useUserSearch();
  const login = useLogin();
  const { system, publisher } = useEventPublisher();
  const { followList } = useFollowsControls();

  useEffect(() => {
    setNewChat([]);
    setSearchTerm("");
    setResults(followList);
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
      navigate(createChatLink(ChatType.DirectMessage, newChat[0]));
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
          <div className="flex flex-col g16">
            <div className="flex justify-between">
              <h2>
                <FormattedMessage defaultMessage="New Chat" id="UT7Nkj" />
              </h2>
              <button onClick={startChat}>
                <FormattedMessage defaultMessage="Start chat" id="v8lolG" />
              </button>
            </div>
            <div className="flex flex-col g8">
              <h3>
                <FormattedMessage defaultMessage="Search users" id="JjGgXI" />
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
                <FormattedMessage defaultMessage="People you follow" id="R81upa" />
              </p>
              <div className="user-list flex flex-col g2">
                {results.map(a => {
                  return (
                    <ProfilePreview
                      pubkey={a}
                      key={`option-${a}`}
                      options={{ about: false, linkToProfile: false }}
                      actions={<></>}
                      onClick={() => togglePubkey(a)}
                      className={newChat.includes(a) ? "active" : undefined}
                    />
                  );
                })}
                {results.length === 1 && (
                  <Nip28ChatProfile
                    id={results[0]}
                    onClick={async id => {
                      setShow(false);
                      const chats = appendDedupe(login.extraChats, [Nip28ChatSystem.chatId(id)]);
                      LoginStore.updateSession({
                        ...login,
                        extraChats: chats,
                      } as LoginSession);
                      const evList = await publisher?.generic(eb => {
                        eb.kind(EventKind.PublicChatsList);
                        chats.forEach(c => {
                          if (c.startsWith("chat281")) {
                            eb.tag(["e", decodeTLV(c)[0].value as string]);
                          }
                        });
                        return eb;
                      });
                      if (evList) {
                        await system.BroadcastEvent(evList);
                      }
                      navigate(createChatLink(ChatType.PublicGroupChat, id));
                    }}
                  />
                )}
              </div>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
