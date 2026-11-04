import { X } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";
import type { PhotoPack } from "../lib/photoPacks";

type Props = {
    packs: PhotoPack[];
    labels: {
        photos: string;
        close: string;
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

    useEffect(() => {
        if (!openPack) return;
        const onKey = (event: KeyboardEvent) => {
            if (event.key === "Escape") close();
        };
        document.addEventListener("keydown", onKey);
        document.body.style.overflow = "hidden";
        return () => {
            document.removeEventListener("keydown", onKey);
            document.body.style.overflow = "";
        };
    }, [openPack]);

    function unzip(pack: PhotoPack) {
        if (unzipping) return;
        setUnzipping(pack.id);
        setTimeout(() => setOpenPack(pack), UNZIP_MS);
    }

    function close() {
        setOpenPack(null);
        setUnzipping(null);
    }

    if (packs.length === 0) {
        return <p className="mt-8 text-center opacity-70">{labels.empty}</p>;
    }

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
                        <div className="mt-8 columns-1 gap-4 sm:columns-2 lg:columns-3">
                            {openPack.photos.map((photo, index) => (
                                <a
                                    key={`${photo.src}-${index}`}
                                    href={photo.src}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="photo-pack-spill mb-4 block break-inside-avoid overflow-hidden rounded-2xl shadow-lg"
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
                                        className="w-full transition-transform duration-500 hover:scale-105"
                                    />
                                </a>
                            ))}
                        </div>
                    </div>
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
