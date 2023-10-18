import { useState } from "react";
import { useUserProfile } from "@snort/system-react";

import useLogin from "Hooks/useLogin";
import Icon from "Icons/Icon";
import { UITask } from "Tasks";
import { DonateTask } from "./DonateTask";
import { Nip5Task } from "./Nip5Task";
import { RenewSubTask } from "./RenewSubscription";

const AllTasks: Array<UITask> = [new Nip5Task(), new DonateTask()];
if (CONFIG.features.subscriptions) {
  AllTasks.push(new RenewSubTask());
}
AllTasks.forEach(a => a.load());

export const TaskList = () => {
  const session = useLogin();
  const user = useUserProfile(session.publicKey);
  const [, setTick] = useState<number>(0);

  function muteTask(t: UITask) {
    t.mute();
    setTick(x => (x += 1));
  }

  return (
    <>
      {AllTasks.filter(a => (user ? a.check(user, session) : false)).map(a => {
        return (
          <div key={a.id} className="card">
            <div className="header">
              <Icon name="lightbulb" />
              <div className="close" onClick={() => muteTask(a)}>
                <Icon name="close" size={14} />
              </div>
            </div>
            {a.render()}
          </div>
        );
      })}
    </>
  );
};
