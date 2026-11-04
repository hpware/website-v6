import { ChevronLeft, ChevronRight, X } from "lucide-react";
import {
    useEffect,
    useState,
    type CSSProperties,
    type PointerEvent,
} from "react";
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

// Foil colour (oklch hue) for each pack, cycled so neighbours differ.
const packHues = [230, 330, 60, 160, 280];
const hueOf = (index: number) => packHues[index % packHues.length];

// Tilts a card toward the pointer and moves the holo shine with it.
// The vars are set on the (untransformed) wrapper so the rect doesn't jitter.
function tilt(event: PointerEvent<HTMLElement>) {
    const el = event.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width;
    const y = (event.clientY - rect.top) / rect.height;
    el.style.setProperty("--rx", `${(0.5 - y) * 18}deg`);
    el.style.setProperty("--ry", `${(x - 0.5) * 18}deg`);
    el.style.setProperty("--mx", `${x * 100}%`);
    el.style.setProperty("--my", `${y * 100}%`);
}

function untilt(event: PointerEvent<HTMLElement>) {
    for (const name of ["--rx", "--ry", "--mx", "--my"]) {
        event.currentTarget.style.removeProperty(name);
    }
}

// How long the pack takes to tear open before the photos spill out.
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

    const openHue = openPack ? hueOf(packs.indexOf(openPack)) : 0;
    const viewingPhoto =
        openPack && viewing !== null ? openPack.photos[viewing] : null;

    return (
        <>
            <ul className="mt-10 grid grid-cols-1 gap-x-8 gap-y-14 sm:grid-cols-2 lg:grid-cols-3">
                {packs.map((pack, index) => (
                    <li key={pack.id}>
                        <BoosterPack
                            pack={pack}
                            hue={hueOf(index)}
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
                        <div className="mt-10 flex flex-wrap justify-center gap-6">
                            {openPack.photos.map((photo, index) => (
                                <button
                                    type="button"
                                    key={`${photo.src}-${index}`}
                                    onClick={() => view(index)}
                                    onPointerMove={tilt}
                                    onPointerLeave={untilt}
                                    className="photo-pack-spill w-60 shrink-0"
                                    style={
                                        {
                                            "--i": index,
                                            "--tilt": `${(index % 2 === 0 ? -1 : 1) * (4 + (index % 3) * 3)}deg`,
                                        } as CSSProperties
                                    }
                                >
                                    <PhotoCard
                                        pack={openPack}
                                        hue={openHue}
                                        index={index}
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

const pad = (n: number) => String(n).padStart(2, "0");

type BoosterPackProps = {
    pack: PhotoPack;
    hue: number;
    open: boolean;
    photosLabel: string;
    onClick: () => void;
};

function BoosterPack({ pack, hue, open, photosLabel, onClick }: BoosterPackProps) {
    const cover = pack.cover ?? pack.photos[0].src;
    const peeks = pack.photos.slice(0, 3);
    const face = (
        <div
            className="photo-pack-foil absolute inset-0 flex flex-col items-center overflow-hidden rounded-md px-[9%] pb-[12%] pt-[17%] text-white"
            style={{ "--hue": hue } as CSSProperties}
        >
            <div className="photo-pack-crimp absolute inset-x-0 top-0 h-[6%]" />
            <div className="photo-pack-crimp absolute inset-x-0 bottom-0 h-[6%]" />
            <div className="absolute inset-x-[6%] top-[12%] border-t-2 border-dashed border-white/40" />
            <span className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-80">
                Photo pack
            </span>
            <div className="mt-2 aspect-square w-full overflow-hidden rounded-xl shadow-lg ring-4 ring-white/40">
                <img src={cover} alt="" loading="lazy" className="size-full object-cover" />
            </div>
            <span className="mt-auto line-clamp-2 text-center text-xl font-bold leading-tight drop-shadow-md">
                {pack.title}
            </span>
            <span className="mt-1 rounded-full bg-black/30 px-3 py-0.5 text-xs">
                {pack.photos.length} {photosLabel}
            </span>
        </div>
    );

    return (
        <button
            type="button"
            onClick={onClick}
            onPointerMove={tilt}
            onPointerLeave={untilt}
            data-open={open || undefined}
            className="photo-pack group flex w-full flex-col items-center text-center"
        >
            <div className="photo-pack-tilt relative aspect-[5/7] w-full max-w-60">
                {/* Cards waiting inside; they rise out once the top is torn off */}
                {peeks.map((photo, index) => (
                    <div
                        key={`${photo.src}-${index}`}
                        className="photo-pack-peek absolute inset-x-[14%] top-[14%] aspect-[63/88] overflow-hidden rounded-md border-4 border-white bg-white shadow-md"
                        style={{ "--n": index - 1 } as CSSProperties}
                    >
                        <img src={photo.src} alt="" loading="lazy" className="aspect-[4/3] w-full object-cover" />
                    </div>
                ))}

                {/* Same face twice, clipped at the tear line, so the top can rip off */}
                <div className="photo-pack-half photo-pack-bottom">{face}</div>
                <div className="photo-pack-half photo-pack-top">{face}</div>
                <div className="photo-pack-holo rounded-md" />
            </div>

            {pack.date && <small className="mt-4 opacity-70">{pack.date}</small>}
        </button>
    );
}

type PhotoCardProps = {
    pack: PhotoPack;
    hue: number;
    index: number;
};

function PhotoCard({ pack, hue, index }: PhotoCardProps) {
    const photo = pack.photos[index];
    const number = pad(index + 1);

    return (
        <div
            className="photo-pack-tilt photo-pack-frame relative aspect-[63/88] rounded-[14px] p-2.5 shadow-xl"
            style={{ "--hue": hue } as CSSProperties}
        >
            <div className="photo-pack-card-inner flex h-full flex-col rounded-lg p-2 text-left text-neutral-900">
                <div className="flex items-baseline justify-between gap-2 text-sm font-bold">
                    <span className="truncate">{photo.alt ?? pack.title}</span>
                    <span className="shrink-0 text-xs opacity-60">#{number}</span>
                </div>
                <div className="photo-pack-art mt-1 aspect-[4/3] overflow-hidden rounded-sm border-2">
                    <img
                        src={photo.src}
                        alt={photo.alt ?? ""}
                        loading="lazy"
                        className="size-full object-cover"
                    />
                </div>
                <div className="photo-pack-strip mt-1.5 truncate rounded-sm px-2 py-0.5 text-center text-[10px] italic">
                    {pack.title}
                    {pack.date && ` · ${pack.date}`}
                </div>
                <p className="mt-1.5 line-clamp-4 flex-1 text-xs leading-snug text-neutral-700">
                    {pack.description}
                </p>
                <div className="flex justify-between text-[10px] text-neutral-500">
                    <span>
                        {number}/{pad(pack.photos.length)}
                    </span>
                    <span>★</span>
                </div>
            </div>
            <div className="photo-pack-holo rounded-[14px]" />
        </div>
    );
}
