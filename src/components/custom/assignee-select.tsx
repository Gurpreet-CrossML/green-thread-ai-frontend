import { IconShieldCheck } from "@tabler/icons-react";
import { Badge } from "@/components/ui/badge";

export type AgentOption = {
  email: string;
  name: string;
  /** Company admin — shown with an "Admin" label. */
  isAdmin?: boolean;
  /** Can't be picked by this user (a supervisor can't assign to an admin). */
  disabled?: boolean;
};

/** Small "Admin" tag shown beside an admin's name. */
export function AdminBadge() {
  return (
    <Badge variant="outline" className="gap-1 px-1.5 py-0 text-[10px]">
      <IconShieldCheck className="size-3" />
      Admin
    </Badge>
  );
}
