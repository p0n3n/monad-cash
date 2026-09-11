"use client";

import { useLogin, useLogout, usePrivy } from "@privy-io/react-auth";
import { encodeFunctionData, parseEther } from "viem";
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
] as const;

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
  const [isTransactionPending, setIsTransactionPending] = useState(false);

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
      setFormError("Please choose an unlock date and time");
      return;
    }
    const unlockTimestamp = Math.floor(new Date(unlockDateTime).getTime() / 1000);
    const nowTimestamp = Math.floor(Date.now() / 1000);
    if (unlockTimestamp <= nowTimestamp) {
      setFormError("Unlock time must be in the future");
      return;
    }

    setFormError("");
    setIsTransactionPending(true);
    try {
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
        console.log(txHash);
        setTransactionHash(txHash);
        setShowTransactionModal(true);
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
  }

  function closeRejectionModal() {
    setShowRejectionModal(false);
  }

  const monadExplorerUrl = `https://testnet.monadexplorer.com/tx/${transactionHash}`;

  return (
    <>
      <section className="bg-white dark:bg-slate-800 rounded-xl shadow-lg p-6 md:p-8 border border-slate-200 dark:border-slate-700">
        <div className="max-w-md mx-auto">
          {ready ? (
            <>
              <h2 className="text-xl md:text-2xl font-bold text-slate-800 dark:text-slate-100 mb-2 text-center">
                Send a Gift
              </h2>
              <p className="text-slate-600 dark:text-slate-300 text-sm mb-6 text-center">
                Lock money for someone, unlocked exactly when it matters
              </p>

              {authenticated && user ? (
                <>
                  {smartAccountReady ? (
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 text-center font-mono">
                      Connected to {smartAccountAddress}
                    </p>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 text-xs mb-6 text-center">
                      Connecting to smart wallet...
                    </p>
                  )}

                  <form onSubmit={handleCreateGift} className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Recipient's wallet address
                      </label>
                      <input
                        type="text"
                        value={recipient}
                        onChange={(e) => setRecipient(e.target.value)}
                        placeholder="0x..."
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Amount (MON)
                      </label>
                      <input
                        type="number"
                        step="0.0001"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        placeholder="0.01"
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Note
                      </label>
                      <textarea
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Happy birthday!"
                        rows={2}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                        Unlock date & time
                      </label>
                      <input
                        type="datetime-local"
                        value={unlockDateTime}
                        onChange={(e) => setUnlockDateTime(e.target.value)}
                        className="w-full px-4 py-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100"
                      />
                    </div>

                    {formError && (
                      <p className="text-red-600 dark:text-red-400 text-sm">{formError}</p>
                    )}

                    <div className="space-y-3 pt-2">
                      <button
                        type="submit"
                        disabled={isTransactionPending || !smartAccountReady}
                        className="w-full bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isTransactionPending ? "Sending..." : "Send Gift"}
                      </button>

                      <button
                        type="button"
                        className="w-full bg-red-600 dark:bg-red-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-red-700 dark:hover:bg-red-600 transition-colors duration-200"
                        onClick={handleLogout}
                      >
                        Disconnect Wallet
                      </button>
                    </div>
                  </form>
                </>
              ) : (
                <button
                  onClick={login}
                  className="w-full bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-lg font-semibold hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors duration-200 flex items-center justify-center"
                >
                  Connect Wallet
                </button>
              )}
            </>
          ) : (
            <>
              <div className="w-3/4 h-8 bg-slate-200 dark:bg-slate-600 rounded mb-6 animate-pulse mx-auto" />
              <div className="w-2/3 h-4 bg-slate-200 dark:bg-slate-600 rounded mb-6 animate-pulse mx-auto" />
              <div className="w-full h-12 bg-slate-200 dark:bg-slate-600 rounded-lg animate-pulse" />
            </>
          )}
        </div>

        {showTransactionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 md:p-8 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Gift Sent!
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-4">
                  Your gift is locked and waiting for its unlock date.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => window.open(monadExplorerUrl, "_blank")}
                    className="flex-1 bg-slate-800 dark:bg-slate-100 text-white dark:text-slate-900 px-4 py-2 rounded-lg font-semibold hover:bg-slate-700 dark:hover:bg-slate-200 transition-colors duration-200"
                  >
                    View on Explorer
                  </button>
                  <button
                   onClick={closeTransactionModal}
                    className="flex-1 bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors duration-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {showRejectionModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl p-6 md:p-8 max-w-md w-full border border-slate-200 dark:border-slate-700 shadow-2xl">
              <div className="text-center">
                <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-100 mb-2">
                  Transaction Rejected
                </h3>
                <p className="text-slate-600 dark:text-slate-300 mb-6">
                  Something went wrong sending the gift.
                </p>
                <button
                  onClick={closeRejectionModal}
                  className="w-full bg-slate-200 dark:bg-slate-600 text-slate-700 dark:text-slate-200 px-4 py-2 rounded-lg font-semibold hover:bg-slate-300 dark:hover:bg-slate-500 transition-colors duration-200"
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