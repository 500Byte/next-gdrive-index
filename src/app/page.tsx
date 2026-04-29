import { DashboardPage } from "~/components/dashboard";
import { ListFiles } from "~/actions/drive";
import config from "config";

export const revalidate = 60;
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const data = await ListFiles({});

  if (!data.success) {
    return <div>Error: {data.error}</div>;
  }

  return (
    <DashboardPage
      encryptedId={config.apiConfig.rootFolder}
      initialFiles={data.data.files}
      nextPageToken={data.data.nextPageToken ?? undefined}
    />
  );
}
