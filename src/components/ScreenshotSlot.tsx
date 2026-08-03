import Image from "next/image";
import { ImageOff } from "lucide-react";

export function ScreenshotSlot({
  src,
  alt,
  caption,
}: {
  src?: string;
  alt: string;
  caption: string;
}) {
  if (!src) {
    return (
      <div className="relative rounded-2xl border border-dashed border-rule bg-gray-50 aspect-[4/3] flex flex-col items-center justify-center gap-3 p-8 text-center">
        <ImageOff className="w-8 h-8 text-graphite" />
        <p className="text-graphite text-sm max-w-xs">
          Screenshot pending: {caption}
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-2xl border border-rule overflow-hidden shadow-lg">
      <Image src={src} alt={alt} width={1280} height={960} className="w-full h-auto" />
    </div>
  );
}
