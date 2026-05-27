"use client";

import { Suspense } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { Loader2 } from "lucide-react";

function Loading() {
  return (
    <div className="min-h-screen bg-[#F7F7FB] flex items-center justify-center">
      <Loader2 size={32} className="animate-spin text-indigo-500" />
    </div>
  );
}

export default function ClientFormPage() {
  return (
    <Suspense fallback={<Loading />}>
      <AppLayout />
    </Suspense>
  );
}
