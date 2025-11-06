import { NostrEvent } from "@snort/system";
import { ReactNode } from "react";
import { FormattedMessage } from "react-intl";

export interface CheckResult {
  id: string;
  passed: boolean;
  weight: number;
  description: ReactNode;
}

export interface ClientEvaluation {
  score: number;
  checks: CheckResult[];
}

export interface FingerprintResult {
  name: string;
  score: number;
  minScore: number;
  allResults: ClientResult[];
}

export interface ClientResult {
  clientName: string;
  score: number;
  checks: CheckResult[];
}

export abstract class FingerprintCheck {
  abstract readonly weight: number;
  abstract readonly id: string;

  abstract evaluate(ev: NostrEvent): boolean;
  abstract getDescription(): ReactNode;

  getResult(ev: NostrEvent): CheckResult {
    return {
      id: this.id,
      passed: this.evaluate(ev),
      weight: this.weight,
      description: this.getDescription(),
    };
  }
}

export class AltTagCheck extends FingerprintCheck {
  readonly weight = 4;
  readonly id = "alt-tag-a-short-note";

  evaluate(ev: NostrEvent): boolean {
    const altTag = ev.tags.find(a => a[0] === "alt")?.[1];
    return altTag?.startsWith("A short note: ") ?? false;
  }

  getDescription(): ReactNode {
    return <FormattedMessage defaultMessage='Alt tag starts with "A short note: "' />;
  }
}

export class PTagNicknameCheck extends FingerprintCheck {
  readonly weight = 3;
  readonly id = "p-tag-nickname";

  evaluate(ev: NostrEvent): boolean {
    return ev.tags.some(a => a[0] === "p" && a.length > 3 && !["root", "reply", "mention"].includes(a[3]));
  }

  getDescription(): ReactNode {
    return <FormattedMessage defaultMessage="P-tag with non-standard marker (nickname)" />;
  }
}

export class DoubleNewlinesBeforeImagesCheck extends FingerprintCheck {
  readonly weight = 1;
  readonly id = "double-newlines-images";

  evaluate(ev: NostrEvent): boolean {
    const hasImages = ev.content.includes(".jpg") || ev.content.includes(".webp");
    return ev.content.includes("\n\nhttp") && hasImages;
  }

  getDescription(): ReactNode {
    return <FormattedMessage defaultMessage="Double newlines before image URLs" />;
  }
}

export class RootTagLastCheck extends FingerprintCheck {
  readonly weight = 3;
  readonly id = "root-tag-last";

  evaluate(ev: NostrEvent): boolean {
    const eTags = ev.tags.filter(a => a[0] === "e");
    const rootTagIndex = ev.tags.findIndex(a => a[0] === "e" && a[3] === "root");
    return rootTagIndex !== -1 && rootTagIndex === ev.tags.length - 1 && eTags.length > 1;
  }

  getDescription(): ReactNode {
    return <FormattedMessage defaultMessage="Root e-tag is last in tags array (with multiple e-tags)" />;
  }
}

export class HasIMetaNoRTagsCheck extends FingerprintCheck {
  readonly weight = 1;
  readonly id = "imeta-no-r-tags";

  evaluate(ev: NostrEvent): boolean {
    const hasImages = ev.content.includes(".jpg") || ev.content.includes(".webp");
    const hasIMeta = ev.tags.some(a => a[0] === "imeta");
    const rTagToImages = ev.tags.some(a => a[0] === "r" && a[1].startsWith("http")) && hasImages;
    return !rTagToImages && hasIMeta;
  }

  getDescription(): ReactNode {
    return <FormattedMessage defaultMessage="Has imeta tags for images, but no r tags" />;
  }
}

export class SingleNewlineBeforeImagesCheck extends FingerprintCheck {
  readonly weight = 1;
  readonly id = "single-newline-images";

  evaluate(ev: NostrEvent): boolean {
    const hasImages = ev.content.includes(".jpg") || ev.content.includes(".webp");
    const doubleNewlines = ev.content.includes("\n\nhttp") && hasImages;
    return ev.content.includes("\nhttp") && hasImages && !doubleNewlines;
  }

  getDescription(): ReactNode {
    return <FormattedMessage defaultMessage="Single newline only before image URLs" />;
  }
}

export class NoIMetaWithImagesCheck extends FingerprintCheck {
  readonly weight = 2;
  readonly id = "no-imeta-with-images";

  evaluate(ev: NostrEvent): boolean {
    const hasImages = ev.content.includes(".jpg") || ev.content.includes(".webp");
    const hasIMeta = ev.tags.some(a => a[0] === "imeta");
    return !hasIMeta && hasImages;
  }

  getDescription(): ReactNode {
    return <FormattedMessage defaultMessage="Has images but no imeta tags" />;
  }
}

export class NoRTagsWithImagesCheck extends FingerprintCheck {
  readonly weight = 1;
  readonly id = "no-r-tags-with-images";

  evaluate(ev: NostrEvent): boolean {
    const hasImages = ev.content.includes(".jpg") || ev.content.includes(".webp");
    const rTagToImages = ev.tags.some(a => a[0] === "r" && a[1].startsWith("http")) && hasImages;
    return !rTagToImages && hasImages;
  }

  getDescription(): ReactNode {
    return <FormattedMessage defaultMessage="Has images but no r tags" />;
  }
}

export class HasRTagsAndIMetaCheck extends FingerprintCheck {
  readonly weight = 2;
  readonly id = "r-tags-and-imeta";

  evaluate(ev: NostrEvent): boolean {
    const hasImages = ev.content.includes(".jpg") || ev.content.includes(".webp");
    const hasIMeta = ev.tags.some(a => a[0] === "imeta");
    const rTagToImages = ev.tags.some(a => a[0] === "r" && a[1].startsWith("http")) && hasImages;
    return rTagToImages && hasIMeta;
  }

  getDescription(): ReactNode {
    return <FormattedMessage defaultMessage="Has both r tags and imeta tags for images" />;
  }
}

export class NewlinesBeforeQuotesCheck extends FingerprintCheck {
  readonly weight = 1;
  readonly id = "newlines-before-quotes";

  evaluate(ev: NostrEvent): boolean {
    return ev.tags.some(a => a[0] === "q") && ev.content.includes("\n\nnostr:");
  }

  getDescription(): ReactNode {
    return <FormattedMessage defaultMessage="Double newlines before quoted notes" />;
  }
}

export class EndsDoubleNewlineCheck extends FingerprintCheck {
  readonly weight = 1;
  readonly id = "ends-double-newline";

  evaluate(ev: NostrEvent): boolean {
    return ev.content.endsWith("\n\n");
  }

  getDescription(): ReactNode {
    return <FormattedMessage defaultMessage="Content ends with double newline" />;
  }
}

export class ClientFingerprint {
  constructor(
    public readonly name: string,
    public readonly checks: FingerprintCheck[],
  ) {}

  evaluate(ev: NostrEvent): ClientEvaluation {
    let score = 0;
    const checkResults = this.checks.map(check => {
      const result = check.getResult(ev);
      if (result.passed) {
        score += result.weight;
      }
      return result;
    });

    return { score, checks: checkResults };
  }
}

export class FingerprintEngine {
  private readonly minScore = 3;
  private readonly clients: ClientFingerprint[];

  constructor() {
    this.clients = [
      new ClientFingerprint("Amethyst", [new AltTagCheck()]),
      new ClientFingerprint("Coracle", [new PTagNicknameCheck()]),
      new ClientFingerprint("Primal Android", [
        new DoubleNewlinesBeforeImagesCheck(),
        new RootTagLastCheck(),
        new HasIMetaNoRTagsCheck(),
      ]),
      new ClientFingerprint("Primal iOS", [new SingleNewlineBeforeImagesCheck()]),
      new ClientFingerprint("Damus iOS", [
        new DoubleNewlinesBeforeImagesCheck(),
        new HasRTagsAndIMetaCheck(),
        new NewlinesBeforeQuotesCheck(),
        new EndsDoubleNewlineCheck(),
      ]),
    ];
  }

  fingerprint(ev: NostrEvent): FingerprintResult | undefined {
    let highestScore = 0;
    let detectedClient: string | undefined;
    const allResults: ClientResult[] = this.clients.map(client => {
      const result = client.evaluate(ev);
      if (result.score >= this.minScore && result.score > highestScore) {
        highestScore = result.score;
        detectedClient = client.name;
      }
      return {
        clientName: client.name,
        score: result.score,
        checks: result.checks,
      };
    });

    if (!detectedClient) return undefined;

    return {
      name: detectedClient,
      minScore: this.minScore,
      score: highestScore,
      allResults,
    };
  }

  getMinScore(): number {
    return this.minScore;
  }
}
