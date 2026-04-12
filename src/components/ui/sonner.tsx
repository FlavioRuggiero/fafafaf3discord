"use client"

import { useTheme } from "next-themes"
import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme()

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:!bg-gray-900 group-[.toaster]:!text-yellow-500 group-[.toaster]:!border-gray-800 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:!text-yellow-600",
          actionButton:
            "group-[.toast]:!bg-gray-800 group-[.toast]:!text-yellow-500",
          cancelButton:
            "group-[.toast]:!bg-gray-800 group-[.toast]:!text-yellow-500",
          success: "group-[.toaster]:!bg-gray-900 group-[.toaster]:!text-yellow-500 group-[.toaster]:!border-gray-800",
          error: "group-[.toaster]:!bg-gray-900 group-[.toaster]:!text-yellow-500 group-[.toaster]:!border-gray-800",
          warning: "group-[.toaster]:!bg-gray-900 group-[.toaster]:!text-yellow-500 group-[.toaster]:!border-gray-800",
          info: "group-[.toaster]:!bg-gray-900 group-[.toaster]:!text-yellow-500 group-[.toaster]:!border-gray-800",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }