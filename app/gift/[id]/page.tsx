"use client";

import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { createPublicClient, http, encodeFunctionData, formatEther } from "viem";
import { monadTestnet } from "viem/chains";
import { useLogin, usePrivy } from "@privy-io/react-auth";
import { useSmartWallet } from "../../hooks/useSmartWallet";

const GIFT_CONTRACT_ADDRESS = "0xa8840D93E91Ff58577017eB2139614cf77eb386a";

const abi = [
  {
    inputs: [{ internalType: "uint256", name: "giftId", type: "uint256" }],
    name: "getGift",
    outputs: [
      { internalType: "address", name: "sender", type: "address" },
      { internalType: "address", name: "recipient", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
      { internalType: "uint256", name: "unlockTime", type: "uint256" },
      { internalType: "string", name: "note", type: "string" },
      { internalType: "bool", name: "claimed", type: "bool" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "uint256", name: "giftId", type: "uint256" }],
    name: "claimGift",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;

type GiftData = {
  sender: string;
  recipient: string;
  amount: bigint;
  unlockTime: bigint;
  note: string;
  claimed: boolean;
};

const publicClient = createPublicClient({
  chain: monadTestnet,
  transport: http(),
});

export default function GiftPage() {
  const params = useParams();
  const giftId = params?.id as string;

  const { ready, authenticated } = usePrivy();
  const { login } = useLogin();
  const { smartAccountAddress, smartAccountClient, smartAccountReady } = useSmartWallet();

  const [gift, setGift] = useState<GiftData | null>(null);
  const [loadError, setLoadError] = useState("");
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimError, setClaimError] = useState("");
  const [claimSuccess, setClaimSuccess] = useState(false);

  useEffect(() => {
    async function fetchGift() {
      try {
        const result = await publicClient.readContract({
          address: GIFT_CONTRACT_ADDRESS as `0x${string}`,
          abi,
          functionName: "getGift",
          args: [BigInt(giftId)],
        });
        const [sender, recipient, amount, unlockTime, note, claimed] = result as [
          string,
          string,
          bigint,
          bigint,
          string,
          boolean
        ];
        setGift({ sender, recipient, amount, unlockTime, note, claimed });
      } catch (err) {
        console.error(err);
        setLoadError("This gift could not be found.");
      }
    }
    if (giftId) fetchGift();
  }, [giftId]);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  async function handleClaim() {
    if (!smartAccountReady || !smartAccountClient?.account) return;
    setClaimError("");
    setIsClaiming(true);
    try {
      const data = encodeFunctionData({
        abi,
        functionName: "claimGift",
        args: [BigInt(giftId)],
      });
      await smartAccountClient.sendTransaction({
        account: smartAccountClient.account,
        chain: monadTestnet,
        to: GIFT_CONTRACT_ADDRESS,
        data,
      });
      setClaimSuccess(true);
      setGift((prev) => (prev ? { ...prev, claimed: true } : prev));
    } catch (err) {
      console.error(err);
      setClaimError(
        "The claim failed. Make sure you're logged in as the recipient and the unlock time has passed."
      );
    } finally {
      setIsClaiming(false);
    }
  }

  function formatCountdown(seconds: number) {
    if (seconds <= 0) return "Ready now";
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (days > 0) return `${days}d ${hours}h ${minutes}m`;
    if (hours > 0) return `${hours}h ${minutes}m ${secs}s`;
    return `${minutes}m ${secs}s`;
  }

  if (loadError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-8 max-w-md w-full text-center border border-slate-200 dark:border-slate-700">
          <p className="text-slate-700 dark:text-slate-200">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!gift) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
        <div className="animate-pulse text-slate-500 dark:text-slate-400">
          Loading gift...
        </div>
      </div>
    );
  }

  const secondsRemaining = Number(gift.unlockTime) - now;
  const isUnlocked = secondsRemaining <= 0;
  const amountFormatted = formatEther(gift.amount);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 max-w-md w-full border border-slate-200 dark:border-slate-700">
        {gift.claimed || claimSuccess ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg
                className="w-8 h-8 text-green-600 dark:text-green-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              This gift has been claimed
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm">
              {amountFormatted} MON was sent to the recipient.
            </p>
          </div>
        ) : !isUnlocked ? (
          <div className="text-center">
            <div className="w-16 h-16 bg-amber-100 dark:bg-amber-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              🎁
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              A gift is waiting for you
            </h2>
            {gift.note && (
              <p className="text-slate-600 dark:text-slate-300 italic mb-4">
                &quot;{gift.note}&quot;
              </p>
            )}
            <p className="text-slate-500 dark:text-slate-400 text-sm mb-1">
              Unlocks in
            </p>
            <p className="text-2xl font-mono font-bold text-slate-800 dark:text-slate-100 mb-6">
              {formatCountdown(secondsRemaining)}
            </p>
            <p className="text-slate-400 dark:text-slate-500 text-xs">
              Come back once the timer runs out to claim it.
            </p>
          </div>
        ) : (
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              🎉
            </div>
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
              Your gift is ready!
            </h2>
            {gift.note && (
              <p className="text-slate-600 dark:text-slate-300 italic mb-2">
                &quot;{gift.note}&quot;
              </p>
            )}
            <p className="text-2xl font-bold text-slate-800 dark:text-slate-100 mb-6">
              {amountFormatted} MON
            </p>

            {!ready ? (
              <div className="w-full h-12 bg-slate-200 dark:bg-slate-600 rounded-lg animate-pulse" />
            ) : !authenticated ? (
              <button
                onClick={login}
                className="w-full bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors duration-200"
              >
                Log in to claim
              </button>
            ) : (
              <>
                {smartAccountAddress && (
                  <p className="text-slate-400 dark:text-slate-500 text-xs mb-4 font-mono break-all">
                    Claiming as {smartAccountAddress}
                  </p>
                )}
                <button
                  onClick={handleClaim}
                  disabled={isClaiming || !smartAccountReady}
                  className="w-full bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClaiming ? "Claiming..." : "Claim Gift"}
                </button>
              </>
            )}
            {claimError && (
              <p className="text-red-600 dark:text-red-400 text-sm mt-4">
                {claimError}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}