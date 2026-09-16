"use client";

import * as React from "react";
import type { ToastActionElement } from "@/components/ui/toast";

const TOAST_LIMIT = 3;
const TOAST_REMOVE_DELAY = 5000;

type ToasterToast = {
  id: string;
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: ToastActionElement;
  variant?: "default" | "success" | "danger";
  open: boolean;
};

type Action =
  | { type: "ADD"; toast: ToasterToast }
  | { type: "DISMISS"; toastId?: string }
  | { type: "REMOVE"; toastId?: string };

let count = 0;
function genId() {
  count = (count + 1) % Number.MAX_SAFE_INTEGER;
  return count.toString();
}

const listeners: Array<(state: ToasterToast[]) => void> = [];
let memoryState: ToasterToast[] = [];
const timeouts = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleRemoval(toastId: string) {
  if (timeouts.has(toastId)) return;
  const timeout = setTimeout(() => {
    timeouts.delete(toastId);
    dispatch({ type: "REMOVE", toastId });
  }, TOAST_REMOVE_DELAY);
  timeouts.set(toastId, timeout);
}

function reducer(state: ToasterToast[], action: Action): ToasterToast[] {
  switch (action.type) {
    case "ADD":
      return [action.toast, ...state].slice(0, TOAST_LIMIT);
    case "DISMISS":
      if (action.toastId) scheduleRemoval(action.toastId);
      else state.forEach((t) => scheduleRemoval(t.id));
      return state.map((t) =>
        t.id === action.toastId || action.toastId === undefined ? { ...t, open: false } : t
      );
    case "REMOVE":
      if (action.toastId === undefined) return [];
      return state.filter((t) => t.id !== action.toastId);
  }
}

function dispatch(action: Action) {
  memoryState = reducer(memoryState, action);
  listeners.forEach((listener) => listener(memoryState));
}

type Toast = Omit<ToasterToast, "id" | "open">;

function toast(props: Toast) {
  const id = genId();

  const update = (props: Partial<ToasterToast>) =>
    dispatch({ type: "ADD", toast: { ...props, id, open: true } as ToasterToast });
  const dismiss = () => dispatch({ type: "DISMISS", toastId: id });

  dispatch({
    type: "ADD",
    toast: { ...props, id, open: true },
  });

  return { id, update, dismiss };
}

function useToast() {
  const [state, setState] = React.useState<ToasterToast[]>(memoryState);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const index = listeners.indexOf(setState);
      if (index > -1) listeners.splice(index, 1);
    };
  }, []);

  return {
    toasts: state,
    toast,
    dismiss: (toastId?: string) => dispatch({ type: "DISMISS", toastId }),
  };
}

export { useToast, toast };
