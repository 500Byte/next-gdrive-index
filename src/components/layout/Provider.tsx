"use client";

import { type ReactNode, useEffect, useState } from "react";
import { type TooltipProviderProps } from "@radix-ui/react-tooltip";
import { usePathname } from "next/navigation";
import NextTopLoader, { type NextTopLoaderProps } from "nextjs-toploader";
import { type ToasterProps } from "sonner";

import { Toaster } from "~/components/ui/sonner";
import { TooltipProvider } from "~/components/ui/tooltip";

import UseConfirmDialogProvider from "~/context/confirmProvider";
import { LayoutProvider } from "~/context/layoutContext";

import { cn } from "~/lib/utils";

type Props = {
  loader?: NextTopLoaderProps;
  tooltip?: Omit<TooltipProviderProps, "children">;
  toaster?: ToasterProps;
};

export function useTheme() {
  const toggleTheme = () => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark) {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("theme", "light");
    } else {
      document.documentElement.classList.add("dark");
      localStorage.setItem("theme", "dark");
    }
  };

  const theme = document.documentElement.classList.contains("dark") ? "dark" : "light";

  return { toggleTheme, theme };
}

export default function Provider(props: React.PropsWithChildren<Props>) {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);

    const savedTheme = localStorage.getItem("theme");
    const systemPrefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

    if (savedTheme === "dark" || (!savedTheme && systemPrefersDark)) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, []);

  if (!mounted) return null;

  return (
    <LayoutProvider>
      <NextTopLoader color='hsl(var(--primary))' {...props.loader} />
      <UseConfirmDialogProvider>
        <TooltipProvider {...props.tooltip}>
          <div
            className={cn(
              "flex w-full flex-col items-start font-sans text-foreground",
              pathname.startsWith("/ngdi-internal/embed/") ? "h-fit" : "h-full min-h-screen",
            )}
          >
            {props.children}
          </div>
        </TooltipProvider>

        <Toaster {...props.toaster} />
      </UseConfirmDialogProvider>
    </LayoutProvider>
  );
}
