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
      <h2 className="mb-4 text-lg font-semibold">Recent Files</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {recentFiles.map((file) => (
          <Link key={file.encryptedId} href={`/${encodeURIComponent(file.name)}`}>
            <Card className="w-[160px] flex-shrink-0 cursor-pointer transition-colors hover:bg-accent">
              <CardContent className="flex flex-col gap-2 p-3">
                <FileText className="h-8 w-8 text-muted-foreground" />
                <div className="flex flex-col">
                  <span className="line-clamp-1 text-sm font-medium">{file.name}</span>
                  <span className="text-xs text-muted-foreground">
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
