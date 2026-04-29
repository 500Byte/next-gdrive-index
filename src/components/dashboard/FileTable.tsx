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
      <h2 className="mb-4 text-lg font-semibold">All Files</h2>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead className="hidden sm:table-cell">Size</TableHead>
              <TableHead className="hidden md:table-cell">Modified</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {files.map((file) => {
              const isFolder = file.mimeType.includes("folder");
              const Icon = isFolder ? Folder : FileText;

              return (
                <TableRow key={file.encryptedId} className="cursor-pointer">
                  <TableCell>
                    <Link
                      href={`/${encodeURIComponent(file.name)}`}
                      className="flex items-center gap-2"
                    >
                      <Icon className="h-4 w-4 text-muted-foreground" />
                      <span className="line-clamp-1">{file.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {isFolder ? "-" : bytesToReadable(file.size || 0)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-muted-foreground">
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
