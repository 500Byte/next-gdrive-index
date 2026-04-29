"use client";

import Link from "next/link";
import { FileText, Folder } from "lucide-react";
import { type z } from "zod";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "~/components/ui/table";
import { Button } from "~/components/ui/button";
import { formatDate, bytesToReadable } from "~/lib/utils";
import { type Schema_File } from "~/types/schema";

interface FileTableProps {
  files: z.infer<typeof Schema_File>[];
  nextPageToken?: string;
  onLoadMore?: () => void;
  isLoading?: boolean;
}

export default function FileTable({
  files,
  nextPageToken,
  onLoadMore,
  isLoading,
}: FileTableProps) {
  return (
    <section>
      <h2 className="mb-4 text-sm font-medium text-zinc-400 uppercase tracking-wide">All Files</h2>
      <div className="rounded-md border border-zinc-800">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-transparent">
              <TableHead className="text-xs font-medium text-zinc-500 uppercase">Name</TableHead>
              <TableHead className="hidden text-xs font-medium text-zinc-500 uppercase sm:table-cell">Size</TableHead>
              <TableHead className="hidden text-xs font-medium text-zinc-500 uppercase md:table-cell">Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => {
              const isFolder = file.mimeType.includes("folder");
              const Icon = isFolder ? Folder : FileText;

              return (
                <TableRow key={file.encryptedId} className="cursor-pointer border-zinc-800 transition-colors hover:bg-zinc-900">
                  <TableCell>
                    <Link
                      href={`/${encodeURIComponent(file.name)}`}
                      className="flex items-center gap-2 text-sm text-zinc-300"
                    >
                      <Icon className="h-4 w-4 text-zinc-500" strokeWidth={1.5} />
                      <span className="line-clamp-1">{file.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell font-mono text-xs text-zinc-500">
                    {isFolder ? "-" : bytesToReadable(file.size || 0)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell font-mono text-xs text-zinc-500">
                    {formatDate(file.modifiedTime)}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      {nextPageToken && (
        <div className="mt-4 flex justify-center">
          <Button
            variant="outline"
            onClick={onLoadMore}
            disabled={isLoading}
          >
            {isLoading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </section>
  );
}
