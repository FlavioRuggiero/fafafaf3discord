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
            "group toast group-[.toaster]:!bg-yellow-600 group-[.toaster]:!text-gray-900 group-[.toaster]:!border-yellow-700 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:!text-gray-800",
          actionButton:
            "group-[.toast]:!bg-yellow-800 group-[.toast]:!text-gray-100",
          cancelButton:
            "group-[.toast]:!bg-yellow-800 group-[.toast]:!text-gray-100",
          success: "group-[.toaster]:!bg-yellow-600 group-[.toaster]:!text-gray-900 group-[.toaster]:!border-yellow-700",
          error: "group-[.toaster]:!bg-yellow-600 group-[.toaster]:!text-gray-900 group-[.toaster]:!border-yellow-700",
          warning: "group-[.toaster]:!bg-yellow-600 group-[.toaster]:!text-gray-900 group-[.toaster]:!border-yellow-700",
          info: "group-[.toaster]:!bg-yellow-600 group-[.toaster]:!text-gray-900 group-[.toaster]:!border-yellow-700",
        },
      }}
      {...props}
    />
  )
}

export { Toaster }