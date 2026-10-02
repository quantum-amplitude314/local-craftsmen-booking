import type { Craft } from "@local-craftsmen/contracts";
import { Banknote, MapPin, UserRound } from "lucide-react";
import { useTranslations } from "next-intl";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { craftIcons } from "@/lib/craft-icons";
import type { CraftsmanDetailModel } from "@/lib/craftsman-detail-model";

function CraftBadge({ craft, label }: { craft: Craft; label: string }) {
  const CraftIcon = craftIcons[craft];

  return (
    <Badge variant="secondary">
      <CraftIcon data-icon="inline-start" />
      {label}
    </Badge>
  );
}

function About({ bio }: { bio: string | null }) {
  const t = useTranslations("craftsman");

  return bio ? (
    <p className="prose-text whitespace-pre-line wrap-break-word">{bio}</p>
  ) : (
    <p className="text-muted-foreground">{t("noBio")}</p>
  );
}

/** The avatar shows a placeholder until profiles carry a picture. */
export function CraftsmanProfile({ profile }: { profile: CraftsmanDetailModel }) {
  const t = useTranslations("craftsman");
  const { name, craft, serviceLabel, areaLabel, rateLabels, bio } = profile;

  return (
    <Card className="max-w-2xl">
      <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-4">
        <Avatar className="row-span-2 size-16">
          <AvatarFallback>
            <UserRound aria-hidden="true" className="size-8" />
          </AvatarFallback>
        </Avatar>
        <CardTitle>
          <h1 className="section-heading wrap-anywhere">{name}</h1>
        </CardTitle>
        <CardDescription>
          <CraftBadge craft={craft} label={serviceLabel} />
        </CardDescription>
      </CardHeader>
      <CardContent className="gap-4">
        <dl className="flex flex-wrap gap-x-6 gap-y-2">
          <div className="flex items-center gap-2">
            <dt>
              <MapPin aria-hidden="true" className="size-4 text-muted-foreground" />
              <span className="sr-only">{t("baseArea")}</span>
            </dt>
            <dd>{areaLabel}</dd>
          </div>
          {rateLabels.length > 0 && (
            <div className="flex items-center gap-2">
              <dt>
                <Banknote aria-hidden="true" className="size-4 text-muted-foreground" />
                <span className="sr-only">{t("rate")}</span>
              </dt>
              <dd className="flex flex-col tabular-nums">
                {rateLabels.map((label) => (
                  <span key={label}>{label}</span>
                ))}
              </dd>
            </div>
          )}
        </dl>
        <Separator />
        <section className="flex flex-col gap-1" aria-labelledby="craftsman-about">
          <h2 id="craftsman-about" className="text-muted-foreground">
            {t("about")}
          </h2>
          <About bio={bio} />
        </section>
      </CardContent>
    </Card>
  );
}

/** The Card's shape while the profile streams in. */
export function CraftsmanProfileSkeleton() {
  const t = useTranslations("shell");

  return (
    <Card className="max-w-2xl" aria-busy="true">
      <p role="status" className="sr-only">
        {t("loading")}
      </p>
      <CardHeader className="grid-cols-[auto_1fr] items-center gap-x-4">
        <Skeleton className="row-span-2 size-16 rounded-full" />
        <Skeleton className="h-7 w-56 max-w-full" />
        <Skeleton className="h-5 w-28 rounded-4xl" />
      </CardHeader>
      <CardContent className="gap-4">
        <div className="flex flex-wrap gap-x-6 gap-y-2">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Separator />
        <div className="flex flex-col gap-2">
          <Skeleton className="h-5 w-16" />
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-2/3" />
        </div>
      </CardContent>
    </Card>
  );
}
