import type { CachedMetadata } from "@snort/system";
import { FormattedMessage } from "react-intl";

import { BaseUITask } from "@/Components/Tasks/index";
import type { LoginSession } from "@/Utils/Login";
import AsyncButton from "@/Components/Button/AsyncButton";
import useLogin from "@/Hooks/useLogin";

export class PendingChangesTask extends BaseUITask {
  id = "pending-changes";

  check(_meta: CachedMetadata, session: LoginSession): boolean {
    return !this.state.muted && session.state.pendingChanges > 0;
  }

  render() {
    return <PendingChangesContent />;
  }
}

function PendingChangesContent() {
  const session = useLogin();

  const handleSave = async () => {
    await session.state.saveAll();
  };

  return (
    <>
      <p>
        <FormattedMessage defaultMessage="You have unsaved changes to your profile, contacts, relays, or settings." />
      </p>
      <AsyncButton onClick={handleSave}>
        <FormattedMessage defaultMessage="Save Changes" />
      </AsyncButton>
    </>
  );
}
