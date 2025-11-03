import { ExternalStore } from "@snort/shared";
import { useUserProfile } from "@snort/system-react";
import { Fragment, useSyncExternalStore } from "react";

import CloseButton from "@/Components/Button/CloseButton";
import Icon from "@/Components/Icons/Icon";
import { UITask } from "@/Components/Tasks/index";
import useLogin from "@/Hooks/useLogin";

import { BackupKeyTask } from "./BackupKey";
import { DonateTask } from "./DonateTask";
import { FollowMorePeopleTask } from "./FollowMorePeople";
import { Nip5Task } from "./Nip5Task";
import { NoticeZapPoolDefault } from "./NoticeZapPool";
import { PendingChangesTask } from "./PendingChangesTask";
import { RenewSubTask } from "./RenewSubscription";
import { BaseWidget } from "../RightWidgets/base";

class TaskStore extends ExternalStore<Array<UITask>> {
  #tasks: Array<UITask>;

  constructor() {
    super();
    const AllTasks: Array<UITask> = [
      new BackupKeyTask(),
      new PendingChangesTask(),
      new FollowMorePeopleTask(),
      new Nip5Task(),
    ];
    if (CONFIG.features.zapPool) {
      AllTasks.push(new NoticeZapPoolDefault());
    }
    if (CONFIG.features.subscriptions) {
      AllTasks.push(new RenewSubTask());
    }
    AllTasks.push(new DonateTask());
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

export function TaskList() {
  const tasks = useSyncExternalStore(
    c => AllTasks.hook(c),
    () => AllTasks.snapshot(),
  );
  const session = useLogin();
  const user = useUserProfile(session.publicKey);
  const currentTasks = tasks.filter(a => (user ? a.check(user, session) : false)).slice(0, 1);
  if (currentTasks.length === 0) return;
  return (
    <div className="flex">
      {currentTasks.map(a => {
        if (a.noBaseStyle) {
          return <Fragment key={a.id}>{a.render()}</Fragment>;
        } else {
          return (
            <BaseWidget
              key={a.id}
              contextMenu={<CloseButton onClick={() => a.mute()} />}
              icon="lightbulb"
              title={<></>}>
              {a.render()}
            </BaseWidget>
          );
        }
      })}
    </div>
  );
}
