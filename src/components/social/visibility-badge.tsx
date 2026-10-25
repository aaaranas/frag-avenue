import { Globe, Lock, Users } from "lucide-react";
import { VISIBILITY_LABEL, type Visibility } from "@/modules/wear-logs";
import { Badge } from "@/components/ui/badge";

const ICON = { PUBLIC: Globe, FOLLOWERS: Users, PRIVATE: Lock } as const;

/** Who can see a wear, on the owner's own views. The label carries the meaning. */
export function VisibilityBadge({ visibility }: { visibility: Visibility }) {
  const Icon = ICON[visibility];
  return (
    <Badge variant="outline" className="font-normal text-[color:var(--fg-muted)]">
      <Icon aria-hidden />
      {VISIBILITY_LABEL[visibility]}
    </Badge>
  );
}
