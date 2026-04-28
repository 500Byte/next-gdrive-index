"use client";

import { usePreviewBase } from "./usePreviewBase";
import { Status } from "~/components/global";
import { PageLoader } from "~/components/layout";
import { cn } from "~/lib/utils";
import { type Schema_File } from "~/types/schema";

type Props = {
  file: z.infer<typeof Schema_File>;
};

export default function PreviewPdf({ file }: Props) {
  const { loading, error, loaded, setLoaded } = usePreviewBase({ file });

  return (
    <div className='flex h-fit min-h-[50dvh] w-full items-center justify-center py-3'>
      {loading ? (
        <PageLoader message='Loading PDF...' />
      ) : error ? (
        <Status icon='Frown' message={error} destructive />
      ) : (
        <div className='relative grid min-h-[50dvh] w-full place-items-center'>
          <div className={cn("pointer-events-none absolute w-full", loaded && "hidden")}>
            <PageLoader message='Loading PDF...' />
          </div>
          <iframe
            src={`/api/preview/${file.encryptedId}?inline=1`}
            title={file.name}
            className={cn("h-full w-full rounded-lg transition", loaded ? "opacity-100" : "opacity-0")}
            allow='autoplay'
            onLoad={() => setLoaded(true)}
            onError={() => setLoaded(false)}
          />
        </div>
      )}
    </div>
  );
}
