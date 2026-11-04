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

// A few hand-picked blob outlines so the packs don't all look the same.
const blobShapes = [
    "62% 38% 46% 54% / 55% 44% 56% 45%",
    "42% 58% 63% 37% / 45% 56% 44% 55%",
    "55% 45% 38% 62% / 62% 38% 62% 38%",
    "48% 52% 58% 42% / 38% 60% 40% 62%",
];

// How long the zipper takes to open before the photos spill out.
const UNZIP_MS = 550;

export default function PhotoPacks({ packs, labels }: Props) {
    const [unzipping, setUnzipping] = useState<string | null>(null);
    const [openPack, setOpenPack] = useState<PhotoPack | null>(null);
    // Index of the photo shown in the lightbox popup, if any.
    const [viewing, setViewing] = useState<number | null>(null);
    // Which way the last prev/next went, so the photo slides in from that side.
    const [direction, setDirection] = useState<-1 | 0 | 1>(0);

    useEffect(() => {
        if (!openPack) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") {
                // Close the popup first, then the pack.
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

    function unzip(pack: PhotoPack) {
        if (unzipping) return;
        setUnzipping(pack.id);
        setTimeout(() => setOpenPack(pack), UNZIP_MS);
    }

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
        setUnzipping(null);
    }

    if (packs.length === 0) {
        return <p className="mt-8 text-center opacity-70">{labels.empty}</p>;
    }

    const viewingPhoto =
        openPack && viewing !== null ? openPack.photos[viewing] : null;

    return (
        <>
            <ul className="mt-8 grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                {packs.map((pack, index) => (
                    <li key={pack.id}>
                        <PackBlob
                            pack={pack}
                            shape={blobShapes[index % blobShapes.length]}
                            open={unzipping === pack.id}
                            photosLabel={labels.photos}
                            onClick={() => unzip(pack)}
                        />
                    </li>
                ))}
            </ul>

            {openPack && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-label={openPack.title}
                    className="photo-pack-backdrop fixed inset-0 z-[60] overflow-y-auto bg-background/80 px-4 py-16 backdrop-blur-xl"
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
                        <h2 className="text-center text-2xl">
                            {openPack.title}
                        </h2>
                        {openPack.description && (
                            <p className="mt-1 text-center opacity-70">
                                {openPack.description}
                            </p>
                        )}
                        {/* Wrapping + centered so a short last row doesn't leave a gap on one side */}
                        <div className="mt-8 flex flex-wrap justify-center gap-4">
                            {openPack.photos.map((photo, index) => (
                                <button
                                    type="button"
                                    key={`${photo.src}-${index}`}
                                    onClick={() => view(index)}
                                    className="photo-pack-spill aspect-[4/3] w-full overflow-hidden rounded-2xl shadow-lg sm:w-[calc((100%-1rem)/2)] lg:w-[calc((100%-2rem)/3)]"
                                    style={
                                        {
                                            "--i": index,
                                            "--tilt": `${(index % 2 === 0 ? -1 : 1) * (4 + (index % 3) * 3)}deg`,
                                        } as CSSProperties
                                    }
                                >
                                    <img
                                        src={photo.src}
                                        alt={photo.alt ?? ""}
                                        loading="lazy"
                                        className="size-full object-cover transition-transform duration-500 hover:scale-105"
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

type PackBlobProps = {
    pack: PhotoPack;
    shape: string;
    open: boolean;
    photosLabel: string;
    onClick: () => void;
};

function PackBlob({ pack, shape, open, photosLabel, onClick }: PackBlobProps) {
    const cover = pack.cover ?? pack.photos[0].src;
    const peeks = pack.photos.slice(1, 3);

    return (
        <button
            type="button"
            onClick={onClick}
            data-open={open || undefined}
            className="photo-pack group flex w-full flex-col items-center text-center"
        >
            <div className="relative aspect-square w-full max-w-72">
                {/* Photos peeking out from behind the pack */}
                {peeks.map((photo, index) => (
                    <img
                        key={photo.src}
                        src={photo.src}
                        alt=""
                        loading="lazy"
                        className="photo-pack-peek absolute inset-[18%] size-[64%] rounded-xl object-cover shadow-md"
                        style={{ "--n": index } as CSSProperties}
                    />
                ))}

                {/* The pack itself: two halves of the cover that split apart */}
                <div className="photo-pack-body absolute inset-0">
                    <div
                        className="photo-pack-half photo-pack-top"
                        style={{ backgroundImage: `url("${cover}")`, borderRadius: shape }}
                    />
                    <div
                        className="photo-pack-half photo-pack-bottom"
                        style={{ backgroundImage: `url("${cover}")`, borderRadius: shape }}
                    />
                    <div className="photo-pack-zipper" aria-hidden="true">
                        <span className="photo-pack-pull" />
                    </div>
                </div>

                <span className="absolute -bottom-2 right-[12%] rounded-full bg-primary px-3 py-1 text-xs text-primary-foreground shadow">
                    {pack.photos.length} {photosLabel}
                </span>
            </div>

            <span className="mt-5 text-xl">{pack.title}</span>
            {pack.date && <small className="opacity-70">{pack.date}</small>}
        </button>
    );
}
