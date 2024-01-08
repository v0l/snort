import React, { useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { NoteProps } from "@/Components/Event/EventComponent";
import { NoteTranslation } from "@/Components/Event/Note/NoteContextMenu";
import Reveal from "@/Components/Event/Reveal";
import Text from "@/Components/Text/Text";
import useLogin from "@/Hooks/useLogin";

const TEXT_TRUNCATE_LENGTH = 400;
export const NoteText = function InnerContent(
  props: NoteProps & { translated: NoteTranslation; showTranslation?: boolean },
) {
  const { data: ev, options, translated, showTranslation } = props;
  const appData = useLogin(s => s.appData);
  const [showMore, setShowMore] = useState(false);
  const body = translated && showTranslation ? translated.text : ev?.content ?? "";
  const id = translated && showTranslation ? `${ev.id}-translated` : ev.id;
  const shouldTruncate = options?.truncate && body.length > TEXT_TRUNCATE_LENGTH;

  const ToggleShowMore = () => (
    <a
      className="highlight"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        setShowMore(!showMore);
      }}>
      {showMore ? (
        <FormattedMessage defaultMessage="Show less" id="qyJtWy" />
      ) : (
        <FormattedMessage defaultMessage="Show more" id="aWpBzj" />
      )}
    </a>
  );

  const innerContent = (
    <>
      {shouldTruncate && showMore && <ToggleShowMore />}
      <Text
        id={id}
        highlighText={props.searchedValue}
        content={body}
        tags={ev.tags}
        creator={ev.pubkey}
        depth={props.depth}
        disableMedia={!(options?.showMedia ?? true)}
        disableMediaSpotlight={!(props.options?.showMediaSpotlight ?? true)}
        truncate={shouldTruncate && !showMore ? TEXT_TRUNCATE_LENGTH : undefined}
      />
      {shouldTruncate && !showMore && <ToggleShowMore />}
    </>
  );

  if (!appData.item.showContentWarningPosts) {
    const contentWarning = ev.tags.find(a => a[0] === "content-warning");
    if (contentWarning) {
      return (
        <Reveal
          message={
            <>
              <FormattedMessage
                defaultMessage="The author has marked this note as a <i>sensitive topic</i>"
                id="StKzTE"
                values={{
                  i: c => <i>{c}</i>,
                }}
              />
              {contentWarning[1] && (
                <>
                  &nbsp;
                  <FormattedMessage
                    defaultMessage="Reason: <i>{reason}</i>"
                    id="6OSOXl"
                    values={{
                      i: c => <i>{c}</i>,
                      reason: contentWarning[1],
                    }}
                  />
                </>
              )}
              . <FormattedMessage defaultMessage="Click here to load anyway" id="IoQq+a" />.{" "}
              <Link to="/settings/moderation">
                <i>
                  <FormattedMessage defaultMessage="Settings" id="D3idYv" />
                </i>
              </Link>
            </>
          }>
          {innerContent}
        </Reveal>
      );
    }
  }
  return innerContent;
};
