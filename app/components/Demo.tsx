"use client";

import { useLogin, useLogout, usePrivy } from "@privy-io/react-auth";
import { createPublicClient, encodeFunctionData, http, parseEther } from "viem";
import { useSmartWallet } from "../hooks/useSmartWallet";
import { monadTestnet } from "viem/chains";
import { useState } from "react";

const GIFT_CONTRACT_ADDRESS = "0xa8840D93E91Ff58577017eB2139614cf77eb386a";

const abi = [
  {
    inputs: [
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "unlockTime", type: "uint256" },
      { internalType: "string", name: "note", type: "string" },
    ],
    name: "createGift",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [],
    name: "nextGiftId",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

function shortAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function Demo() {
  const { ready, authenticated, user } = usePrivy();
  const { smartAccountAddress, smartAccountClient, smartAccountReady } =
    useSmartWallet();
  const { logout } = useLogout();
  const { login } = useLogin();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [unlockDateTime, setUnlockDateTime] = useState("");
  const [formError, setFormError] = useState("");

  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [showRejectionModal, setShowRejectionModal] = useState(false);
  const [transactionHash, setTransactionHash] = useState<string>("");
  const [lastGiftId, setLastGiftId] = useState<bigint | null>(null);
  const [isTransactionPending, setIsTransactionPending] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);

  async function handleCreateGift(e: React.FormEvent) {
    e.preventDefault();
    if (!smartAccountReady || !smartAccountAddress) return;

    if (!recipient || !/^0x[a-fA-F0-9]{40}$/.test(recipient)) {
      setFormError("Please enter a valid recipient wallet address");
      return;
    }
    const amountNum = parseFloat(amount);
    if (!amountNum || amountNum <= 0) {
      setFormError("Please enter an amount greater than 0");
      return;
    }
    if (!unlockDateTime) {
      setFormError("Please choose when this should arrive");
      return;
    }
    const unlockTimestamp = Math.floor(new Date(unlockDateTime).getTime() / 1000);
    const nowTimestamp = Math.floor(Date.now() / 1000);
    if (unlockTimestamp <= nowTimestamp) {
      setFormError("That time has already passed — please choose a moment in the future");
      return;
    }

    setFormError("");
    setIsTransactionPending(true);
    try {
      // Read the ID this gift will get, so we can build its link right away.
      let predictedGiftId: bigint | null = null;
      try {
        predictedGiftId = (await publicClient.readContract({
          address: GIFT_CONTRACT_ADDRESS as `0x${string}`,
          abi,
          functionName: "nextGiftId",
        })) as bigint;
      } catch (err) {
        console.error("Could not predict gift ID:", err);
      }

      const data = encodeFunctionData({
        abi,
        functionName: "createGift",
        args: [recipient as `0x${string}`, BigInt(unlockTimestamp), note],
      });

      if (smartAccountClient?.account) {
        const txHash = await smartAccountClient.sendTransaction({
          account: smartAccountClient.account,
          chain: monadTestnet,
          to: GIFT_CONTRACT_ADDRESS,
          data,
          value: parseEther(amount),
        });
        setTransactionHash(txHash);
        setLastGiftId(predictedGiftId);
        setShowTransactionModal(true);
        setLinkCopied(false);
        setRecipient("");
        setAmount("");
        setNote("");
        setUnlockDateTime("");
      }
    } catch (error) {
      console.error("Transaction failed:", error);
      setShowRejectionModal(true);
    } finally {
      setIsTransactionPending(false);
    }
  }

  function handleLogout() {
    logout();
  }

  function closeTransactionModal() {
    setShowTransactionModal(false);
    setTransactionHash("");
    setLastGiftId(null);
  }

  function closeRejectionModal() {
    setShowRejectionModal(false);
  }

  const monadExplorerUrl = `https://testnet.monadexplorer.com/tx/${transactionHash}`;
  const giftLink =
    lastGiftId !== null && typeof window !== "undefined"
      ? `${window.location.origin}/gift/${lastGiftId.toString()}`
      : "";
  const whatsappMessage = `🎁 I sent you something — it'll be ready to open soon. ${giftLink}`;
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(whatsappMessage)}`;

  async function copyGiftLink() {
    try {
      await navigator.clipboard.writeText(giftLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Could not copy link:", err);
    }
  }

  return (
    <>
      <style jsx global>{`
        @import url("https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600&family=Inter:wght@400;500;600&display=swap");

        @keyframes gc-glow {
          0%,
          100% {
            opacity: 0.55;
            transform: scale(1);
          }
          50% {
            opacity: 1;
            transform: scale(1.06);
          }
        }
        @keyframes gc-float {
          0%,
          100% {
            transform: translateY(0px);
          }
          50% {
            transform: translateY(-6px);
          }
        }
        .gc-serif {
          font-family: "Fraunces", ui-serif, Georgia, serif;
        }
        .gc-sans {
          font-family: "Inter", ui-sans-serif, system-ui, sans-serif;
        }
        .gc-seal {
          animation: gc-glow 2.8s ease-in-out infinite;
        }
        .gc-envelope {
          animation: gc-float 4s ease-in-out infinite;
        }
      `}</style>

      <section className="gc-sans bg-[#1E2230] rounded-2xl shadow-xl p-6 md:p-10 border border-[#333850]">
        <div className="max-w-md mx-auto">
          {ready ? (
            <>
              {authenticated && user ? (
                <>
                  <div className="flex items-center justify-between mb-8">
                    <span className="text-[10px] tracking-[0.2em] uppercase text-[#E8A33D] font-semibold">
                      Monad Cash
                    </span>
                    {smartAccountReady && smartAccountAddress ? (
                      <span className="text-[11px] text-[#9098B0] font-mono">
                        {shortAddress(smartAccountAddress)}
                      </span>
                    ) : (
                      <span className="text-[11px] text-[#9098B0]">connecting…</span>
                    )}
                  </div>

                  <h2 className="gc-serif text-2xl md:text-3xl font-semibold text-[#F1EFEA] mb-2">
                    Send something that arrives right on time
                  </h2>
                  <p className="text-[#9098B0] text-sm mb-8">
                    Lock it now. It unlocks itself, exactly when it matters.
                  </p>

                  <form onSubmit={handleCreateGift} className="space-y-6">
                    <div>
                      <label className="block text-[11px] tracking-wider uppercase text-[#9098B0] mb-2">
                        Their wallet address
                      </label>
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="0x..."
                        className="w-full bg-transparent border-0 border-b border-[#333850] focus:border-[#E8A33D] outline-none text-[#F1EFEA] placeholder-[#5b6178] text-base py-2 transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] tracking-wider uppercase text-[#9098B0] mb-2">
                        Amount
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.0001"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          placeholder="0.01"
                          className="w-full bg-transparent border-0 border-b border-[#333850] focus:border-[#E8A33D] outline-none text-[#F1EFEA] placeholder-[#5b6178] text-base py-2 pr-14 transition-colors"
                        />
                        <span className="absolute right-0 top-2 text-[#9098B0] text-sm">
                          MON
                        </span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] tracking-wider uppercase text-[#9098B0] mb-2">
                        Your message
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Happy birthday!"
                        rows={2}
                        className="gc-serif w-full bg-transparent border-0 border-b border-[#333850] focus:border-[#E8A33D] outline-none text-[#F1EFEA] placeholder-[#5b6178] text-base py-2 resize-none transition-colors"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] tracking-wider uppercase text-[#9098B0] mb-2">
                        Arrives on
                      </label>
                      <input
                        type="datetime-local"
                        value={unlockDateTime}
                        onChange={(e) => setUnlockDateTime(e.target.value)}
                        className="w-full bg-transparent border-0 border-b border-[#333850] focus:border-[#E8A33D] outline-none text-[#F1EFEA] text-base py-2 transition-colors [color-scheme:dark]"
                      />
                    </div>

                    {formError && (
                      <p className="text-[#e8734d] text-sm">{formError}</p>
                    )}

                    <div className="pt-4 space-y-4">
                      <button
                        type="submit"
                        disabled={isTransactionPending || !smartAccountReady}
                        className="w-full bg-[#E8A33D] text-[#14171F] px-6 py-3.5 rounded-xl font-semibold hover:brightness-110 active:brightness-95 transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed shadow-lg shadow-[#E8A33D]/10"
                      >
                        {isTransactionPending ? "Sending…" : "Send Gift"}
                      </button>

                      <button
                        type="button"
                        onClick={handleLogout}
                        className="w-full text-[#9098B0] text-sm hover:text-[#F1EFEA] transition-colors"
                      >
                        Log out
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <div className="text-center py-4">
                  <div className="gc-envelope inline-block mb-6">
                    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
                      <rect x="6" y="14" width="44" height="32" rx="4" stroke="#E8A33D" strokeWidth="2" />
                      <path d="M8 16L28 34L48 16" stroke="#E8A33D" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      <circle className="gc-seal" cx="28" cy="30" r="3" fill="#E8A33D" />
                    </svg>
                  </div>
                  <span className="block text-[10px] tracking-[0.2em] uppercase text-[#E8A33D] font-semibold mb-4">
                    Monad Cash
                  </span>
                  <h1 className="gc-serif text-3xl md:text-4xl font-semibold text-[#F1EFEA] mb-3 leading-tight">
                    Send something that arrives right on time
                  </h1>
                  <p className="text-[#9098B0] text-sm mb-8 max-w-xs mx-auto">
                    Lock money for someone you care about. It stays untouched until the exact moment it matters.
                  </p>
                  <button
                    onClick={login}
                    className="w-full bg-[#E8A33D] text-[#14171F] px-6 py-3.5 rounded-xl font-semibold hover:brightness-110 active:brightness-95 transition-all duration-150 shadow-lg shadow-[#E8A33D]/10"
                  >
                    Get Started
                  </button>
                  <p className="text-[#5b6178] text-xs mt-3">Takes less than a minute</p>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="w-3/4 h-8 bg-[#333850] rounded mb-6 animate-pulse mx-auto" />
              <div className="w-2/3 h-4 bg-[#333850] rounded mb-6 animate-pulse mx-auto" />
              <div className="w-full h-12 bg-[#333850] rounded-xl animate-pulse" />
            </>
          )}
        </div>

        {showTransactionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="gc-sans bg-[#1E2230] rounded-2xl p-6 md:p-8 max-w-md w-full border border-[#333850] shadow-2xl">
              <div className="text-center">
                <div className="w-14 h-14 bg-[#E8A33D]/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[#E8A33D]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="gc-serif text-xl font-semibold text-[#F1EFEA] mb-2">
                  Gift Sent
                </h3>
                <p className="text-[#9098B0] text-sm mb-6">
                  It&apos;s locked and waiting for its moment.
                </p>

                {giftLink ? (
                  <div className="space-y-3 mb-2">
                    
                      <a href={whatsappUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block w-full bg-[#E8A33D] text-[#14171F] px-4 py-3 rounded-xl font-semibold hover:brightness-110 transition-all duration-150"
                    >
                      Share on WhatsApp
                    </a>
                    <button
                      onClick={copyGiftLink}
                      className="w-full bg-transparent border border-[#333850] text-[#F1EFEA] px-4 py-2.5 rounded-xl font-medium hover:border-[#9098B0] transition-colors text-sm"
                    >
                      {linkCopied ? "Copied!" : "Copy link instead"}
                    </button>
                  </div>
                ) : (
                  <p className="text-[#5b6178] text-xs mb-4">
                    Find this gift&apos;s link from your transaction if needed.
                  </p>
                )}

                <div className="flex items-center justify-center gap-4 mt-5">
                  
                  <a href={monadExplorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#5b6178] text-xs hover:text-[#9098B0] transition-colors"
                  >
                    View transaction
                  </a>
                  <span className="text-[#333850]">·</span>
                  <button
                    onClick={closeTransactionModal}
                    className="text-[#5b6178] text-xs hover:text-[#9098B0] transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showRejectionModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="gc-sans bg-[#1E2230] rounded-2xl p-6 md:p-8 max-w-md w-full border border-[#333850] shadow-2xl">
              <div className="text-center">
                <div className="w-14 h-14 bg-[#e8734d]/15 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-7 h-7 text-[#e8734d]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="gc-serif text-xl font-semibold text-[#F1EFEA] mb-2">
                  That didn&apos;t go through
                </h3>
                <p className="text-[#9098B0] text-sm mb-6">
                  The gift wasn&apos;t sent. Check your balance and try again, or wait a moment if you&apos;ve sent several gifts recently.
                </p>
                <button
                  onClick={closeRejectionModal}
                  className="w-full bg-transparent border border-[#333850] text-[#F1EFEA] px-4 py-2.5 rounded-xl font-medium hover:border-[#9098B0] transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </>
  );
}