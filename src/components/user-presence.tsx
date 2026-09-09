"use client";

import { usePresence } from "@/hooks/use-presence";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

type UserPresenceProps = {
  userId: string;
  name: string;
  imageUrl?: string;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
};

const sizeClasses = {
  sm: "h-8 w-8",
  md: "h-10 w-10",
  lg: "h-12 w-12",
};

const statusColors = {
  online: "bg-green-500",
  offline: "bg-gray-400",
};

export function UserPresence({ userId, name, imageUrl, size = "md", showStatus = true }: UserPresenceProps) {
  const { status, lastSeen } = usePresence(userId);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="relative inline-flex">
      <Avatar className={sizeClasses[size]}>
        <AvatarImage src={imageUrl} alt={name} />
        <AvatarFallback>{initials}</AvatarFallback>
      </Avatar>
      {showStatus && (
        <span
          className={`absolute bottom-0 right-0 rounded-full border-2 border-white ${sizeClasses[size].split(" ")[0] === 'h-8' ? 'h-2.5 w-2.5' : sizeClasses[size].split(" ")[0] === 'h-10' ? 'h-3 w-3' : 'h-3.5 w-3.5'} ${statusColors[status]}`}
          title={status === "online" ? "Online" : `Offline - Último acesso: ${lastSeen?.toLocaleString("pt-BR")}`}
        />
      )}
    </div>
  );
}
