import { useEffect, useState } from "react";
import { FormattedMessage } from "react-intl";

import Icon from "@/Components/Icons/Icon";
import useEventPublisher from "@/Hooks/useEventPublisher";
import useLogin from "@/Hooks/useLogin";
import { subscribeToNotifications } from "@/Utils/Notifications";

import messages from "./messages";

interface StatusIndicatorProps {
  status: boolean;
  enabledMessage: React.ComponentProps<typeof FormattedMessage>;
  disabledMessage: React.ComponentProps<typeof FormattedMessage>;
}

const StatusIndicator = ({ status, enabledMessage, disabledMessage }: StatusIndicatorProps) => {
  return status ? (
    <div className="flex items-center">
      <Icon name="check" size={20} className="text-green-500 mr-2" />
      <FormattedMessage {...enabledMessage} />
    </div>
  ) : (
    <div className="flex items-center">
      <Icon name="close" size={20} className="text-red-500 mr-2" />
      <FormattedMessage {...disabledMessage} />
    </div>
  );
};

const PreferencesPage = () => {
  const login = useLogin();
  const { publisher } = useEventPublisher();
  const [serviceWorkerReady, setServiceWorkerReady] = useState(false);
  const hasNotificationsApi = "Notification" in window;
  const [notificationsAllowed, setNotificationsAllowed] = useState(
    hasNotificationsApi && Notification.permission === "granted",
  );
  const [subscribedToPush, setSubscribedToPush] = useState(false);
  const allGood = !login.readonly && hasNotificationsApi && notificationsAllowed && serviceWorkerReady;

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        if (registration.active) {
          setServiceWorkerReady(true);
        }
      });
    }
  }, []);

  const trySubscribePush = async () => {
    try {
      if (allGood && publisher && !subscribedToPush) {
        await subscribeToNotifications(publisher);
        setSubscribedToPush(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    trySubscribePush();
  }, [allGood, publisher]);

  const requestNotificationPermission = () => {
    Notification.requestPermission().then(permission => {
      const allowed = permission === "granted";
      setNotificationsAllowed(allowed);
      if (!allowed) {
        alert("Please allow notifications in your browser settings and try again.");
      }
    });
  };

  if (!login.publicKey) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <h3>
        <FormattedMessage defaultMessage="Notifications" />
      </h3>

      <h4>
        <FormattedMessage defaultMessage="Push notifications" />
      </h4>

      <div className="flex flex-col space-y-4">
        <StatusIndicator
          status={!login.readonly}
          enabledMessage={messages.HasWriteAccess}
          disabledMessage={messages.NoWriteAccess}
        />
        <StatusIndicator
          status={hasNotificationsApi}
          enabledMessage={messages.NotificationsApiEnabled}
          disabledMessage={messages.NotificationsApiDisabled}
        />
        <div className="flex items-center gap-2">
          <StatusIndicator
            status={notificationsAllowed}
            enabledMessage={messages.NotificationsAllowed}
            disabledMessage={messages.NotificationsNotAllowed}
          />
          {hasNotificationsApi && !notificationsAllowed && (
            <button onClick={requestNotificationPermission}>
              <FormattedMessage defaultMessage="Allow" />
            </button>
          )}
        </div>
        <StatusIndicator
          status={serviceWorkerReady}
          enabledMessage={messages.ServiceWorkerRunning}
          disabledMessage={messages.ServiceWorkerNotRunning}
        />
        <div className="flex items-center gap-2">
          <StatusIndicator
            status={subscribedToPush}
            enabledMessage={messages.SubscribedToPush}
            disabledMessage={messages.NotSubscribedToPush}
          />
          {allGood && !subscribedToPush && (
            <button onClick={trySubscribePush}>
              <FormattedMessage defaultMessage="Subscribe" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default PreferencesPage;
