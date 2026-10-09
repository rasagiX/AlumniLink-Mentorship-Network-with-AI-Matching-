"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  UserCircle, Save, Loader2, AlertCircle, CheckCircle2,
  ArrowLeft, Compass, Linkedin, MapPin, BookOpen, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";
import type { Role } from "@/lib/types";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface UserProfile {
  id: string; name: string; email: string; role: Role;
  bio: string | null; year: number | null; branch: string | null;
  avatar_color: string | null; skills: string | null;
  linkedin_url: string | null; campus_location: string | null;
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------
const profileSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  bio: z.string().max(1000, "Max 1000 characters").optional().or(z.literal("")),
  year: z.coerce.number().min(1).max(6).optional().or(z.literal("")),
  branch: z.string().max(100).optional().or(z.literal("")),
  skills: z.string().max(300).optional().or(z.literal("")),
  linkedin_url: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  campus_location: z.string().max(200).optional().or(z.literal("")),
  avatar_color: z.string().optional(),
});
type ProfileValues = z.infer<typeof profileSchema>;

// ---------------------------------------------------------------------------
// Preset avatar colours
// ---------------------------------------------------------------------------
const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e",
  "#f97316", "#eab308", "#22c55e", "#14b8a6",
  "#3b82f6", "#06b6d4", "#64748b", "#1e293b",
];

// ---------------------------------------------------------------------------
// Role labels and portal back-links
// ---------------------------------------------------------------------------
const ROLE_META: Record<Role, { label: string; back: string; tone: "student" | "mentor" | "admin" }> = {
  student:  { label: "Student Portal",         back: "/student/dashboard",  tone: "student" },
  senior:   { label: "Senior Portal",          back: "/senior/dashboard",   tone: "student" },
  mentor:   { label: "Alumni Mentor Portal",   back: "/alumni/dashboard",   tone: "mentor"  },
  admin:    { label: "Admin Console",          back: "/admin/dashboard",    tone: "admin"   },
};

const YEAR_LABELS: Record<number, string> = {
  1: "1st Year", 2: "2nd Year", 3: "3rd Year",
  4: "4th Year", 5: "5th Year", 6: "Final Year",
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------
export default function ProfileEditPage() {
  const router = useRouter();
  const [profile, setProfile] = React.useState<UserProfile | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [saveSuccess, setSaveSuccess] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);
  const [selectedColor, setSelectedColor] = React.useState<string>("#6366f1");

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileValues>({ resolver: zodResolver(profileSchema) });

  const watchedName = watch("name") ?? "";

  // Load current profile
  React.useEffect(() => {
    fetch("/api/profile/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setServerError(d.error); return; }
        setProfile(d);
        const color = d.avatar_color ?? "#6366f1";
        setSelectedColor(color);
        reset({
          name: d.name ?? "",
          bio: d.bio ?? "",
          year: d.year ?? "",
          branch: d.branch ?? "",
          skills: d.skills ?? "",
          linkedin_url: d.linkedin_url ?? "",
          campus_location: d.campus_location ?? "",
          avatar_color: color,
        });
      })
      .catch(() => setServerError("Could not load your profile."))
      .finally(() => setLoading(false));
  }, [reset]);

  const onSubmit = async (values: ProfileValues) => {
    setServerError(null);
    setSaveSuccess(false);

    const payload: Record<string, unknown> = {
      name: values.name,
      avatar_color: selectedColor,
    };
    if (values.bio !== undefined && values.bio !== "") payload.bio = values.bio;
    if (values.year !== undefined && values.year !== "") payload.year = Number(values.year);
    if (values.branch !== undefined && values.branch !== "") payload.branch = values.branch;
    if (values.skills !== undefined && values.skills !== "") payload.skills = values.skills;
    if (values.linkedin_url !== undefined && values.linkedin_url !== "") payload.linkedin_url = values.linkedin_url;
    if (values.campus_location !== undefined && values.campus_location !== "") payload.campus_location = values.campus_location;

    const res = await fetch("/api/profile/me", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) { setServerError(data.error ?? "Save failed."); return; }

    setProfile(data);
    setSaveSuccess(true);
    reset({
      name: data.name ?? "",
      bio: data.bio ?? "",
      year: data.year ?? "",
      branch: data.branch ?? "",
      skills: data.skills ?? "",
      linkedin_url: data.linkedin_url ?? "",
      campus_location: data.campus_location ?? "",
      avatar_color: data.avatar_color ?? selectedColor,
    });
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const roleMeta = profile ? ROLE_META[profile.role] : ROLE_META.student;

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-paper">
        <Loader2 className="h-6 w-6 animate-spin text-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-paper px-4 py-8">
      <div className="mx-auto max-w-2xl">
        {/* Top nav */}
        <div className="mb-6 flex items-center justify-between">
          <Link href={roleMeta.back}
            className="flex items-center gap-2 text-sm text-muted transition-colors hover:text-ink">
            <ArrowLeft className="h-4 w-4" /> Back to portal
          </Link>
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4" />
            <span className="font-display text-sm font-medium">AlumniLink</span>
          </div>
        </div>

        <h1 className="mb-2 font-display text-2xl font-medium">Edit Profile</h1>
        <p className="mb-8 text-sm text-muted">
          Your profile is shown to other users in directories and session requests.
        </p>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
          {/* ── Avatar + name header ── */}
          <Card>
            <CardContent className="flex flex-col items-center gap-6 p-6 sm:flex-row sm:items-start">
              {/* Avatar preview */}
              <div className="flex flex-col items-center gap-3">
                <div
                  className="flex h-20 w-20 items-center justify-center rounded-full text-2xl font-bold text-white shadow-md"
                  style={{ backgroundColor: selectedColor }}
                >
                  {watchedName?.charAt(0)?.toUpperCase() ?? "?"}
                </div>
                {/* Colour picker */}
                <div className="flex flex-wrap justify-center gap-1.5">
                  {AVATAR_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => { setSelectedColor(color); setValue("avatar_color", color); }}
                      title={color}
                      className={cn(
                        "h-6 w-6 rounded-full border-2 transition-transform hover:scale-110",
                        selectedColor === color ? "border-ink scale-110" : "border-transparent"
                      )}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>

              <div className="flex-1 space-y-3 w-full">
                <div>
                  <Label htmlFor="name">Full name</Label>
                  <Input id="name" placeholder="Your name" {...register("name")} />
                  {errors.name && <p className="mt-1 text-xs text-danger">{errors.name.message}</p>}
                </div>
                <div className="flex items-center gap-2">
                  {profile && (
                    <Badge tone={roleMeta.tone}>{roleMeta.label}</Badge>
                  )}
                  {profile?.email && (
                    <span className="text-xs text-muted">{profile.email}</span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ── Academic details (students + seniors) ── */}
          {profile && (profile.role === "student" || profile.role === "senior") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <BookOpen className="h-4 w-4" /> Academic Details
                </CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <Label htmlFor="year">Academic year</Label>
                    <select
                      id="year"
                      className="flex h-10 w-full rounded-sm border border-line bg-paper px-3 py-2 text-sm text-ink focus:outline-none focus:ring-1 focus:ring-ink"
                      {...register("year")}
                    >
                      <option value="">— Select year —</option>
                      {[1, 2, 3, 4, 5, 6].map((y) => (
                        <option key={y} value={y}>{YEAR_LABELS[y]}</option>
                      ))}
                    </select>
                    {errors.year && <p className="mt-1 text-xs text-danger">{errors.year.message?.toString()}</p>}
                    <p className="mt-1 text-xs text-muted">
                      Your year is used to show the right seniors in the directory.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="branch">Branch / Department</Label>
                    <Input id="branch" placeholder="e.g. Computer Science, ECE…" {...register("branch")} />
                    {errors.branch && <p className="mt-1 text-xs text-danger">{errors.branch.message}</p>}
                  </div>
                </div>

                {/* Campus location — useful for seniors offering offline sessions */}
                {profile.role === "senior" && (
                  <div>
                    <Label htmlFor="campus_location" className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-muted" /> Campus location
                      <span className="text-xs font-normal text-muted">(shown to juniors for offline sessions)</span>
                    </Label>
                    <Input id="campus_location" placeholder="e.g. Block C, Room 204 / Library 2nd Floor" {...register("campus_location")} />
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* ── About + skills ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <UserCircle className="h-4 w-4" /> About You
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <Label htmlFor="bio">Bio
                  <span className="ml-1 text-xs font-normal text-muted">(max 1000 characters)</span>
                </Label>
                <Textarea id="bio" rows={4}
                  placeholder="Tell others about yourself — your interests, what you're working on, how you can help…"
                  {...register("bio")} />
                {errors.bio && <p className="mt-1 text-xs text-danger">{errors.bio.message}</p>}
              </div>

              <div>
                <Label htmlFor="skills" className="flex items-center gap-1.5">
                  <Sparkles className="h-3.5 w-3.5 text-muted" /> Skills
                  <span className="text-xs font-normal text-muted">(comma-separated)</span>
                </Label>
                <Input id="skills" placeholder="e.g. Python, Machine Learning, React, DSA, Public Speaking" {...register("skills")} />
                {errors.skills && <p className="mt-1 text-xs text-danger">{errors.skills.message}</p>}
                <p className="mt-1 text-xs text-muted">Shown as tags on your directory card.</p>
              </div>
            </CardContent>
          </Card>

          {/* ── Social links ── */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <Linkedin className="h-4 w-4" /> Social Links
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5">
              <div>
                <Label htmlFor="linkedin_url">LinkedIn URL
                  <span className="ml-1 text-xs font-normal text-muted">(optional)</span>
                </Label>
                <Input id="linkedin_url" type="url" placeholder="https://linkedin.com/in/yourprofile" {...register("linkedin_url")} />
                {errors.linkedin_url && <p className="mt-1 text-xs text-danger">{errors.linkedin_url.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Status messages */}
          {saveSuccess && (
            <div className="flex items-center gap-2 rounded-sm border border-success/30 bg-success/[0.06] px-4 py-3 text-sm text-success">
              <CheckCircle2 className="h-4 w-4 shrink-0" /> Profile saved successfully.
            </div>
          )}
          {serverError && (
            <div className="flex items-start gap-2 rounded-sm border border-danger/30 bg-danger/[0.08] px-4 py-3 text-sm text-danger">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {serverError}
            </div>
          )}

          {/* Submit */}
          <div className="flex items-center justify-between">
            <Button asChild variant="outline">
              <Link href={roleMeta.back}><ArrowLeft className="h-3.5 w-3.5" /> Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting
                ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Saving…</>
                : <><Save className="h-3.5 w-3.5" /> Save Profile</>}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
