"use client";

import { createContext, startTransition, useContext, type FormHTMLAttributes, type Ref } from "react";

export const PendingCtx = createContext(false);

/**
 * Formulier voor server actions dat de ingevulde waarden NIET wist bij een validatiefout.
 * React 19 reset een formulier na een form action; door de submit zelf af te handelen
 * (preventDefault + startTransition) blijft de invoer staan. Zonder JavaScript valt het
 * terug op de gewone `action`.
 */
export function ActionForm({ action, pending = false, children, ...props }: Omit<FormHTMLAttributes<HTMLFormElement>, "action"> & { action: (fd: FormData) => void | Promise<void>; pending?: boolean; ref?: Ref<HTMLFormElement> }) {
  return (
    <PendingCtx.Provider value={pending}>
      <form
        {...props}
        action={action}
        onSubmit={(e) => {
          props.onSubmit?.(e);
          if (e.defaultPrevented) return;
          e.preventDefault();
          const fd = new FormData(e.currentTarget, (e.nativeEvent as SubmitEvent).submitter);
          startTransition(() => { void action(fd); });
        }}
      >
        {children}
      </form>
    </PendingCtx.Provider>
  );
}

export function useActionPending() {
  return useContext(PendingCtx);
}
