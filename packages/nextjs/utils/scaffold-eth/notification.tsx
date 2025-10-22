import React from "react";
import { Toast, ToastPosition, toast } from "react-hot-toast";
import { XMarkIcon } from "@heroicons/react/20/solid";
import {
  CheckCircleIcon,
  ExclamationCircleIcon,
  ExclamationTriangleIcon,
  InformationCircleIcon,
} from "@heroicons/react/24/solid";

type NotificationProps = {
  content: React.ReactNode;
  status: "success" | "info" | "loading" | "error" | "warning";
  duration?: number;
  icon?: string;
  position?: ToastPosition;
};

type NotificationOptions = {
  duration?: number;
  icon?: string;
  position?: ToastPosition;
};

const ICONS = {
  success: <CheckCircleIcon className="h-5 w-5 text-[var(--color-secondary)]" />,
  loading: <div className="h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />,
  error: <ExclamationCircleIcon className="h-5 w-5 text-red-500" />,
  info: <InformationCircleIcon className="h-5 w-5 text-sky-400" />,
  warning: <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />,
};

const DEFAULT_DURATION = 3000;
const DEFAULT_POSITION: ToastPosition = "bottom-center";

const borderClassByStatus: Record<NotificationProps["status"], string> = {
  success: "border-[var(--color-secondary)]",
  info: "border-sky-700",
  loading: "border-gray-700",
  error: "border-red-600",
  warning: "border-yellow-600",
};

/**
 * Custom Notification (flat, opaque, themed)
 */
const Notification = ({
  content,
  status,
  duration = DEFAULT_DURATION,
  icon,
  position = DEFAULT_POSITION,
}: NotificationProps) => {
  return toast.custom(
    (t: Toast) => {
      const slideIn =
        position.substring(0, 3) === "top"
          ? t.visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 -translate-y-4"
          : t.visible
            ? "opacity-100 translate-y-0"
            : "opacity-0 translate-y-4";

      return (
        <div
          className={`flex items-start justify-between max-w-sm bg-black text-white border ${borderClassByStatus[status]} p-4 gap-3 font-roboto transition-all duration-200 ${slideIn}`}
        >
          <div className="leading-none self-center">{icon ? icon : ICONS[status]}</div>
          <div className="overflow-x-hidden break-words whitespace-pre-line text-sm">{content}</div>
          <button
            aria-label="Dismiss"
            className="ml-2 text-gray-400 hover:text-white transition-colors"
            onClick={() => toast.remove(t.id)}
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>
      );
    },
    {
      duration: status === "loading" ? Infinity : duration,
      position,
    },
  );
};

export const notification = {
  success: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "success", ...options });
  },
  info: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "info", ...options });
  },
  warning: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "warning", ...options });
  },
  error: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "error", ...options });
  },
  loading: (content: React.ReactNode, options?: NotificationOptions) => {
    return Notification({ content, status: "loading", ...options });
  },
  remove: (toastId: string) => {
    toast.remove(toastId);
  },
};
