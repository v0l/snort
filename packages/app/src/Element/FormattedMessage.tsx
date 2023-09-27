import { useState, useEffect, FC, ComponentProps } from "react";
import { useIntl, FormattedMessage } from "react-intl";

type ExtendedProps = ComponentProps<typeof FormattedMessage>;

const ExtendedFormattedMessage: FC<ExtendedProps> = props => {
  const { id, defaultMessage, values } = props;
  const { formatMessage } = useIntl();

  const [processedMessage, setProcessedMessage] = useState<string | null>(null);

  useEffect(() => {
    const translatedMessage = formatMessage({ id, defaultMessage }, values);
    if (typeof translatedMessage === "string") {
      setProcessedMessage(translatedMessage.replace("Snort", process.env.APP_NAME_CAPITALIZED || "Snort"));
    }
  }, [id, defaultMessage, values, formatMessage]);

  return <>{processedMessage}</>;
};

export default ExtendedFormattedMessage;
