import "./Copy.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCopy, faCheck } from "@fortawesome/free-solid-svg-icons";
import { useCopy } from "../useCopy";

export default function Copy(props) {

    const { copy, copied, error } = useCopy();
    return (
        <div className="flex flex-row copy" onClick={() => copy(props.text)}>
            <FontAwesomeIcon
                icon={copied ? faCheck : faCopy}
                size="xs"
                style={{ color: copied ? 'green' : 'currentColor', marginRight: '2px' }}
            />
            <p className="body">
                {props.text}
            </p>
        </div>
    )
}