"use client";

import Link from "next/link";
import { FileText } from "lucide-react";
import { type z } from "zod";

import { Card, CardContent } from "~/components/ui/card";
import { formatDate } from "~/lib/utils";
import { type Schema_File } from "~/types/schema";

interface RecentFilesProps {
  files: z.infer<typeof Schema_File>[];
}

export default function RecentFiles({ files }: RecentFilesProps) {
  const recentFiles = [...files]
    .filter((f) => !f.mimeType.includes("folder"))
    .sort((a, b) => new Date(b.modifiedTime).getTime() - new Date(a.modifiedTime).getTime())
    .slice(0, 5);

  if (!recentFiles.length) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-4 text-sm font-medium text-zinc-400 uppercase tracking-wide">Recent Files</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {recentFiles.map((file) => (
          <Link key={file.encryptedId} href={`/${encodeURIComponent(file.name)}`}>
            <Card className="w-[160px] flex-shrink-0 cursor-pointer rounded-md border-zinc-800 bg-zinc-950 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
              <CardContent className="flex flex-col gap-3 p-3">
                <FileText className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                <div className="flex flex-col">
                  <span className="line-clamp-1 text-xs font-medium text-zinc-300">{file.name}</span>
                  <span className="text-[10px] text-zinc-500 font-mono">
                    {formatDate(file.modifiedTime)}
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
