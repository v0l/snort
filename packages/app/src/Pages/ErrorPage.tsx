import debug from "debug";
import { FormattedMessage } from "react-intl";
import { useRouteError } from "react-router-dom";

import AsyncButton from "@/Components/Button/AsyncButton";
import { db } from "@/Db";

const log = debug("ErrorPage");

const ErrorPage = () => {
  const error = useRouteError();

  console.error(error);

  const clearOPFSData = async () => {
    if ("showDirectoryPicker" in window) {
      try {
        // Request access to the root directory
        const rootDirectoryHandle = await window.showDirectoryPicker();
        // Recursively delete contents
        for await (const entry of rootDirectoryHandle.values()) {
          if (entry.kind === "file") {
            await entry.remove();
          } else if (entry.kind === "directory") {
            await entry.removeRecursively();
          }
        }
        log("OPFS data cleared successfully.");
      } catch (e) {
        log("Error clearing OPFS data:", e);
      }
    } else {
      log("File System Access API is not supported in this browser.");
    }
  };

  const handleClearData = async () => {
    await db.delete(); // Delete IndexedDB
    globalThis.localStorage.clear(); // Clear localStorage
    await clearOPFSData(); // Attempt to clear OPFS data
    globalThis.location.href = "/"; // Redirect to home
  };

  return (
    <div className="p-2">
      <h4>
        <FormattedMessage defaultMessage="An error has occured!" id="FfYsOb" />
      </h4>
      <AsyncButton onClick={handleClearData}>
        <FormattedMessage defaultMessage="Clear cache and reload" id="HWbkEK" />
      </AsyncButton>
      <h5>{error.message}</h5>
      <div className="my-2">{error.message}</div>
      <pre className="my-2 whitespace-pre-wrap">{error.stack}</pre>
    </div>
  );
};

export default ErrorPage;
