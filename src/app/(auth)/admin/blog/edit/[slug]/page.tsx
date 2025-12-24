'use client'
import { API_GET_BLOG_BY_ID } from "@/api/blog";
import BlogPage from "@/components/blog/BlogPage";
import Loading from "@/components/loading/loading";
import useFetch from "@/hooks/useFetch";
import { BlogType } from "@/types/blog";
import { CircularProgress } from "@mui/material";
import { use } from "react";

const EditBlogPage = ({
  params,
}: {
  params: Promise<{ slug: string }>;
}) => {
  const { slug } = use(params);
  const { data: blog, loading } = useFetch<BlogType>(API_GET_BLOG_BY_ID + slug, { defaultLoading: true })

  if (loading) {
    return <div className="flex h-screen items-center justify-center">
      <CircularProgress />
      <h6 className="ml-4">Loading...</h6>
    </div>
  }
  if (!blog) return null;
  return (
    <div>
      <BlogPage blog={blog} />
    </div>
  );
};

export default EditBlogPage;
