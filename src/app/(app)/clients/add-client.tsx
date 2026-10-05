"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ClientForm } from "@/components/clients/client-form";

export function AddClientButton({ label = "Add client", openInitially = false }: { label?: string; openInitially?: boolean }) {
  const router = useRouter();
  const [open, setOpen] = useState(openInitially);
  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <UserPlus aria-hidden /> {label}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(o) => {
          setOpen(o);
          if (!o && openInitially) router.replace("/clients");
        }}
        title="Add client"
      >
        <ClientForm client={null} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
