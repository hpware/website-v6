import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import type { Photo } from "../lib/photoPacks";

type Props = {
    photos: Photo[];
    labels: {
        close: string;
        previous: string;
        next: string;
    };
};

// An album's photo grid; clicking a photo opens it in a fullscreen popup.
export default function PhotoAlbum({ photos, labels }: Props) {
    // Index of the photo shown in the popup, if any.
    const [viewing, setViewing] = useState<number | null>(null);
    // Which way the last prev/next went, so the photo slides in from that side.
    const [direction, setDirection] = useState<-1 | 0 | 1>(0);
    const dialogRef = useRef<HTMLDivElement>(null);
    // The thumbnail that opened the popup, to give focus back on close.
    const openerRef = useRef<HTMLElement | null>(null);
    const isOpen = viewing !== null;

    // Move focus into the popup when it opens and back to the thumbnail when it closes.
    useEffect(() => {
        if (!isOpen) return;
        dialogRef.current?.querySelector<HTMLElement>("button")?.focus();
        return () => openerRef.current?.focus();
    }, [isOpen]);

    useEffect(() => {
        if (viewing === null) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") setViewing(null);
            if (event.key === "ArrowRight") step(1);
            if (event.key === "ArrowLeft") step(-1);
            if (event.key === "Tab") trapFocus(event);
        };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [viewing]);

    // Keep Tab cycling through the popup's buttons while it's open.
    function trapFocus(event: KeyboardEvent) {
        const buttons = dialogRef.current?.querySelectorAll<HTMLElement>("button");
        if (!buttons || buttons.length === 0) return;
        const first = buttons[0];
        const last = buttons[buttons.length - 1];
        const inside = dialogRef.current?.contains(document.activeElement);
        if (event.shiftKey && (document.activeElement === first || !inside)) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && (document.activeElement === last || !inside)) {
            event.preventDefault();
            first.focus();
        }
    }

    function view(index: number, opener: HTMLElement) {
        openerRef.current = opener;
        setDirection(0);
        setViewing(index);
    }

    function step(delta: -1 | 1) {
        if (viewing === null) return;
        setDirection(delta);
        setViewing((viewing + delta + photos.length) % photos.length);
    }

    const viewingPhoto = viewing !== null ? photos[viewing] : null;

    return (
        <>
            <div className="mt-6 grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-5">
                {photos.map((photo, index) => (
                    <button
                        type="button"
                        key={`${photo.src}-${index}`}
                        onClick={(event) => view(index, event.currentTarget)}
                        aria-label={photo.alt ?? `${index + 1} / ${photos.length}`}
                        className="photo-pack-thumb aspect-square overflow-hidden rounded-md bg-gray-500/20"
                        style={{ "--i": index } as CSSProperties}
                    >
                        <img
                            src={photo.thumb ?? photo.src}
                            alt={photo.alt ?? ""}
                            loading="lazy"
                            className="size-full object-cover"
                        />
                    </button>
                ))}
            </div>

            {/* Portalled to <body> so it covers the whole window, navbar included. */}
            {viewingPhoto &&
                viewing !== null &&
                createPortal(
                    <div
                        ref={dialogRef}
                        role="dialog"
                        aria-modal="true"
                        aria-label={viewingPhoto.alt ?? `${viewing + 1} / ${photos.length}`}
                        className="photo-pack-backdrop fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-16"
                        onClick={() => setViewing(null)}
                    >
                        <img
                            key={viewing}
                            src={viewingPhoto.src}
                            alt={viewingPhoto.alt ?? ""}
                            className="photo-pack-lightbox max-h-full max-w-full rounded-xl object-contain shadow-2xl"
                            style={{ "--dir": direction } as CSSProperties}
                            onClick={(event) => event.stopPropagation()}
                        />
                        <button
                            type="button"
                            onClick={() => setViewing(null)}
                            aria-label={labels.close}
                            className="fixed right-4 top-4 flex size-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
                        >
                            <X className="size-5" />
                        </button>
                        {photos.length > 1 && (
                            <>
                                <button
                                    type="button"
                                    aria-label={labels.previous}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        step(-1);
                                    }}
                                    className="fixed left-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:left-4"
                                >
                                    <ChevronLeft className="size-6" />
                                </button>
                                <button
                                    type="button"
                                    aria-label={labels.next}
                                    onClick={(event) => {
                                        event.stopPropagation();
                                        step(1);
                                    }}
                                    className="fixed right-2 top-1/2 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25 sm:right-4"
                                >
                                    <ChevronRight className="size-6" />
                                </button>
                                <span className="fixed bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-3 py-1 text-sm text-white">
                                    {viewing + 1} / {photos.length}
                                </span>
                            </>
                        )}
                    </div>,
                    document.body,
                )}
        </>
    );
}
