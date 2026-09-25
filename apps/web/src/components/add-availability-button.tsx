"use client";

import { PlusIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { AvailabilityPlanner } from "@/components/availability-planner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import type { AvailabilityModel } from "@/lib/availability-model";

export function AddAvailabilityButton({ availability }: { availability: AvailabilityModel }) {
  const t = useTranslations("dashboard.availability");
  const [planning, setPlanning] = useState(false);

  return (
    <>
      <Button type="button" onClick={() => setPlanning(true)}>
        <PlusIcon />
        {t("save")}
      </Button>
      <Dialog open={planning} onOpenChange={setPlanning}>
        {/* Mounted only while open, so every opening starts a clean draft for the dashboard's day. */}
        {planning && <AvailabilityPlanner availability={availability} />}
      </Dialog>
    </>
  );
}
