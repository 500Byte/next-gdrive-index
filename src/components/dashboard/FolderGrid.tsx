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
      <h2 className="mb-4 text-lg font-semibold">Folders</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
        {folders.map((folder) => (
          <Link key={folder.encryptedId} href={`/${encodeURIComponent(folder.name)}`}>
            <Card className="cursor-pointer transition-colors hover:bg-accent">
              <CardContent className="flex flex-col items-center gap-2 p-4">
                <Folder className="h-10 w-10 text-muted-foreground" />
                <span className="line-clamp-2 text-center text-sm font-medium">
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
