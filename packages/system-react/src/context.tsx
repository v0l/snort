import { createContext } from "react";
import { SystemInterface } from "@snort/system";

export const SnortContext = createContext<SystemInterface>(undefined!);
