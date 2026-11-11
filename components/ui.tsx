"use client";

import { CircleAlert, LoaderCircle, LogOut, Sparkles, Wallet, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { VIA_BASE_URL, shortAddress } from "@/lib/config";
import { publicClient } from "@/lib/contract";
import { optionShare, timeRemaining, totalVotes, isOpen } from "@/lib/polls";
import type { Poll } from "@/lib/types";
import { useNow } from "@/lib/use-now";
import { useRomeWallet } from "./wallet-provider";

export function useChainHealth() {
  const [health, setHealth] = useState<{ online: boolean | null; block?: number }>({
    online: null,
  });
  useEffect(() => {
    let cancelled = false;
    const check = () =>
      publicClient
        .getBlockNumber()
        .then((block) => !cancelled && setHealth({ online: true, block: Number(block) }))
        .catch(() => !cancelled && setHealth({ online: false }));
    void check();
    const interval = window.setInterval(check, 30_000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);
  return health;
}

export function SiteHeader() {
  const wallet = useRomeWallet();
  const [connecting, setConnecting] = useState<"evm" | "solana" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const connect = async (lane: "evm" | "solana") => {
    setError(null);
    setConnecting(lane);
    try {
      if (lane === "evm") await wallet.connectEvm();
      else await wallet.connectSolana();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Wallet connection failed.");
    } finally {
      setConnecting(null);
    }
  };

  return (
    <header className="site-header">
      <div className="shell header-inner">
        <Link className="brand" href="/">
          <Image src="/comitia-mark.svg" alt="" width={34} height={34} priority />
          Comitia
        </Link>
        <nav className="nav" aria-label="Primary navigation">
          <Link href="/#polls">Polls</Link>
          <Link href="/#how-it-works">How it works</Link>
          <a href="https://docs.rome.builders" target="_blank" rel="noreferrer">
            Rome docs
          </a>
        </nav>
        <div className="wallet-cluster">
          {wallet.evmAddress ? (
            <span className="wallet-chip">
              <button
                className={`button button-small button-evm ${wallet.activeLane === "evm" ? "active" : ""}`}
                onClick={() => wallet.selectLane("evm")}
                aria-label={`Use MetaMask address ${wallet.evmAddress}`}
                title={wallet.evmAddress}
              >
                <Wallet size={14} /> <span>{shortAddress(wallet.evmAddress)}</span>
              </button>
              <button
                className="button button-small wallet-disconnect"
                onClick={wallet.disconnectEvm}
                disabled={wallet.isBusy}
                aria-label="Disconnect MetaMask"
                title="Disconnect MetaMask"
              >
                <LogOut size={13} />
              </button>
            </span>
          ) : (
            <button
              className="button button-small"
              disabled={connecting === "evm"}
              onClick={() => void connect("evm")}
              aria-label="Connect MetaMask"
            >
              <Wallet size={14} /> <span>{connecting === "evm" ? "Connecting…" : "MetaMask"}</span>
            </button>
          )}
          {wallet.syntheticAddress ? (
            <span className="wallet-chip">
              <button
                className={`button button-small button-solana ${wallet.activeLane === "solana" ? "active" : ""}`}
                onClick={() => wallet.selectLane("solana")}
                aria-label={`Use Solflare synthetic address ${wallet.syntheticAddress}`}
                title={`Solana ${wallet.solanaAddress}`}
              >
                <Sparkles size={14} /> <span>{shortAddress(wallet.solanaAddress ?? "", 4)}</span>
              </button>
              <button
                className="button button-small wallet-disconnect"
                onClick={wallet.disconnectSolana}
                disabled={wallet.isBusy}
                aria-label="Disconnect Solflare"
                title="Disconnect Solflare"
              >
                <LogOut size={13} />
              </button>
            </span>
          ) : (
            <button
              className="button button-small"
              disabled={connecting === "solana"}
              onClick={() => void connect("solana")}
              aria-label="Connect Solflare"
            >
              <Sparkles size={14} /> <span>{connecting === "solana" ? "Connecting…" : "Solflare"}</span>
            </button>
          )}
        </div>
      </div>
      {error && (
        <div className="wallet-alert" role="alert">
          {error}
        </div>
      )}
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="shell footer-inner">
        <span>Comitia · one vote, both wallet worlds · built on Rome Hadrian</span>
        <a href="https://github.com/hoasine/rome-comitia" target="_blank" rel="noreferrer">
          Source on GitHub
        </a>
      </div>
    </footer>
  );
}

export function LaneSplit({ evm, solana }: { evm: number; solana: number }) {
  const total = evm + solana;
  return (
    <div
      className="lane-split"
      role="img"
      aria-label={`${evm} EVM and ${solana} Solana votes`}
    >
      <span className="evm" style={{ width: `${optionShare(evm, total)}%` }} />
      <span className="solana" style={{ width: `${optionShare(solana, total)}%` }} />
    </div>
  );
}

export function LaneLegend({ evm, solana }: { evm: number; solana: number }) {
  return (
    <div className="lane-legend">
      <span><i className="swatch evm" /> {evm} EVM</span>
      <span><i className="swatch solana" /> {solana} Solana, proven on-chain</span>
    </div>
  );
}

export function PollCard({ poll }: { poll: Poll }) {
  const now = useNow();
  const open = now !== null && isOpen(poll, now);
  const total = totalVotes(poll);
  return (
    <Link className="poll-card" href={`/poll/${poll.id.toString()}`}>
      <div className="poll-meta">
        <span>Poll #{poll.id.toString()} · {poll.options.length} options</span>
        {now !== null && (
          <span className={`status ${open ? "status-open" : "status-closed"}`}>
            {open ? timeRemaining(poll.endsAt, now) : "Closed"}
          </span>
        )}
      </div>
      <h3>{poll.question}</h3>
      <LaneSplit evm={poll.evmVoters} solana={poll.solanaVoters} />
      <div className="poll-meta">
        <LaneLegend evm={poll.evmVoters} solana={poll.solanaVoters} />
        <span>{total} votes</span>
      </div>
    </Link>
  );
}

export function Modal({
  title,
  description,
  onClose,
  children,
}: {
  title: string;
  description: string;
  onClose(): void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input, textarea, select, button")?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      previous?.focus();
    };
  }, [onClose]);

  return (
    <div className="modal-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        ref={ref}
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2>{title}</h2>
        <p>{description}</p>
        {children}
      </section>
    </div>
  );
}

export function TransactionToast() {
  const wallet = useRomeWallet();
  const state = wallet.transaction;
  if (state.status === "idle") return null;
  const hash = "hash" in state ? state.hash : undefined;
  return (
    <div className={`toast ${state.status === "error" ? "toast-error" : ""}`} role="status">
      {state.status === "error" ? (
        <CircleAlert size={18} />
      ) : state.status === "success" ? (
        <Sparkles size={18} />
      ) : (
        <LoaderCircle size={18} className="spin" />
      )}
      <div style={{ flex: 1 }}>
        <p>{state.message}</p>
        {hash && (
          <a href={`${VIA_BASE_URL}/tx/${hash}`} target="_blank" rel="noreferrer">
            View on Via Explorer
          </a>
        )}
      </div>
      {!wallet.isBusy && (
        <button
          className="button button-small"
          onClick={wallet.resetTransaction}
          aria-label="Dismiss transaction status"
        >
          <X size={14} />
        </button>
      )}
    </div>
  );
}
