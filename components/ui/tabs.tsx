"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

const Tabs = TabsPrimitive.Root;

const TabsList = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(({ className, ...props }, forwardedRef) => {
  const listRef = React.useRef<HTMLDivElement | null>(null);

  /**
   * Bring the selected tab into the strip when it starts out beyond the edge
   * — arriving at ?tab=following on a phone otherwise shows a strip that
   * looks like it opened on the first tab.
   *
   * scrollLeft is set on the strip directly rather than using
   * scrollIntoView, which is free to scroll the page as well as the strip.
   */
  React.useEffect(() => {
    const list = listRef.current;
    if (!list || list.scrollWidth <= list.clientWidth) return;
    const active = list.querySelector<HTMLElement>('[data-state="active"]');
    if (!active) return;
    const offset = active.offsetLeft - (list.clientWidth - active.offsetWidth) / 2;
    list.scrollLeft = Math.max(0, offset);
  }, []);

  return (
  <TabsPrimitive.List
    ref={(node) => {
      listRef.current = node;
      if (typeof forwardedRef === "function") forwardedRef(node);
      else if (forwardedRef) forwardedRef.current = node;
    }}
    className={cn(
      // max-w-full plus overflow-x-auto is what keeps a strip wider than the
      // screen inside itself. Without it the list simply grew — five tabs came
      // to 567px on a 390px phone — and took the whole page sideways with it,
      // so two tabs were unreachable and every page below scrolled off.
      // Scrollbar hidden: it's a thumb-dragged strip, not a scroll region.
      "inline-flex h-10 max-w-full items-center gap-1 overflow-x-auto overscroll-x-contain rounded-full border border-border bg-surface p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
      className
    )}
    {...props}
  />
  );
});
TabsList.displayName = TabsPrimitive.List.displayName;

const TabsTrigger = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Trigger
    ref={ref}
    className={cn(
      // shrink-0: inside a scrolling strip a tab must keep its own width
      // rather than be squeezed until its label wraps.
      "inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-full px-3.5 py-1.5 text-sm font-medium text-foreground-muted transition-colors data-[state=active]:bg-accent data-[state=active]:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
      className
    )}
    {...props}
  />
));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;

const TabsContent = React.forwardRef<
  React.ElementRef<typeof TabsPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(({ className, ...props }, ref) => (
  <TabsPrimitive.Content
    ref={ref}
    className={cn("mt-6 focus-visible:outline-none", className)}
    {...props}
  />
));
TabsContent.displayName = TabsPrimitive.Content.displayName;

export { Tabs, TabsList, TabsTrigger, TabsContent };
