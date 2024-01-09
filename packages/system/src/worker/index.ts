export const enum WorkerCommand {
  OkResponse,
  ErrorResponse,
  Init,
  ConnectRelay,
  DisconnectRelay,
  Query,
  QueryResult,
}

export interface WorkerMessage<T> {
  id: string;
  type: WorkerCommand;
  data: T;
}
