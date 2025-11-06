import { NostrLink } from "@snort/system";
import { useState } from "react";
import { FormattedMessage } from "react-intl";
import { Link } from "react-router-dom";

import { useArticles } from "@/Feed/ArticlesFeed";
import { findTag } from "@/Utils";

import IconButton from "../Button/IconButton";
import { ProxyImg } from "../ProxyImg";
import ProfilePreview from "../User/ProfilePreview";
import { BaseWidget } from "./base";

export default function LatestArticlesWidget() {
  const [idx, setIdx] = useState(0);
  const articles = useArticles();
  const selected = articles.at(idx);

  function next(i: number) {
    setIdx(x => {
      x += i;
      if (x < 0) {
        x = articles.length - 1;
      } else if (x > articles.length) {
        x = 0;
      }
      return x;
    });
  }

  if (!selected) return;
  const link = NostrLink.fromEvent(selected);
  const image = findTag(selected, "image");
  const title = findTag(selected, "title");
  return (
    <BaseWidget title={<FormattedMessage defaultMessage="Latest Articles" />}>
      <div className="flex flex-col gap-4">
        <Link
          to={`/${link.encode()}`}
          className="relative rounded-lg overflow-hidden w-full aspect-video"
          state={selected}>
          {image ? (
            <ProxyImg src={image} className="absolute w-full h-full object-cover object-center" />
          ) : (
            <div className="absolute w-full h-full object-fit bg-neutral-800"></div>
          )}
          <div className="absolute bottom-2 left-4 right-4 px-2 py-1 rounded-lg text-lg font-bold text-white bg-black/50">
            {title}
          </div>
        </Link>
        <div>
          <ProfilePreview
            pubkey={selected.pubkey}
            profileImageProps={{
              subHeader: <></>,
            }}
            actions={
              <div className="flex gap-2">
                <IconButton icon={{ name: "arrowFront", className: "rotate-180", size: 14 }} onClick={() => next(-1)} />
                <IconButton icon={{ name: "arrowFront", size: 14 }} onClick={() => next(1)} />
              </div>
            }
          />
        </div>
      </div>
    </BaseWidget>
  );
}
