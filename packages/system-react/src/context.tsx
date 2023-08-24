import { createContext } from "react";
import { NostrSystem, SystemInterface } from "@snort/system";

export const SnortContext = createContext<SystemInterface>(new NostrSystem({}));
