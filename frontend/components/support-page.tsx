"use client";

import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  LifeBuoy, Send, Loader2, AlertCircle, CheckCircle2,
  MessageSquare, Clock, ChevronDown, ChevronUp,
} from "lucide-react";
import { PageHeader } from "@/components/portal-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { formatDate } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface Ticket {
  id: string;
  subject: string;
  message: string;
  status: string;
  created_at: string;
}

const schema = z.object({
  subject: z.string().min(5, "Subject must be at least 5 characters").max(200),
  message: z.string().min(10, "Describe your issue in at least 10 characters").max(5000),
});
type FormValues = z.infer<typeof schema>;

export function SupportPage({ role }: { role: "student" | "mentor" }) {
  const [tickets, setTickets] = React.useState<Ticket[]>([]);
  const [loadingTickets, setLoadingTickets] = React.useState(true);
  const [submitted, setSubmitted] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [expandedId, setExpandedId] = React.useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const fetchTickets = React.useCallback(() => {
    setLoadingTickets(true);
    fetch("/api/support")
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setTickets(d))
      .catch(() => undefined)
      .finally(() => setLoadingTickets(false));
  }, []);

  React.useEffect(() => { fetchTickets(); }, [fetchTickets]);

  const onSubmit = async (values: FormValues) => {
    setServerError(null);
    const res = await fetch("/api/support", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(values),
    });
    const data = await res.json();
    if (!res.ok) { setServerError(data.error ?? "Failed to submit."); return; }
    reset();
    setSubmitted(true);
    fetchTickets();
    setTimeout(() => setSubmitted(false), 4000);
  };

  const portalLabel = role === "mentor" ? "alumni mentor" : "student";

  return (
    <div>
      <PageHeader
        title="Support"
        description={`Submit a ticket and the AlumniLink admin team will get back to you.`}
      />

      <div className="grid gap-8 lg:grid-cols-[1fr_360px]">
        {/* Left: new ticket form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LifeBuoy className="h-4 w-4" /> New Support Request
            </CardTitle>
          </CardHeader>
          <CardContent className="p-5">
            {submitted && (
              <div className="mb-4 flex items-center gap-2 rounded-sm border border-success/30 bg-success/[0.06] px-4 py-3 text-sm text-success">
                <CheckCircle2 className="h-4 w-4 shrink-0" />
                Your request has been sent. We'll get back to you shortly.
              </div>
            )}

            {serverError && (
              <div className="mb-4 flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-3 py-2 text-sm text-danger">
                <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {serverError}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <div>
                <Label htmlFor="subject">Subject</Label>
                <Input
                  id="subject"
                  placeholder="e.g. Cannot access my LMS modules"
                  {...register("subject")}
                />
                {errors.subject && (
                  <p className="mt-1 text-xs text-danger">{errors.subject.message}</p>
                )}
              </div>

              <div>
                <Label htmlFor="message">
                  Describe your issue
                  <span className="ml-1 text-xs font-normal text-muted">(be as detailed as possible)</span>
                </Label>
                <Textarea
                  id="message"
                  rows={5}
                  placeholder={`As a ${portalLabel}, I'm experiencing an issue with…`}
                  {...register("message")}
                />
                {errors.message && (
                  <p className="mt-1 text-xs text-danger">{errors.message.message}</p>
                )}
              </div>

              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</>
                ) : (
                  <><Send className="h-3.5 w-3.5" /> Send Request</>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Right: previous tickets */}
        <div>
          <h2 className="mb-3 font-display text-lg font-medium flex items-center gap-2">
            <MessageSquare className="h-4 w-4" /> My Tickets
          </h2>

          {loadingTickets ? (
            <div className="flex items-center gap-2 py-6 text-sm text-muted">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </div>
          ) : tickets.length === 0 ? (
            <div className="rounded-md border border-dashed border-line py-10 text-center text-sm text-muted">
              No tickets yet.
            </div>
          ) : (
            <div className="space-y-3">
              {tickets.map((t) => (
                <Card key={t.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium leading-snug">{t.subject}</p>
                      <Badge
                        tone={t.status === "resolved" ? "success" : "accent"}
                        className="shrink-0 flex items-center gap-1"
                      >
                        {t.status === "resolved"
                          ? <><CheckCircle2 className="h-3 w-3" /> Resolved</>
                          : <><Clock className="h-3 w-3" /> Open</>}
                      </Badge>
                    </div>
                    <p className={cn(
                      "text-xs text-muted transition-all",
                      expandedId === t.id ? "" : "line-clamp-2"
                    )}>
                      {t.message}
                    </p>
                    {t.message.length > 100 && (
                      <button
                        onClick={() => setExpandedId(expandedId === t.id ? null : t.id)}
                        className="mt-1 flex items-center gap-1 text-xs text-accent hover:underline"
                      >
                        {expandedId === t.id
                          ? <><ChevronUp className="h-3 w-3" /> Less</>
                          : <><ChevronDown className="h-3 w-3" /> More</>}
                      </button>
                    )}
                    <p className="mt-2 text-[11px] text-muted">{formatDate(t.created_at)}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
