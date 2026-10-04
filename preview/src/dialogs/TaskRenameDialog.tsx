import { useEffect, useRef, useState } from "react";
import { useIntl } from "../i18n";
import { useAppDispatch, useAppState } from "../store/AppStore";
import { getTask } from "../store/selectors";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "../components/ui/dialog";

/** Rename a task. Enter confirms, except while an IME candidate is being picked —
 *  confirming there would submit the half-typed pinyin. */
export function TaskRenameDialog() {
  const state = useAppState();
  const dispatch = useAppDispatch();
  const intl = useIntl();

  const task = getTask(state, state.renameTaskId);
  const [title, setTitle] = useState("");
  const composingRef = useRef(false);
  const lastTaskIdRef = useRef<string | null>(null);

  // Seed the draft only when a *different* task opens the dialog, so re-opening the
  // same task doesn't clobber what the user is typing.
  if (task && task.id !== lastTaskIdRef.current) {
    lastTaskIdRef.current = task.id;
    if (title !== task.title) setTitle(task.title);
  }

  useEffect(() => {
    if (!task) lastTaskIdRef.current = null;
  }, [task]);

  if (!task) return null;

  const confirm = () => {
    const trimmed = title.trim();
    if (!trimmed) return;
    dispatch({ type: "tasks/rename", taskId: task.id, title: trimmed });
    dispatch({ type: "dialog/setRenameTask", taskId: null });
  };

  return (
    <Dialog open onOpenChange={(open) => !open && dispatch({ type: "dialog/setRenameTask", taskId: null })}>
      <DialogContent className="max-w-xl overflow-hidden rounded-2xl p-0">
        <div className="flex min-w-0 flex-col gap-6 p-6">
          <DialogHeader className="space-y-2">
            <DialogTitle>{intl.formatMessage({ id: "dialog.rename.title" })}</DialogTitle>
          </DialogHeader>

          <Input
            autoFocus
            value={title}
            placeholder={intl.formatMessage({ id: "taskList.renamePlaceholder" })}
            onChange={(event) => setTitle(event.target.value)}
            onCompositionStart={() => {
              composingRef.current = true;
            }}
            onCompositionEnd={() => {
              composingRef.current = false;
            }}
            onKeyDown={(event) => {
              if (event.key !== "Enter") return;
              if (composingRef.current || event.nativeEvent.isComposing) return;
              event.preventDefault();
              confirm();
            }}
          />

          <DialogFooter className="flex items-center justify-end gap-3">
            <Button variant="secondary" size="lg" className="h-10 px-5" onClick={() => dispatch({ type: "dialog/setRenameTask", taskId: null })}>
              {intl.formatMessage({ id: "common.cancel" })}
            </Button>
            <Button size="lg" className="h-10 px-5" onClick={confirm}>
              {intl.formatMessage({ id: "common.confirm" })}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
}