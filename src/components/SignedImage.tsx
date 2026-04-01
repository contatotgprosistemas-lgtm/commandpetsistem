import { useState, useEffect } from "react";
import { resolveMediaUrl } from "@/lib/storage";

interface SignedImageProps extends React.ImgHTMLAttributes<HTMLImageElement> {
  src: string;
}

/**
 * Image component that auto-resolves signed URLs for private storage buckets.
 * Falls back to original URL for public buckets or external URLs.
 */
export function SignedImage({ src, ...props }: SignedImageProps) {
  const [resolvedSrc, setResolvedSrc] = useState<string>("");

  useEffect(() => {
    if (!src) return;
    let cancelled = false;
    resolveMediaUrl(src).then((url) => {
      if (!cancelled) setResolvedSrc(url);
    });
    return () => { cancelled = true; };
  }, [src]);

  if (!resolvedSrc) return null;

  return <img src={resolvedSrc} {...props} />;
}
