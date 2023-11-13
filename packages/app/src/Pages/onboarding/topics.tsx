import { ReactNode, useState } from "react";
import { FormattedMessage } from "react-intl";
import { useNavigate } from "react-router-dom";
import AsyncButton from "Element/AsyncButton";
import classNames from "classnames";
import { appendDedupe } from "SnortUtils";
import useEventPublisher from "Hooks/useEventPublisher";
import { NostrHashtagLink } from "@snort/system";

export const FixedTopics = {
  life: {
    text: <FormattedMessage defaultMessage="Life" />,
    tags: [
      "life",
      "lifestyle",
      "dailyinspiration",
      "motivation",
      "lifelessons",
      "personaldevelopment",
      "happiness",
      "wellbeing",
      "mindfulness",
      "selfcare",
      "positivity",
      "growth",
      "inspiration",
      "lifegoals",
      "mindset",
      "joy",
      "balance",
      "fulfillment",
      "purpose",
      "living",
      "lifetips",
      "lifehacks",
      "wellness",
      "lifejourney",
      "enjoylife",
      "simplepleasures",
      "gratitude",
      "lifeadvice",
      "lifecoaching",
      "lifelove"
    ],
  },
  science: {
    text: <FormattedMessage defaultMessage="Science" />,
    tags: [
      "science",
      "research",
      "innovation",
      "technology",
      "biology",
      "physics",
      "chemistry",
      "astronomy",
      "environment",
      "ecology",
      "geology",
      "neuroscience",
      "genetics",
      "data",
      "experiment",
      "theory",
      "discovery",
      "engineering",
      "mathematics",
      "robotics",
      "artificialintelligence",
      "climate",
      "space",
      "quantum",
      "microbiology",
      "biotechnology",
      "nanotechnology",
      "pharmacology",
      "astrophysics",
      "scientificmethod"
    ],
  },
  nature: {
    text: <FormattedMessage defaultMessage="Nature" />,
    tags: [
      "nature",
      "wildlife",
      "forest",
      "mountains",
      "rivers",
      "oceans",
      "flora",
      "fauna",
      "ecosystem",
      "biodiversity",
      "conservation",
      "habitat",
      "landscape",
      "outdoors",
      "environment",
      "geography",
      "earth",
      "climate",
      "naturalbeauty",
      "wilderness",
      "green",
      "sustainability",
      "wildlifeconservation",
      "nationalpark",
      "gardening",
      "hiking",
      "birdwatching",
      "ecotourism",
      "photography",
      "naturelovers"
    ],
  },
  business: {
    text: <FormattedMessage defaultMessage="Business" />,
    tags: [
      "business",
      "entrepreneurship",
      "marketing",
      "finance",
      "innovation",
      "management",
      "startup",
      "leadership",
      "economics",
      "strategy",
      "branding",
      "sales",
      "technology",
      "investment",
      "networking",
      "growth",
      "corporate",
      "customer",
      "market",
      "productivity",
      "advertising",
      "ecommerce",
      "analytics",
      "humanresources",
      "globalbusiness",
      "digitalmarketing",
      "socialmedia",
      "sustainability",
      "entrepreneur",
      "businessdevelopment"
    ],
  },
  game: {
    text: <FormattedMessage defaultMessage="Game" />,
    tags: [
      "gaming",
      "videogames",
      "esports",
      "multiplayer",
      "onlinegaming",
      "gameplay",
      "streaming",
      "gamer",
      "console",
      "pcgaming",
      "mobilegaming",
      "gamedevelopment",
      "virtualreality",
      "roleplaying",
      "strategygames",
      "actiongames",
      "simulation",
      "indiegames",
      "adventuregames",
      "puzzle",
      "fantasy",
      "scifi",
      "horror",
      "sports",
      "racing",
      "fighting",
      "platformer",
      "mmorpg",
      "retrogaming",
      "arcade"
    ],
  },
  sport: {
    text: <FormattedMessage defaultMessage="Sport" />,
    tags: [
      "sports",
      "athletics",
      "soccer",
      "basketball",
      "baseball",
      "football",
      "tennis",
      "golf",
      "swimming",
      "running",
      "cycling",
      "volleyball",
      "hockey",
      "skiing",
      "boxing",
      "martialarts",
      "gymnastics",
      "cricket",
      "rugby",
      "tabletennis",
      "badminton",
      "fishing",
      "archery",
      "bowling",
      "surfing",
      "skateboarding",
      "motorsports",
      "equestrian",
      "fitness",
      "yoga"
    ],
  },
  photography: {
    text: <FormattedMessage defaultMessage="Photography" />,
    tags: [
      "photography",
      "landscape",
      "portrait",
      "naturephotography",
      "streetphotography",
      "blackandwhite",
      "travelphotography",
      "macro",
      "wildlifephotography",
      "urbanphotography",
      "nightphotography",
      "fashionphotography",
      "fineartphotography",
      "documentary",
      "sportsphotography",
      "foodphotography",
      "architecturalphotography",
      "candid",
      "aerialphotography",
      "underwaterphotography",
      "filmphotography",
      "digitalphotography",
      "photographytips",
      "photoediting",
      "photographygear",
      "lighting",
      "composition",
      "exposure",
      "photographyworkshop",
      "photographyart"
    ],
  },
};

export function Topics() {
  const { publisher, system } = useEventPublisher();
  const [topics, setTopics] = useState<Array<string>>([]);
  const navigate = useNavigate();

  function tab(name: string, text: ReactNode) {
    const active = topics.includes(name);
    return (
      <div
        className={classNames("tab", { active })}
        onClick={() => setTopics(s => (active ? s.filter(a => a !== name) : appendDedupe(s, [name])))}>
        {text}
      </div>
    );
  }

  return (
    <div className="flex flex-col g24 text-center">
      <h1>
        <FormattedMessage defaultMessage="Pick a few topics of interest" />
      </h1>
      <div className="tabs flex-wrap justify-center">{Object.entries(FixedTopics).map(([k, v]) => tab(k, v.text))}</div>
      <AsyncButton
        className="primary"
        onClick={async () => {
          const tags = Object.entries(FixedTopics)
            .filter(([k]) => topics.includes(k))
            .map(([, v]) => v.tags)
            .flat()
            .map(a => new NostrHashtagLink(a));

          if (tags.length > 0) {
            const ev = await publisher?.bookmarks(tags, "follow");
            if (ev) {
              await system.BroadcastEvent(ev);
            }
          }
          navigate("/login/sign-up/discover");
        }}>
        <FormattedMessage defaultMessage="Next" />
      </AsyncButton>
    </div>
  );
}
