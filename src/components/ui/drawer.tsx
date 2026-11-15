"use client";

import * as React from "react";
import { Drawer as DrawerPrimitive } from "@base-ui/react/drawer";
import { cn } from "cn";

const EASE = "ease-[cubic-bezier(0.32,0.72,0,1)]";

function Drawer({ ...props }: DrawerPrimitive.Root.Props) {
  return <DrawerPrimitive.Root data-slot="drawer" {...props} />;
}

function DrawerClose({ ...props }: DrawerPrimitive.Close.Props) {
  return <DrawerPrimitive.Close data-slot="drawer-close" {...props} />;
}

/**
 * A bottom sheet. The popup is a flex column: `header` stays pinned (and is the
 * comfortable drag target), `children` scroll inside `DrawerPrimitive.Content`.
 * Snap point offsets are applied both as a transform and as bottom padding so the
 * scroll area always ends at the visible edge of the sheet.
 */
function DrawerContent({
  className,
  header,
  children,
  ...props
}: DrawerPrimitive.Popup.Props & { header?: React.ReactNode }) {
  return (
    <DrawerPrimitive.Portal>
      {/* Don't scale opacity by --drawer-swipe-progress: with snap points it reads 1
          at the resting peek height, which would hide the backdrop entirely. */}
      <DrawerPrimitive.Backdrop
        data-slot="drawer-overlay"
        className={cn(
          "fixed inset-0 z-40 min-h-dvh bg-backdrop transition-opacity duration-[450ms] data-ending-style:opacity-0 data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)] data-starting-style:opacity-0 data-swiping:duration-0 motion-reduce:transition-none supports-[-webkit-touch-callout:none]:absolute",
          EASE,
        )}
      />
      <DrawerPrimitive.Viewport
        data-slot="drawer-viewport"
        className="fixed inset-0 z-[41] flex touch-none items-end justify-center [--bleed:3rem] after:pointer-events-none after:fixed after:inset-x-0 after:bottom-0 after:h-(--bleed) after:bg-background after:content-[''] data-closed:after:opacity-0"
      >
        <DrawerPrimitive.Popup
          data-slot="drawer-content"
          className={cn(
            "relative z-1 flex max-h-[calc(100dvh-24px)] min-h-0 w-full touch-none flex-col rounded-t-xl border-0 border-t border-solid border-border bg-background shadow-dialog outline-none",
            "[padding-bottom:max(0px,calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y)))] [transform:translateY(calc(var(--drawer-snap-point-offset)+var(--drawer-swipe-movement-y)))]",
            "transition-[transform,padding] duration-[450ms] data-swiping:select-none",
            "data-starting-style:[padding-bottom:0] data-starting-style:[transform:translateY(calc(100%+2px))] data-ending-style:[padding-bottom:0] data-ending-style:[transform:translateY(calc(100%+2px))] data-ending-style:duration-[calc(var(--drawer-swipe-strength)*400ms)]",
            "after:pointer-events-none after:absolute after:inset-x-0 after:top-full after:h-(--bleed) after:bg-[inherit] after:content-['']",
            "motion-reduce:transition-none",
            EASE,
            className,
          )}
          {...props}
        >
          <div className="shrink-0 cursor-grab touch-none px-[23px] pt-3 pb-3 select-none active:cursor-grabbing">
            <div aria-hidden="true" className="mx-auto mb-3 h-1 w-10 rounded-full bg-border" />
            {header}
          </div>
          <DrawerPrimitive.Content
            data-slot="drawer-body"
            // Keyboard users must be able to reach and scroll the region.
            tabIndex={0}
            className="min-h-0 flex-1 touch-auto overflow-y-auto overscroll-contain px-[23px] pb-[calc(23px+env(safe-area-inset-bottom,0px))]"
          >
            {children}
          </DrawerPrimitive.Content>
        </DrawerPrimitive.Popup>
      </DrawerPrimitive.Viewport>
    </DrawerPrimitive.Portal>
  );
}

function DrawerTitle({ className, ...props }: DrawerPrimitive.Title.Props) {
  return (
    <DrawerPrimitive.Title
      data-slot="drawer-title"
      className={cn(
        "m-0 font-serif text-[26px] leading-[1.2] font-[450] tracking-[-.025em]",
        className,
      )}
      {...props}
    />
  );
}

function DrawerDescription({ className, ...props }: DrawerPrimitive.Description.Props) {
  return (
    <DrawerPrimitive.Description
      data-slot="drawer-description"
      className={cn("text-[12px] leading-[1.8] text-muted-foreground", className)}
      {...props}
    />
  );
}

export { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerTitle };
