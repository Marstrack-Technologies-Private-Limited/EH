import { Link } from "react-router-dom";
import { Handshake } from "lucide-react";
import { Button } from "@/components/ui/button.jsx";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
        <Handshake className="size-7" />
      </div>
      <h1 className="text-3xl font-bold">404</h1>
      <p className="text-muted-foreground">This page doesn't exist.</p>
      <Button asChild>
        <Link to="/dashboard">Back to dashboard</Link>
      </Button>
    </div>
  );
}
