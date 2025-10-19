import Link from "next/link";
import { Button } from "@/components/ui/button";

export function Navigation() {
  return (
    <nav className="border-b">
      <div className="flex h-16 items-center px-8 max-w-7xl mx-auto">
        <Link href="/" className="font-bold text-xl mr-8">
          MMDocScan
        </Link>
        <div className="flex gap-6 ml-auto">
          <Link
            href="/templates"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Templates
          </Link>
          <Link
            href="/process"
            className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            Process Documents
          </Link>
        </div>
      </div>
    </nav>
  );
}
