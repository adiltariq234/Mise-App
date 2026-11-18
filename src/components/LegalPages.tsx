import { useEffect } from 'react';
import { X } from 'lucide-react';

export type LegalView = 'privacy' | 'terms' | null;

const LAST_UPDATED = '15 November 2026';

export function LegalPages({
  view,
  onClose,
}: {
  view: Exclude<LegalView, null>;
  onClose: () => void;
}) {
  // Escape closes the dialog (QA finding 16 Nov 2026 — previously only the
  // bottom Close button worked).
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={view === 'privacy' ? 'Privacy Policy' : 'Terms and Conditions'}
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-900/60 p-4 sm:p-8"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-white p-6 shadow-xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-slate-900">
              {view === 'privacy' ? 'Privacy Policy' : 'Terms and Conditions'}
            </h2>
            <p className="mt-1 text-xs text-slate-500">Last updated: {LAST_UPDATED}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        {view === 'privacy' ? (
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-700">
            <section>
              <h3 className="font-semibold text-slate-900">What Fridjo is</h3>
              <p>
                Fridjo is a smart fridge scanner and culinary assistant. You upload
                a photo of your open fridge, Fridjo identifies the ingredients in
                it, and suggests recipes you can cook with what you have.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900">
                AI image processing — please read
              </h3>
              <p>
                When you scan a fridge photo, the image is sent from your
                device to our AI provider, <strong>OpenRouter</strong>, which
                forwards it to the selected AI model provider (currently
                Nvidia) for processing. The model returns a list of detected
                ingredients and recipe suggestions. Your photo is processed to
                provide this service; we do <strong>not</strong> claim that
                OpenRouter or its model provider never stores or logs the
                image — their handling is governed by their own privacy
                policies, which you should review if this matters to you.
              </p>
              <p>
                Fridjo&apos;s own server does not keep a copy of your photos.
                A small thumbnail of your most recent scan is stored only in
                your browser&apos;s local storage (on your device) so the scan
                can be restored after a refresh. You can clear it at any time
                from the scan panel.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900">
                Data stored on your device
              </h3>
              <p>
                Fridjo stores the following only in your browser&apos;s local
                storage, on your own device: your fridge ingredients, your
                most recent scan and scan history, your favourite recipes, and
                your shopping list. None of this is sent to a Fridjo server or
                shared with anyone. Clearing your browser data removes it.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900">Accounts</h3>
              <p>
                Fridjo does not currently have user accounts. There is no
                sign-up, no password, and no profile. Because there are no
                accounts, your data does not sync between devices.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900">Analytics</h3>
              <p>
                Fridjo does not run analytics or advertising trackers. The
                hosting provider (Vercel) keeps standard server logs for
                security and operations.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900">Children</h3>
              <p>
                Fridjo is intended for users aged 16 and over. Please do not
                upload photos that contain people, especially children.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900">Changes</h3>
              <p>
                If this policy changes, the &quot;Last updated&quot; date
                above will change. Continued use of Fridjo after a change means
                you accept the updated policy.
              </p>
            </section>
          </div>
        ) : (
          <div className="mt-5 space-y-4 text-sm leading-relaxed text-slate-700">
            <section>
              <h3 className="font-semibold text-slate-900">The service</h3>
              <p>
                Fridjo provides AI-generated ingredient detection and recipe
                suggestions. The service is provided &quot;as is&quot;,
                without warranties of any kind.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900">
                AI-generated content
              </h3>
              <p>
                Recipes, ingredient lists, cooking times, and calorie
                estimates are generated by an AI model. They may be wrong,
                incomplete, or unsuitable for your needs. Always use your own
                judgement: check ingredients for freshness and allergens,
                verify cooking temperatures and times, and never rely on Fridjo
                for medical or dietary advice. Fridjo is not responsible for any
                harm resulting from following a recipe.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900">Acceptable use</h3>
              <p>
                Do not upload photos you do not have the right to share, and
                do not upload photos of people. Do not abuse the service —
                automated or excessive requests are rate-limited, and abuse
                may result in your access being blocked.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900">Fair use limits</h3>
              <p>
                To keep the free service available to everyone, AI scans and
                recipe generations are limited per device (currently 10 scans
                and 20 recipe generations per hour). If you exceed a limit you
                will see a message asking you to wait.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900">Intellectual property</h3>
              <p>
                The Fridjo name, logo, and interface are owned by the operator
                of this service. Recipes generated for you are yours to use.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900">Liability</h3>
              <p>
                To the maximum extent permitted by law, the operator of Fridjo
                is not liable for any loss or damage arising from your use of
                the service, including from AI-generated content.
              </p>
            </section>

            <section>
              <h3 className="font-semibold text-slate-900">Changes</h3>
              <p>
                These terms may change from time to time. The &quot;Last
                updated&quot; date above will change when they do.
              </p>
            </section>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="mt-6 w-full rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white hover:bg-emerald-800"
        >
          Close
        </button>
      </div>
    </div>
  );
}
