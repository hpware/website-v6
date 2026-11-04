import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import type { PhotoPack } from "../lib/photoPacks";

type Props = {
    packs: PhotoPack[];
    labels: {
        photos: string;
        close: string;
        previous: string;
        next: string;
        empty: string;
    };
};

export default function PhotoPacks({ packs, labels }: Props) {
    const [openPack, setOpenPack] = useState<PhotoPack | null>(null);
    // Index of the photo shown in the lightbox popup, if any.
    const [viewing, setViewing] = useState<number | null>(null);
    // Which way the last prev/next went, so the photo slides in from that side.
    const [direction, setDirection] = useState<-1 | 0 | 1>(0);

    useEffect(() => {
        if (!openPack) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                // Close the popup first, then the album.
                if (viewing !== null) setViewing(null);
                else close();
            }
            if (viewing === null) return;
            if (event.key === "ArrowRight") step(1);
            if (event.key === "ArrowLeft") step(-1);
        };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [openPack, viewing]);

    function view(index: number) {
        setDirection(0);
        setViewing(index);
    }

    function step(delta: -1 | 1) {
        if (!openPack || viewing === null) return;
        const count = openPack.photos.length;
        setDirection(delta);
        setViewing((viewing + delta + count) % count);
    }

    function close() {
        setViewing(null);
        setOpenPack(null);
    }

    if (packs.length === 0) {
        return <p className="mt-8 text-center opacity-70">{labels.empty}</p>;
    }

    const viewingPhoto =
        openPack && viewing !== null ? openPack.photos[viewing] : null;

    return (
        <>
            <ul className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-6 lg:grid-cols-4">
                {packs.map((pack) => (
                    <li key={pack.id}>
                        <AlbumTile pack={pack} onClick={() => setOpenPack(pack)} />
                    </li>
                ))}
            </ul>

            {openPack && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={openPack.title}
                    className="photo-pack-backdrop fixed inset-0 z-[60] overflow-y-auto bg-background/85 px-4 py-16 backdrop-blur-xl"
                    onClick={close}
                >
                    <button
                        type="button"
                        onClick={close}
                        aria-label={labels.close}
                        className="fixed right-4 top-4 flex size-11 items-center justify-center rounded-full border border-gray-300/30 bg-background/80 transition-colors hover:bg-gray-500/20"
                    >
                        <X className="size-5" />
                    </button>
                    <div
                        className="mx-auto max-w-5xl"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <h2 className="text-2xl font-bold">{openPack.title}</h2>
                        <p className="mt-1 text-sm opacity-70">
                            {openPack.photos.length} {labels.photos}
                            {openPack.date && ` · ${openPack.date}`}
                        </p>
                        {openPack.description && (
                            <p className="mt-2 opacity-80">
                                {openPack.description}
                            </p>
                        )}
                        <div className="mt-6 grid grid-cols-3 gap-1 sm:grid-cols-4 lg:grid-cols-5">
                            {openPack.photos.map((photo, index) => (
                                <button
                                    type="button"
                                    key={`${photo.src}-${index}`}
                                    onClick={() => view(index)}
                                    className="photo-pack-thumb aspect-square overflow-hidden rounded-md"
                                    style={{ "--i": index } as CSSProperties}
                                >
                                    <img
                                        src={photo.src}
                                        alt={photo.alt ?? ""}
                                        loading="lazy"
                                        className="size-full object-cover transition-transform duration-300 hover:scale-105"
                                    />
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {openPack && viewingPhoto && viewing !== null && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={viewingPhoto.alt ?? openPack.title}
                    className="photo-pack-backdrop fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4 sm:p-16"
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
                    {openPack.photos.length > 1 && (
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
                                {viewing + 1} / {openPack.photos.length}
                            </span>
                        </>
                    )}
                </div>
            )}
        </>
    );
}

type AlbumTileProps = {
    pack: PhotoPack;
    onClick: () => void;
};

// Square cover with the album name over a soft gradient, like a photos app.
function AlbumTile({ pack, onClick }: AlbumTileProps) {
    const cover = pack.cover ?? pack.photos[0].src;

    return (
        <button
            type="button"
            onClick={onClick}
            className="group relative block aspect-square w-full overflow-hidden rounded-2xl bg-gray-500/20 text-left shadow-md transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]"
        >
            <img
                src={cover}
                alt=""
                loading="lazy"
                className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent px-4 pb-3 pt-10">
                <span className="line-clamp-2 font-bold text-white drop-shadow">
                    {pack.title}
                </span>
            </div>
        </button>
    );
}
