import React, { memo, useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { NoteProps } from "@/Components/Event/EventComponent";
import { NoteTranslation } from "@/Components/Event/Note/types";
import Reveal from "@/Components/Event/Reveal";
import Text from "@/Components/Text/Text";
import usePreferences from "@/Hooks/usePreferences";

const TEXT_TRUNCATE_LENGTH = 400;
export const NoteText = memo(function InnerContent(
  props: NoteProps & { translated: NoteTranslation | undefined; showTranslation?: boolean },
) {
  const { data: ev, options, translated, showTranslation } = props;
  const showContentWarningPosts = usePreferences(s => s.showContentWarningPosts);
  const [showMore, setShowMore] = useState(false);
  const body = translated && !translated.skipped && showTranslation ? translated.text : (ev?.content ?? "");
  const id = translated && !translated.skipped && showTranslation ? `${ev.id}-translated` : ev.id;
  const shouldTruncate = options?.truncate && body.length > TEXT_TRUNCATE_LENGTH;

  const ToggleShowMore = () => (
    <a
      className="highlight"
      onClick={e => {
        e.preventDefault();
        e.stopPropagation();
        setShowMore(!showMore);
      }}>
      {showMore ? <FormattedMessage defaultMessage="Show less" /> : <FormattedMessage defaultMessage="Show more" />}
    </a>
  );

  const innerContent = (
    <>
      {shouldTruncate && showMore && <ToggleShowMore />}
      <Text
        id={id}
        highlightText={props.highlightText}
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

  if (!showContentWarningPosts) {
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
              . <FormattedMessage defaultMessage="Click here to load anyway" />.{" "}
              <Link to="/settings/moderation">
                <i>
                  <FormattedMessage defaultMessage="Settings" />
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
});
