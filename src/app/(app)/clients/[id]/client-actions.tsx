"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { ClientForm } from "@/components/clients/client-form";
import { deleteClient } from "@/lib/actions/library";
import type { ClientRow } from "@/types/database";

export function ClientActions({ client }: { client: ClientRow }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  return (
    <>
      <Button variant="secondary" onClick={() => setOpen(true)}>
        <Pencil aria-hidden /> Edit
      </Button>
      <Button
        variant="ghost"
        size="icon"
        aria-label="Delete client"
        disabled={pending}
        onClick={() => {
          if (!window.confirm(`Delete ${client.name}? Their invoices stay exactly as they are.`)) return;
          start(async () => {
            const r = await deleteClient(client.id);
            if (!r.ok) return void toast.error(r.error);
            toast.success("Client deleted");
            router.push("/clients");
          });
        }}
      >
        <Trash2 aria-hidden />
      </Button>
      <Dialog open={open} onOpenChange={setOpen} title="Edit client">
        <ClientForm client={client} onDone={() => setOpen(false)} />
      </Dialog>
    </>
  );
}
