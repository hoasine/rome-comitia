"use client";

import { ArrowRight, ArrowUpRight, LoaderCircle, Plus, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { COMITIA_ADDRESS, VIA_BASE_URL, isPreviewMode } from "@/lib/config";
import { encodeCreatePoll, loadPollCount, loadPolls } from "@/lib/contract";
import { demoPolls } from "@/lib/demo-data";
import { DURATIONS, MAX_OPTIONS, MIN_OPTIONS, isOpen, validatePollInput } from "@/lib/polls";
import type { Poll } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { Modal, PollCard, useChainHealth } from "./ui";
import { useRomeWallet } from "./wallet-provider";

type Filter = "open" | "closed" | "all";

export function ComitiaHome() {
  const wallet = useRomeWallet();
  const router = useRouter();
  const health = useChainHealth();
  const [polls, setPolls] = useState<Poll[]>(isPreviewMode ? demoPolls : []);
  const [loading, setLoading] = useState(!isPreviewMode);
  const [notice, setNotice] = useState<string | null>(null);
  const [filter, setFilter] = useState<Filter>("open");
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isPreviewMode) return;
    loadPolls()
      .then(setPolls)
      .catch((error: unknown) =>
        setNotice(error instanceof Error ? error.message : "Could not read polls from Hadrian."),
      )
      .finally(() => setLoading(false));
  }, []);

  const now = useNow();
  const visible = useMemo(
    () =>
      polls.filter((poll) =>
        filter === "all" || now === null
          ? true
          : filter === "open"
            ? isOpen(poll, now)
            : !isOpen(poll, now),
      ),
    [filter, now, polls],
  );

  const stats = useMemo(
    () => ({
      polls: polls.length,
      open: now === null ? null : polls.filter((poll) => isOpen(poll, now)).length,
      evm: polls.reduce((total, poll) => total + poll.evmVoters, 0),
      solana: polls.reduce((total, poll) => total + poll.solanaVoters, 0),
    }),
    [now, polls],
  );

  return (
    <main>
      <section className="shell hero">
        <div>
          <span className={`kicker ${health.online === false ? "offline" : ""}`} data-testid="network-health">
            <span className="dot" />
            {isPreviewMode
              ? "Preview data · read only"
              : health.online === null
                ? "Checking Hadrian…"
                : health.online
                  ? `Live on Hadrian · block ${health.block?.toLocaleString("en-US")}`
                  : "Hadrian RPC unreachable"}
          </span>
          <h1>
            One vote. <em>Both wallet worlds.</em>
          </h1>
          <p className="hero-copy">
            Comitia runs polls that MetaMask and Solflare users vote in together. One
            contract on Rome counts every ballot, and proves on-chain which ones came
            from Solana wallets.
          </p>
          <div className="hero-actions">
            <button className="button button-primary button-large" onClick={() => setCreating(true)}>
              <Plus size={17} /> Create a poll
            </button>
            <a className="button button-large" href="#polls">
              Browse polls <ArrowRight size={16} />
            </a>
          </div>
        </div>
        <aside className="proof-card">
          <h2>Solana votes you can verify.</h2>
          <p>
            Rome gives every Solana wallet a synthetic EVM address. Comitia checks that
            derivation before counting a Solana ballot, so the split below is a fact of
            the contract, not a claim of the website.
          </p>
          <code>
            {"require(\n  address(keccak256(solanaPubkey))\n    == msg.sender\n)"}
          </code>
        </aside>
      </section>

      <section className="shell stats" aria-label="Comitia statistics">
        <div><strong>{loading ? "—" : stats.polls}</strong><span>polls</span></div>
        <div><strong>{loading || stats.open === null ? "—" : stats.open}</strong><span>open now</span></div>
        <div><strong>{loading ? "—" : stats.evm}</strong><span>EVM voters</span></div>
        <div><strong>{loading ? "—" : stats.solana}</strong><span>proven Solana voters</span></div>
      </section>

      <section className="shell section" id="polls">
        <div className="section-head">
          <div>
            <p className="eyebrow">The forum</p>
            <h2>Polls in session.</h2>
          </div>
          <div className="tabs" role="group" aria-label="Filter polls">
            {(["open", "closed", "all"] as const).map((value) => (
              <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)}>
                {value === "open" ? "Open" : value === "closed" ? "Closed" : "All"}
              </button>
            ))}
          </div>
        </div>
        {isPreviewMode && (
          <p className="notice">
            Showing sample polls. Configure the deployed contract to read live Hadrian data.
          </p>
        )}
        {notice && <p className="notice" role="alert">{notice}</p>}
        <div className="poll-grid">
          {loading ? (
            <div className="empty-state">
              <LoaderCircle className="spin" /> Loading polls from Hadrian…
            </div>
          ) : visible.length ? (
            visible.map((poll) => <PollCard key={poll.id.toString()} poll={poll} />)
          ) : (
            <div className="empty-state">
              No {filter === "all" ? "" : filter} polls yet. Start the first one.
            </div>
          )}
        </div>
      </section>

      <section className="shell section" id="how-it-works">
        <div className="section-head">
          <div>
            <p className="eyebrow">How it works</p>
            <h2>Simple to run. Hard to fake.</h2>
          </div>
          {COMITIA_ADDRESS && (
            <a
              className="button"
              href={`${VIA_BASE_URL}/address/${COMITIA_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
            >
              View contract <ArrowUpRight size={15} />
            </a>
          )}
        </div>
        <div className="steps">
          <article className="step">
            <span>01</span>
            <h3>Ask the question</h3>
            <p>Anyone opens a poll with two to six options and a deadline, from either wallet.</p>
          </article>
          <article className="step">
            <span>02</span>
            <h3>Vote from any wallet</h3>
            <p>MetaMask votes directly. Solflare votes through Rome without ever creating an EVM key.</p>
          </article>
          <article className="step">
            <span>03</span>
            <h3>Read a proven split</h3>
            <p>Every address votes once. Solana ballots are verified against the signer&apos;s public key.</p>
          </article>
        </div>
      </section>

      {creating && (
        <CreatePollModal
          onClose={() => setCreating(false)}
          onCreated={async () => {
            setCreating(false);
            const count = await loadPollCount();
            router.push(`/poll/${count}`);
          }}
          canSign={Boolean(wallet.activeAddress)}
        />
      )}
    </main>
  );
}

function CreatePollModal({
  onClose,
  onCreated,
  canSign,
}: {
  onClose(): void;
  onCreated(): Promise<void>;
  canSign: boolean;
}) {
  const wallet = useRomeWallet();
  const [options, setOptions] = useState(["", ""]);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const question = String(data.get("question") ?? "").trim();
    const description = String(data.get("description") ?? "").trim();
    const validation = validatePollInput(question, description, options);
    if (validation) return setError(validation);
    if (!canSign) return setError("Connect MetaMask or Solflare to sign the poll.");
    setError(null);
    try {
      await wallet.executeCall(
        encodeCreatePoll(
          question,
          description,
          options.map((option) => option.trim()).filter(Boolean),
          Number(data.get("duration")),
        ),
      );
      await onCreated();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "The poll could not be created.");
    }
  };

  return (
    <Modal
      title="Open a new poll"
      description="Your wallet signs one transaction. Options and the deadline cannot change later."
      onClose={onClose}
    >
      <form onSubmit={(event) => void submit(event)}>
        <label className="field">
          <span>Question</span>
          <input name="question" maxLength={200} placeholder="What should we ship next?" required />
        </label>
        <label className="field">
          <span>Context (optional)</span>
          <textarea name="description" maxLength={500} />
        </label>
        <div className="field">
          <span>Options</span>
          <div className="option-inputs">
            {options.map((value, index) => (
              <div className="option-row" key={index}>
                <input
                  aria-label={`Option ${index + 1}`}
                  value={value}
                  maxLength={64}
                  placeholder={`Option ${index + 1}`}
                  onChange={(event) =>
                    setOptions((items) =>
                      items.map((item, itemIndex) => (itemIndex === index ? event.target.value : item)),
                    )
                  }
                />
                {options.length > MIN_OPTIONS && (
                  <button
                    type="button"
                    className="button button-small"
                    aria-label={`Remove option ${index + 1}`}
                    onClick={() => setOptions((items) => items.filter((_, itemIndex) => itemIndex !== index))}
                  >
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
            {options.length < MAX_OPTIONS && (
              <button
                type="button"
                className="button button-small"
                onClick={() => setOptions((items) => [...items, ""])}
              >
                <Plus size={14} /> Add option
              </button>
            )}
          </div>
        </div>
        <label className="field">
          <span>Voting closes after</span>
          <select name="duration" defaultValue={DURATIONS[3].seconds}>
            {DURATIONS.map((duration) => (
              <option key={duration.seconds} value={duration.seconds}>
                {duration.label}
              </option>
            ))}
          </select>
        </label>
        {error && <div className="form-error" role="alert">{error}</div>}
        <div className="form-actions">
          <button type="button" className="button" onClick={onClose}>Cancel</button>
          <button className="button button-primary" disabled={wallet.isBusy}>
            {wallet.isBusy ? "Signing…" : "Open poll"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
