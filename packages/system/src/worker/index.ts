
export const enum NostrSystemCommand {
    OkResponse,
    ErrorResponse,
    Init,
    ConnectRelay,
    DisconnectRelay
}

export interface NostrSystemMessage<T> {
  id: string;
  type: NostrSystemCommand;
  data: T;
}
