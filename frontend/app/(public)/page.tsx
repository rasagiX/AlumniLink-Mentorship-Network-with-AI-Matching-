import Link from "next/link";
import { Compass, GraduationCap, Users, ShieldCheck, ArrowRight, Video, Layers, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-content items-center justify-between px-5 py-4 md:px-8">
          <div className="flex items-center gap-2">
            <Compass className="h-5 w-5" />
            <span className="font-display text-lg font-medium">AlumniLink</span>
          </div>
          <nav className="hidden items-center gap-6 text-sm text-muted md:flex">
            <Link href="#directory" className="hover:text-ink">Public Directory</Link>
            <Link href="#program" className="hover:text-ink">Program Model</Link>
            <Link href="#roles" className="hover:text-ink">Institutions</Link>
          </nav>
          <Button asChild size="sm">
            <Link href="/login">Sign In / Register</Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-content gap-10 px-5 py-16 md:grid-cols-[1.15fr_0.85fr] md:px-8 md:py-24">
          <div>
            <Badge tone="accent">Institutional Mentorship Infrastructure</Badge>
            <h1 className="mt-5 max-w-lg font-display text-[2.6rem] font-medium leading-[1.08] tracking-tight md:text-[3.2rem]">
              Semantic trajectory matching, built into a 12-week curriculum.
            </h1>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-muted">
              AlumniLink pairs students with verified alumni mentors using an AI matching layer that reads career
              goals, not keywords — then runs the relationship through a structured, modular curriculum with live
              video consultations built in.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-3">
              <Button size="lg" asChild>
                <Link href="/login">
                  Enter the Platform <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#program">See the program model</Link>
              </Button>
            </div>
            <dl className="mt-12 grid max-w-md grid-cols-3 gap-6 border-t border-line pt-6">
              {[
                ["94%", "median match fit score"],
                ["12", "week modular cycle"],
                ["3", "institutional roles"],
              ].map(([n, l]) => (
                <div key={l}>
                  <dt className="font-display text-2xl font-medium">{n}</dt>
                  <dd className="mt-1 text-xs text-muted">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          <div className="grid gap-4 self-start">
            {[
              { icon: Sparkles, title: "AI Semantic Matching", body: "Vector search over goals, domains, and mentor histories surfaces a ranked fit score for every pairing." },
              { icon: Layers, title: "12-Week Modular LMS", body: "Milestones, resources, and graded assignments unlock week over week for every cycle." },
              { icon: Video, title: "WebRTC Consultations", body: "Scheduled live video sessions are logged automatically against attendance and payout records." },
            ].map((f) => (
              <Card key={f.title}>
                <CardContent className="flex items-start gap-3 p-5">
                  <div className="rounded-sm border border-line bg-paper p-2">
                    <f.icon className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="font-medium">{f.title}</p>
                    <p className="mt-1 text-sm text-muted">{f.body}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Role cards */}
      <section id="roles" className="mx-auto max-w-content px-5 py-16 md:px-8">
        <h2 className="font-display text-2xl font-medium">Three portals, one institutional record</h2>
        <p className="mt-2 max-w-lg text-sm text-muted">
          Every role sees a purpose-built workspace over the same underlying cycle data.
        </p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {[
            { role: "student", icon: GraduationCap, title: "Students", body: "Discover matched mentors, work the 12-week curriculum, and join live consultations.", href: "/login" },
            { role: "mentor", icon: Users, title: "Alumni Mentors", body: "Manage mentee capacity, grade milestones, and track escrow-based honorarium payouts.", href: "/login" },
            { role: "admin", icon: ShieldCheck, title: "Institutional Admins", body: "Monitor every pairing, release payroll, verify accreditation, and resolve inactivity disputes.", href: "/login" },
          ].map((r) => (
            <Card key={r.role} className="flex flex-col">
              <CardContent className="flex flex-1 flex-col gap-3 p-6">
                <r.icon className="h-5 w-5" />
                <p className="font-display text-lg font-medium">{r.title}</p>
                <p className="flex-1 text-sm text-muted">{r.body}</p>
                <Button variant="outline" size="sm" asChild className="mt-2 self-start">
                  <Link href={r.href}>
                    Access {r.title} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section id="program" className="border-t border-line bg-surface">
        <div className="mx-auto max-w-content px-5 py-16 md:px-8">
          <h2 className="font-display text-2xl font-medium">How a cycle runs</h2>
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["Match", "A student's goals are embedded and scored against every active mentor's profile."],
              ["Enroll", "Accepted pairs are placed into a 12-week modular cycle with a shared syllabus."],
              ["Deliver", "Weekly milestones, graded assignments, and live WebRTC consultations."],
              ["Verify", "Session attendance and grades gate the mentor's milestone honorarium."],
            ].map(([t, b], i) => (
              <div key={t} className="rule pt-4">
                <p className="text-xs text-muted">Stage {i + 1}</p>
                <p className="mt-1 font-medium">{t}</p>
                <p className="mt-1.5 text-sm text-muted">{b}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer id="directory" className="border-t border-line">
        <div className="mx-auto max-w-content px-5 py-10 text-sm text-muted md:px-8">
          © 2026 AlumniLink Institutional Platform. Public directory and accreditation records available to
          verified institutions on request.
        </div>
      </footer>
    </div>
  );
}
