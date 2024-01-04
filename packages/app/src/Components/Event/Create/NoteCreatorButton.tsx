import classNames from "classnames";
import { useMemo,useRef } from "react";
import { FormattedMessage } from "react-intl";
import { useLocation } from "react-router-dom";

import Icon from "@/Components/Icons/Icon";
import useKeyboardShortcut from "@/Hooks/useKeyboardShortcut";
import useLogin from "@/Hooks/useLogin";
import { useNoteCreator } from "@/State/NoteCreator";
import { isFormElement } from "@/Utils";

import { NoteCreator } from "./NoteCreator";

export const NoteCreatorButton = ({
  className,
  alwaysShow,
  showText,
}: {
  className?: string;
  alwaysShow?: boolean;
  showText?: boolean;
}) => {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const { readonly } = useLogin(s => ({ readonly: s.readonly }));
  const { show, replyTo, update } = useNoteCreator(v => ({ show: v.show, replyTo: v.replyTo, update: v.update }));

  useKeyboardShortcut("n", event => {
    // if event happened in a form element, do nothing, otherwise focus on search input
    if (event.target && !isFormElement(event.target as HTMLElement)) {
      event.preventDefault();
      if (buttonRef.current) {
        buttonRef.current.click();
      }
    }
  });

  const shouldHideNoteCreator = useMemo(() => {
    if (alwaysShow) {
      return false;
    }
    const isReply = replyTo && show;
    const hideOn = [
      "/settings",
      "/messages",
      "/new",
      "/login",
      "/donate",
      "/e",
      "/nevent",
      "/note1",
      "/naddr",
      "/subscribe",
    ];
    return (readonly || hideOn.some(a => location.pathname.startsWith(a))) && !isReply;
  }, [location, readonly]);

  return (
    <>
      {!shouldHideNoteCreator && (
        <button
          ref={buttonRef}
          className={classNames(
            "aspect-square flex flex-row items-center primary rounded-full",
            { "xl:aspect-auto": showText },
            className,
          )}
          onClick={() =>
            update(v => {
              v.replyTo = undefined;
              v.show = true;
            })
          }>
          <Icon name="plus" size={16} />
          {showText && (
            <span className="ml-2 hidden xl:inline">
              <FormattedMessage defaultMessage="New Note" id="2mcwT8" />
            </span>
          )}
        </button>
      )}
      <NoteCreator key="global-note-creator" />
    </>
  );
};
