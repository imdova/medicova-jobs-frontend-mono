"use client";
import { signIn } from "next-auth/react";
import { useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";

function GoogleAuth() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  useEffect(() => {
    if (token) {
      signIn("token-credentials", {
        token: token,
        callbackUrl: "/me",
        redirect: true,
      });
    }
  }, [token]);

  return null;
}

export default function Page() {
  return (
    <Suspense fallback={null}>
      <GoogleAuth />
    </Suspense>
  );
}
