"use client";

import { useRef, useState, useTransition } from "react";

/** Start the request immediately, but give its feedback a stable, readable lifetime. */
export const useMutation = <Input, Result>({
  action,
  initialState,
  failureState,
  onResult,
}: {
  action: (input: Input) => Promise<Result>;
  initialState: Result;
  failureState: Result;
  onResult?: (result: Result) => void;
}) => {
  const [state, setState] = useState(initialState);
  const [pending, startTransition] = useTransition();
  const inFlight = useRef(false);

  const run = (input: Input) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setState(initialState);
    startTransition(async () => {
      const feedbackDuration = new Promise<void>((resolve) => setTimeout(resolve, 450));
      let result: Result;
      try {
        result = await action(input);
      } catch {
        result = failureState;
      }
      await feedbackDuration;
      startTransition(() => {
        setState(result);
        onResult?.(result);
      });
      inFlight.current = false;
    });
  };

  const clear = () => setState(initialState);
  const mutation = { state, pending, run, clear };

  return mutation;
};
