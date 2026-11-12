import { ArrowDownRight, ArrowLeft, ArrowRight, BookOpen, FileText, Layers } from "lucide-react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { ThemeSwitcher } from "@/components/theme-switcher";

const steps = [
  ["Describe your project", "Write a short description or paste a public GitHub repository URL."],
  ["Get a structured draft", "Choose a feature, API, database, or system design template."],
  ["Refine and share", "Edit the Markdown, export a copy, or share a link with your team."],
];

function PublicHeader() {
  return (
    <header className="border-b border-primary/35 bg-background">
      <div aria-hidden="true" className="reading-progress" />
      <div className="mx-auto flex min-h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-8">
        <Link href="/" className="inline-flex items-center gap-2 font-mono text-lg font-bold tracking-tight">
          <Layers aria-hidden="true" className="size-6 text-primary" />
          SpecForge
        </Link>
        <nav aria-label="Main navigation" className="hidden items-center gap-6 font-mono text-sm text-muted-foreground sm:flex">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <Link href="/examples" className="hover:text-foreground">Example</Link>
        </nav>
        <ThemeSwitcher />
      </div>
    </header>
  );
}

function ExampleDocument({ preview = false }: { preview?: boolean }) {
  return (
    <div className="space-y-5">
      <div className="space-y-2">
        {preview && <h2 className="text-xl font-semibold tracking-tight">Library room booking API</h2>}
        <p className="text-sm leading-6 text-muted-foreground">
          A REST API for finding study rooms, reserving time slots, and managing bookings.
        </p>
      </div>
      <section>
        <h3 className="mb-2 font-mono text-sm font-semibold text-primary">01. Overview</h3>
        <p className="text-sm leading-6 text-muted-foreground">Library members can check room availability and reserve a slot with their library account.</p>
      </section>
      {!preview && (
        <section>
          <h3 className="mb-2 font-mono text-sm font-semibold text-primary">02. Goals</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
            <li>Show rooms and available times.</li>
            <li>Allow members to reserve and cancel their own bookings.</li>
            <li>Prevent overlapping reservations.</li>
          </ul>
        </section>
      )}
      <section>
        <h3 className="mb-2 font-mono text-sm font-semibold text-primary">{preview ? "02" : "03"}. API endpoints</h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left font-mono text-xs leading-5 sm:text-sm">
            <thead className="text-muted-foreground">
              <tr className="border-b border-border"><th scope="col" className="py-2 pr-3 font-medium">Method</th><th scope="col" className="py-2 pr-3 font-medium">Endpoint</th><th scope="col" className="py-2 font-medium">Purpose</th></tr>
            </thead>
            <tbody>
              {[
                ["GET", "/rooms", "List available rooms"],
                ["POST", "/bookings", "Reserve a room"],
                ["DELETE", "/bookings/{id}", "Cancel a booking"],
              ].map(([method, path, purpose]) => (
                <tr key={method} className="border-b border-border/70 last:border-0">
                  <td className="py-2 pr-3 font-semibold text-primary">{method}</td>
                  <td className="whitespace-nowrap py-2 pr-3">{path}</td>
                  <td className="py-2 text-muted-foreground">{purpose}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      {!preview && (
        <section>
          <h3 className="mb-2 font-mono text-sm font-semibold text-primary">04. Acceptance criteria</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm leading-6 text-muted-foreground">
            <li>Creating a reservation returns its identifier and time slot.</li>
            <li>A conflicting reservation returns a 409 response.</li>
            <li>Only the booking owner can cancel a reservation.</li>
          </ul>
        </section>
      )}
    </div>
  );
}

export function PublicExample() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto max-w-3xl px-4 py-10 sm:px-8 sm:py-16">
        <Link href="/" className="mb-7 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" /> Back to home</Link>
        <h1 className="mb-7 font-mono text-3xl font-semibold tracking-tight sm:text-4xl">Example: Library room booking API</h1>
        <article className="retro-panel border bg-card p-4 sm:p-8"><ExampleDocument /></article>
        <Button asChild size="lg" className="mt-7 font-mono"><Link href="/app">Create a draft <ArrowRight className="size-4" /></Link></Button>
      </main>
    </div>
  );
}

export default function Landing() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="min-h-screen bg-background text-foreground">
      <PublicHeader />
      <main className="mx-auto max-w-6xl px-4 sm:px-8">
        <section className="retro-hero my-7 grid items-center gap-9 p-4 py-8 sm:my-12 sm:p-8 lg:grid-cols-2 lg:gap-10 lg:p-10 lg:py-14">
          <div>
            <h1 className="max-w-xl text-balance font-mono text-[clamp(1.85rem,4.1vw,3.5rem)] font-bold leading-[1.1] tracking-tight">
              Turn a project idea into a <span className="text-primary">technical spec.</span>
            </h1>
            <p className="mt-5 max-w-lg text-base leading-7 text-muted-foreground sm:text-lg">
              Create a structured draft from a description or public GitHub URL. Refine it in Markdown, then export or share it.
            </p>
            <div className="mt-7 flex flex-wrap gap-3 font-mono">
              <Button asChild size="lg"><Link href="/app"><FileText className="size-4" /> Create a draft</Link></Button>
              <Button asChild size="lg" variant="outline" className="border-primary/65 text-primary"><Link href="/examples"><BookOpen className="size-4" /> View example</Link></Button>
            </div>
          </div>
          <div className="retro-panel retro-preview min-w-0 border bg-card">
            <div className="flex items-center justify-between gap-3 border-b border-primary/30 bg-muted/40 px-4 py-3 sm:px-6">
              <span className="inline-flex items-center gap-2 font-mono text-xs text-muted-foreground"><span aria-hidden="true" className="flex shrink-0 gap-1"><span className="size-1.5 rounded-full bg-rose-500" /><span className="size-1.5 rounded-full bg-amber-500" /><span className="size-1.5 rounded-full bg-emerald-500" /></span> library-room-booking.md</span>
              <Link href="/examples" aria-label="Open the full example" className="rounded p-1 text-muted-foreground hover:text-foreground"><ArrowDownRight className="size-4" /></Link>
            </div>
            <div className="p-4 sm:p-6"><ExampleDocument preview /></div>
          </div>
        </section>
        <ol className="grid gap-6 border-y border-primary/35 py-8 sm:grid-cols-3 sm:gap-8">
          {steps.map(([title, description], index) => (
            <motion.li
              key={title}
              className="flex items-start gap-3"
              initial={reduceMotion ? false : { y: 12 }}
              whileInView={{ y: 0 }}
              viewport={{ once: true, amount: 0.25 }}
              transition={{ duration: 0.35, delay: index * 0.065, ease: "easeOut" }}
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-sm border border-primary/40 bg-primary/10 font-mono text-sm font-semibold text-primary">{index + 1}</span>
              <div><h2 className="font-mono font-semibold">{title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p></div>
            </motion.li>
          ))}
        </ol>
      </main>
      <footer className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-6 text-sm text-muted-foreground sm:px-8">
        <span>SpecForge</span>
        <Link href="/examples" className="hover:text-foreground">Example spec</Link>
      </footer>
    </div>
  );
}
