import "./Copy.css";
import Check from "Icons/Check";
import CopyIcon from "Icons/Copy";
import { useCopy } from "useCopy";

export interface CopyProps {
    text: string,
    maxSize?: number
}
export default function Copy({ text, maxSize = 32 }: CopyProps) {
    const { copy, copied, error } = useCopy();
    const sliceLength = maxSize / 2
    const trimmed = text.length > maxSize ? `${text.slice(0, sliceLength)}...${text.slice(-sliceLength)}` : text

    return (
        <div className="flex flex-row copy" onClick={() => copy(text)}>
            <span className="body">
              {trimmed}
            </span>
            <span className="icon" style={{ color: copied ? 'var(--success)' : 'var(--highlight)' }}>
             {copied ? <Check width={13} height={13} />: <CopyIcon width={13} height={13} />}
            </span>
        </div>
    )
}
