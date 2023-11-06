export interface RelayInfo {
  name?: string;
  description?: string;
  pubkey?: string;
  contact?: string;
  supported_nips?: number[];
  software?: string;
  version?: string;
  limitation?: {
    payment_required: boolean;
    max_subscriptions: number;
    max_filters: number;
    max_event_tags: number;
    auth_required: boolean;
  };
  relay_countries?: Array<string>;
  language_tags?: Array<string>;
  tags?: Array<string>;
  posting_policy?: string;
}
