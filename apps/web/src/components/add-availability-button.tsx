"use client";

import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AvailabilityPlanner } from "@/components/availability-planner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import type { AvailabilityModel } from "@/lib/availability-model";

export function AddAvailabilityButton({ availability }: { availability: AvailabilityModel }) {
  const t = useTranslations("dashboard.availability");
  const [planning, setPlanning] = useState(false);
  const label = t("save");

  return (
    <>
      <Button type="button" onClick={() => setPlanning(true)}>
        <PlusIcon />
        {label}
      </Button>
      <Dialog open={planning} onOpenChange={setPlanning}>
        {/* A dialog taller than the phone still has to reach its save button. */}
        <DialogContent className="max-h-[90dvh] overflow-y-auto p-8 sm:max-w-3xl sm:p-12">
          <DialogHeader>
            <DialogTitle className="sr-only">{label}</DialogTitle>
          </DialogHeader>
          <AvailabilityPlanner availability={availability} />
        </DialogContent>
      </Dialog>
    </>
  );
}
