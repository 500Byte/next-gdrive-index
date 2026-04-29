"use client";

import { useState } from "react";
import { type z } from "zod";

import { FolderGrid, RecentFiles, FileTable } from "./";
import { type Schema_File } from "~/types/schema";

interface DashboardPageProps {
  encryptedId: string;
  initialFiles: z.infer<typeof Schema_File>[];
  nextPageToken?: string;
}

export default function DashboardPage({
  encryptedId,
  initialFiles,
  nextPageToken: initialNextPageToken,
}: DashboardPageProps) {
  const [files, setFiles] = useState(initialFiles);
  const [nextPageToken, setNextPageToken] = useState(initialNextPageToken);
  const [isLoading, setIsLoading] = useState(false);

  const folders = files.filter((f) => f.mimeType.includes("folder"));
  const allFiles = files;

  const handleLoadMore = async () => {
    if (!nextPageToken) return;
    setIsLoading(true);
    // Load more logic here using ListFiles action
    setIsLoading(false);
  };

  return (
    <div className="space-y-6">
      <FolderGrid folders={folders} />
      <RecentFiles files={allFiles} />
      <FileTable
        files={allFiles}
        nextPageToken={nextPageToken}
        onLoadMore={handleLoadMore}
        isLoading={isLoading}
      />
    </div>
  );
}
