import { useCallback, useMemo } from "react";
import { api } from "../bridge";
import { useAppDispatch, useAppState } from "./AppStore";
import type { PermissionMode } from "./reducer";
import type { Task } from "./types";

/**
 * The operations that change something on the other side of the bridge.
 *
 * Components dispatch reducer actions for anything local (which panel is open, which tab
 * is selected) and call these for anything the sidecar owns — task ids, credentials,
 * running commands. Keeping the two apart stops the UI from inventing state the backend
 * will later contradict.
 */
export interface BridgeActions {
  openWorkspace: (path: string) => Promise<void>;
  refreshFileTree: () => Promise<void>;
  createTask: (title: string, projectId: string | null) => Promise<Task | null>;
  sendMessage: (text: string) => Promise<void>;
  respondPermission: (approved: boolean) => Promise<void>;
  runCommand: (tabId: string, command: string) => Promise<void>;
  setPermissionMode: (mode: PermissionMode) => Promise<void>;
  setThoughtLevel: (level: string) => Promise<void>;
  setShowReasoning: (value: boolean) => Promise<void>;
  setShowTodos: (value: boolean) => Promise<void>;
  setProvider: (patch: Record<string, unknown>) => Promise<void>;
  setApiKey: (ref: string, value: string | null) => Promise<void>;
  getApiKey: (ref: string) => Promise<string | null>;
}

export function useBridgeActions(): BridgeActions {
  const state = useAppState();
  const dispatch = useAppDispatch();

  const openWorkspace = useCallback(async (path: string) => {
    const result = await api.openWorkspace(path);
    dispatch({ type: "workspace/set", path: result.workspace });
    dispatch({ type: "projects/hydrate", projects: [result.project as never] });
    const tree = await api.fileTree();
    dispatch({ type: "fileTree/set", entries: tree.tree.children ?? [], truncated: tree.truncated });
  }, [dispatch]);

  const refreshFileTree = useCallback(async () => {
    const tree = await api.fileTree();
    dispatch({ type: "fileTree/set", entries: tree.tree.children ?? [], truncated: tree.truncated });
  }, [dispatch]);

  const createTask = useCallback(async (title: string, projectId: string | null) => {
    const task = (await api.createTask(title, projectId)) as Task;
    dispatch({ type: "tasks/upsert", task });
    dispatch({ type: "tasks/select", taskId: task.id });
    return task;
  }, [dispatch]);

  const sendMessage = useCallback(async (text: string) => {
    let taskId = state.activeTaskId;
    if (!taskId) {
      const task = await createTask("New task", null);
      taskId = task?.id ?? null;
    }
    if (!taskId) return;
    // The transcript patch lands via the event stream; the reducer reads the active task.
    dispatch({ type: "tasks/select", taskId });
    await api.sendMessage(taskId, text);
  }, [createTask, dispatch, state.activeTaskId]);

  const respondPermission = useCallback(
    async (approved: boolean) => {
      if (!state.activeTaskId) return;
      await api.respondPermission(state.activeTaskId, approved);
    },
    [state.activeTaskId],
  );

  const runCommand = useCallback(
    async (tabId: string, command: string) => {
      const taskId = state.activeTaskId ?? "workspace";
      dispatch({ type: "terminal/appendOutput", tabId, line: `$ ${command}` });
      await api.runCommand(taskId, tabId, command);
    },
    [dispatch, state.activeTaskId],
  );

  const setPermissionMode = useCallback(async (mode: PermissionMode) => {
    dispatch({ type: "composer/setPermissionMode", mode });
    await api.patchSettings({ permissionMode: mode });
  }, [dispatch]);

  const setThoughtLevel = useCallback(async (level: string) => {
    dispatch({ type: "composer/setThoughtLevel", level });
    await api.patchSettings({ thoughtLevel: level });
  }, [dispatch]);

  const setShowReasoning = useCallback(async (value: boolean) => {
    dispatch({ type: "display/setShowReasoning", value });
    await api.patchSettings({ showReasoning: value });
  }, [dispatch]);

  const setShowTodos = useCallback(async (value: boolean) => {
    dispatch({ type: "display/setShowTodos", value });
    await api.patchSettings({ showTodos: value });
  }, [dispatch]);

  const setProvider = useCallback(async (patch: Record<string, unknown>) => {
    await api.patchSettings({ model: patch });
  }, []);

  const setApiKey = useCallback(async (ref: string, value: string | null) => {
    await api.setCredential(ref, value);
  }, []);

  const getApiKey = useCallback((ref: string) => api.getCredential(ref), []);

  return useMemo(
    () => ({
      openWorkspace,
      refreshFileTree,
      createTask,
      sendMessage,
      respondPermission,
      runCommand,
      setPermissionMode,
      setThoughtLevel,
      setShowReasoning,
      setShowTodos,
      setProvider,
      setApiKey,
      getApiKey,
    }),
    [
      openWorkspace,
      refreshFileTree,
      createTask,
      sendMessage,
      respondPermission,
      runCommand,
      setPermissionMode,
      setThoughtLevel,
      setShowReasoning,
      setShowTodos,
      setProvider,
      setApiKey,
      getApiKey,
    ],
  );
}