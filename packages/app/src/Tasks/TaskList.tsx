import "./TaskList.css";
import {Fragment, useSyncExternalStore} from "react";
import { useUserProfile } from "@snort/system-react";

import useLogin from "@/Hooks/useLogin";
import Icon from "@/Icons/Icon";
import { UITask } from "@/Tasks";
import { DonateTask } from "./DonateTask";
import { Nip5Task } from "./Nip5Task";
import { RenewSubTask } from "./RenewSubscription";
import { NoticeZapPoolDefault } from "./NoticeZapPool";
import { BackupKeyTask } from "./BackupKey";
import { ExternalStore } from "@snort/shared";
import CloseButton from "@/Element/Button/CloseButton";

class TaskStore extends ExternalStore<Array<UITask>> {
  #tasks: Array<UITask>;

  constructor() {
    super();
    const AllTasks: Array<UITask> = [new BackupKeyTask(), new Nip5Task(), new DonateTask(), new NoticeZapPoolDefault()];
    if (CONFIG.features.subscriptions) {
      AllTasks.push(new RenewSubTask());
    }
    AllTasks.forEach(a =>
      a.load(() => {
        this.notifyChange();
      }),
    );
    this.#tasks = AllTasks;
  }

  takeSnapshot(): UITask[] {
    return [...this.#tasks];
  }
}

const AllTasks = new TaskStore();
export const TaskList = () => {
  const session = useLogin();
  const user = useUserProfile(session.publicKey);
  const tasks = useSyncExternalStore(
    c => AllTasks.hook(c),
    () => AllTasks.snapshot(),
  );

  function muteTask(t: UITask) {
    t.mute();
  }

  return (
    <div className="task-list">
      {tasks
        .filter(a => (user ? a.check(user, session) : false))
        .map(a => {
          if (a.noBaseStyle) {
            return (
              <Fragment key={a.id}>
                {a.render()}
              </Fragment>
            );
          } else {
            return (
              <div key={a.id} className="card">
                <div className="header">
                  <Icon name="lightbulb" />
                  <CloseButton onClick={() => muteTask(a)} />
                </div>
                {a.render()}
              </div>
            );
          }
        })}
    </div>
  );
};
