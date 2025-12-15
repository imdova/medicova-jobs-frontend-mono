import { getJobById } from "@/lib/actions/job.actions";
import { notFound } from "next/navigation";
import JobDetailPage from "./jobDetailsPage";

const Page = async ({ params }: { params: Promise<{ id: string }> }) => {
  const { id } = await params;
  const result = await getJobById(id);
  const job = result.success && result.data;
  if (!job) return notFound();

  return <JobDetailPage job={job} />;
};

export default Page;
