import type { Metadata } from "next";

import { InstallPWA } from "./components/InstallPWA";
import Demo from "./components/Demo";

export const metadata: Metadata = {
  title: "Monad Cash",
};

export default function Page() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-bold text-slate-800 dark:text-slate-100">
            Monad Cash
          </h1>
        </div>

        <div className="space-y-8">
          <Demo />
        </div>
      </div>
      <InstallPWA />
    </div>
  );
}