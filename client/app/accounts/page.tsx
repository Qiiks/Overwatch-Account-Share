import { AccountsList } from "@/components/AccountsList";
import { Navigation } from "@/components/Navigation";
import { DotGrid } from "@/components/DotGrid";

export default function AccountsPage() {
  return (
    <div className="min-h-screen bg-[#111111] text-[#EAEAEA] relative overflow-hidden">
      <Navigation />
      <DotGrid />

      <div className="relative z-10 container mx-auto px-4 py-8 pt-24">
        <AccountsList />
      </div>
    </div>
  );
}
