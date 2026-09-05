import type { Metadata } from "next";
import { ImportWizard } from "@/components/import/import-wizard";

export const metadata: Metadata = { title: "Import" };

export default function ImportPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-serif text-3xl font-medium text-ink sm:text-4xl">
        Import
      </h1>
      <p className="mt-3 max-w-2xl text-sm text-muted">
        Bring your history over from Goodreads or Letterboxd. Export a CSV from
        either service, drop it here, and we&rsquo;ll match each title to its
        entry.
      </p>
      <dl className="mt-4 grid gap-3 text-xs text-muted sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <dt className="font-medium text-ink">Goodreads</dt>
          <dd className="mt-1">
            My Books &rarr; Import and export &rarr; Export Library. Upload{" "}
            <code className="rounded bg-surface-2 px-1 py-0.5">
              goodreads_library_export.csv
            </code>
            .
          </dd>
        </div>
        <div className="rounded-lg border border-border bg-surface px-4 py-3">
          <dt className="font-medium text-ink">Letterboxd</dt>
          <dd className="mt-1">
            Settings &rarr; Import &amp; Export &rarr; Export your data. From
            the zip, upload{" "}
            <code className="rounded bg-surface-2 px-1 py-0.5">
              watched.csv
            </code>{" "}
            or{" "}
            <code className="rounded bg-surface-2 px-1 py-0.5">diary.csv</code>.
          </dd>
        </div>
      </dl>

      <div className="mt-8">
        <ImportWizard />
      </div>
    </div>
  );
}
