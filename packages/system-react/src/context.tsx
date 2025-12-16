import { createContext } from "react";
import type { SystemInterface } from "@snort/system";

export const SnortContext = createContext<SystemInterface>(undefined!);
