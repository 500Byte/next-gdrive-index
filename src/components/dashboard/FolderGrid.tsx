"use client";

import Link from "next/link";
import { Folder } from "lucide-react";
import { type z } from "zod";

import { Card, CardContent } from "~/components/ui/card";
import { type Schema_File } from "~/types/schema";

interface FolderGridProps {
  folders: z.infer<typeof Schema_File>[];
}

export default function FolderGrid({ folders }: FolderGridProps) {
  if (!folders.length) return null;

  return (
    <section className="mb-6">
      <h2 className="mb-4 text-sm font-medium text-zinc-400 uppercase tracking-wide">Folders</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {folders.map((folder) => (
          <Link key={folder.encryptedId} href={`/${encodeURIComponent(folder.name)}`}>
            <Card className="cursor-pointer rounded-md border-zinc-800 bg-zinc-950 transition-colors hover:border-zinc-700 hover:bg-zinc-900">
              <CardContent className="flex flex-col items-center gap-3 p-4">
                <Folder className="h-5 w-5 text-zinc-400" strokeWidth={1.5} />
                <span className="line-clamp-2 text-center text-xs font-medium text-zinc-300">
                  {folder.name}
                </span>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </section>
  );
}
