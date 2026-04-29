import { useEffect } from "react";

function isInsideImageViewer(target) {
  if (!target || typeof target.closest !== "function") return false;
  return Boolean(target.closest(".modal, .photo-modal, .image-modal, [data-allow-zoom='true']"));
}

export default function useNoZoom() {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let lastTouchEnd = 0;

    const preventGestureZoom = (event) => {
      if (isInsideImageViewer(event.target)) return;
      event.preventDefault();
    };

    const preventDoubleTapZoom = (event) => {
      if (isInsideImageViewer(event.target)) return;

      const now = Date.now();
      if (now - lastTouchEnd <= 320) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    };

    const preventWheelZoom = (event) => {
      if (!event.ctrlKey && !event.metaKey) return;
      if (isInsideImageViewer(event.target)) return;
      event.preventDefault();
    };

    document.addEventListener("gesturestart", preventGestureZoom, { passive: false });
    document.addEventListener("gesturechange", preventGestureZoom, { passive: false });
    document.addEventListener("gestureend", preventGestureZoom, { passive: false });
    document.addEventListener("touchend", preventDoubleTapZoom, { passive: false });
    window.addEventListener("wheel", preventWheelZoom, { passive: false });

    return () => {
      document.removeEventListener("gesturestart", preventGestureZoom);
      document.removeEventListener("gesturechange", preventGestureZoom);
      document.removeEventListener("gestureend", preventGestureZoom);
      document.removeEventListener("touchend", preventDoubleTapZoom);
      window.removeEventListener("wheel", preventWheelZoom);
    };
  }, []);
}
