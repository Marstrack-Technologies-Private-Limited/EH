import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar.jsx";
import { OnlineDot } from "@/components/online-dot.jsx";
import { initials } from "@/lib/utils.js";
import { cn } from "@/lib/utils.js";

export function UserAvatar({ user, className, showStatus = false }) {
  if (!user) return null;
  return (
    <div className="relative inline-flex">
      <Avatar className={className}>
        {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
        <AvatarFallback>{initials(user.name)}</AvatarFallback>
      </Avatar>
      {showStatus && (
        <OnlineDot online={user.online} className={cn("absolute -bottom-0 -right-0")} />
      )}
    </div>
  );
}
