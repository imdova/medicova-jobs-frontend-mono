import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/config";
import SeekerPublicProfile from "@/components/shared/seeker/public/SeekerPublicProfile";
import SeekerPrivateProfile from "@/components/shared/seeker/private/SeekerPrivateProfile";
import { Suspense } from "react";
import Loading from "@/components/loading/loading";

export const revalidate = 604800; // 3600 * 24 * 7 = 7 days in seconds

const Page = async ({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) => {
  const { id: resolvedId } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const isPublic = resolvedSearchParams?.public;
  const session = await getServerSession(authOptions);
  const user = session?.user;
  const isMe = isPublic === "true" ? false : resolvedId === user?.userName;

  return isMe ? (
    <SeekerPrivateProfile />
  ) : (
    <Suspense fallback={<Loading />}>
      <SeekerPublicProfile userId={resolvedId} companyId={user?.companyId} />
    </Suspense>
  );
};

export default Page;
