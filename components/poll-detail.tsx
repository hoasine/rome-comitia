"use client";

import { ArrowLeft, ArrowUpRight, Check, Copy, LoaderCircle } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { COMITIA_ADDRESS, VIA_BASE_URL, isPreviewMode, shortAddress } from "@/lib/config";
import { encodeVote, loadBallot, loadPoll } from "@/lib/contract";
import { demoPolls } from "@/lib/demo-data";
import {
  formatUtc,
  isOpen,
  leadingOption,
  optionShare,
  solanaPubkeyHex,
  timeRemaining,
  totalVotes,
} from "@/lib/polls";
import type { Ballot, Poll } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { LaneLegend, LaneSplit } from "./ui";
import { useRomeWallet } from "./wallet-provider";

export function PollDetail({ pollId }: { pollId: bigint }) {
  const wallet = useRomeWallet();
  const now = useNow();
  const [poll, setPoll] = useState<Poll | null>(
    isPreviewMode ? (demoPolls.find((item) => item.id === pollId) ?? null) : null,
  );
  const [loading, setLoading] = useState(!isPreviewMode);
  const [missing, setMissing] = useState(isPreviewMode && !poll);
  const [ballot, setBallot] = useState<Ballot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = useCallback(async () => {
    if (!isPreviewMode) setPoll(await loadPoll(pollId));
  }, [pollId]);

  useEffect(() => {
    if (isPreviewMode) return;
    let cancelled = false;
    loadPoll(pollId)
      .then((next) => !cancelled && setPoll(next))
      .catch(() => !cancelled && setMissing(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [pollId]);

  useEffect(() => {
    if (isPreviewMode || !wallet.activeAddress) {
      void Promise.resolve().then(() => setBallot(null));
      return;
    }
    let cancelled = false;
    loadBallot(pollId, wallet.activeAddress)
      .then((next) => !cancelled && setBallot(next))
      .catch(() => !cancelled && setBallot(null));
    return () => {
      cancelled = true;
    };
  }, [pollId, wallet.activeAddress]);

  const cast = async (option: number) => {
    setError(null);
    if (!wallet.activeAddress) {
      setError("Connect MetaMask or Solflare to vote.");
      return;
    }
    try {
      const proof =
        wallet.activeLane === "solana" && wallet.solanaAddress
          ? solanaPubkeyHex(wallet.solanaAddress)
          : undefined;
      await wallet.executeCall(encodeVote(pollId, option, proof));
      setBallot({ cast: true, solana: Boolean(proof), option });
      await refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Your vote could not be recorded.");
    }
  };

  const share = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  if (loading) {
    return (
      <main className="shell detail">
        <p><LoaderCircle className="spin" /> Loading poll from Hadrian…</p>
      </main>
    );
  }
  if (missing || !poll) {
    return (
      <main className="shell detail">
        <div>
          <Link className="back-link" href="/"><ArrowLeft size={15} /> All polls</Link>
          <h1>Poll not found.</h1>
          <p className="detail-description">Poll #{pollId.toString()} does not exist on this contract.</p>
        </div>
      </main>
    );
  }

  const open = now === null || isOpen(poll, now);
  const total = totalVotes(poll);
  const leader = leadingOption(poll);
  const canVote = now !== null && open && !ballot?.cast && !wallet.isBusy;

  return (
    <main className="shell detail">
      <div>
        <Link className="back-link" href="/"><ArrowLeft size={15} /> All polls</Link>
        <p className="eyebrow">
          Poll #{poll.id.toString()}
          {now !== null && ` · ${open ? timeRemaining(poll.endsAt, now) : "Closed"}`}
        </p>
        <h1>{poll.question}</h1>
        {poll.description && <p className="detail-description">{poll.description}</p>}
        <LaneLegend evm={poll.evmVoters} solana={poll.solanaVoters} />

        <div className="options" role="list" aria-label="Poll options">
          {poll.options.map((option, index) => {
            const votes = option.evmVotes + option.solanaVotes;
            const chosen = ballot?.cast && ballot.option === index;
            const content = (
              <>
                <div className="option-head">
                  <span>
                    {chosen && <Check size={15} style={{ display: "inline", marginRight: 6 }} />}
                    {option.label}
                    {!open && leader === index && " · winner"}
                  </span>
                  <small>
                    {votes} votes · {optionShare(votes, total)}%
                  </small>
                </div>
                <LaneSplit evm={option.evmVotes} solana={option.solanaVotes} />
                <small className="lane-legend">
                  {option.evmVotes} EVM · {option.solanaVotes} Solana
                </small>
              </>
            );
            return canVote ? (
              <div key={option.label} role="listitem">
                <button
                  className="option"
                  onClick={() => void cast(index)}
                  aria-label={`Vote for ${option.label}`}
                >
                  {content}
                </button>
              </div>
            ) : (
              <div key={option.label} role="listitem" className={`option ${chosen ? "chosen" : ""}`}>
                {content}
              </div>
            );
          })}
        </div>
        {error && <div className="form-error" role="alert" style={{ marginTop: 16 }}>{error}</div>}
      </div>

      <aside className="side-card">
        {ballot?.cast ? (
          <div className="ballot-note">
            You voted for “{poll.options[ballot.option]?.label}”
            {ballot.solana ? " with a proven Solana signature." : " from an EVM address."}
          </div>
        ) : open ? (
          <p className="detail-description" style={{ margin: 0 }}>
            {wallet.activeAddress
              ? `Voting as ${wallet.activeLane === "solana" ? "Solana" : "EVM"} · pick an option to sign.`
              : "Connect MetaMask or Solflare, then pick an option."}
          </p>
        ) : (
          <p className="detail-description" style={{ margin: 0 }}>Voting has closed.</p>
        )}
        <dl>
          <div><dt>Total voters</dt><dd>{total}</dd></div>
          <div><dt>Created by</dt><dd>{shortAddress(poll.creator)}</dd></div>
          <div>
            <dt>Closes</dt>
            <dd>{formatUtc(poll.endsAt)}</dd>
          </div>
        </dl>
        <button className="button" onClick={() => void share()}>
          {copied ? <Check size={15} /> : <Copy size={15} />} {copied ? "Link copied" : "Share poll"}
        </button>
        {COMITIA_ADDRESS && (
          <a
            className="button"
            href={`${VIA_BASE_URL}/address/${COMITIA_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
          >
            Verify on Via <ArrowUpRight size={15} />
          </a>
        )}
      </aside>
    </main>
  );
}
