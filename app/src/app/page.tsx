"use client";
import { useState, useEffect } from "react";
import {
  Connection,
  PublicKey,
  clusterApiUrl,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import * as anchor from "@project-serum/anchor";
import IDL from "./idl.json";

const PROGRAM_ID = new PublicKey(
  "DGmJsbjsife1p3QoueUruomvJXLaYXMwqEFgE4bV4xrg"
);

export default function Home() {
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [counter, setCounter] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [provider, setProvider] = useState<any>(null);
  const [counterAccount, setCounterAccount] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const connection = new Connection(clusterApiUrl("devnet"), "confirmed");

  const getProvider = () => {
    try {
      const { solana } = window as any;
      if (!solana || !solana.isPhantom) {
        console.log("Phantom Wallet tidak terdeteksi");
        return null;
      }
      const provider = new anchor.AnchorProvider(
        connection,
        solana,
        { preflightCommitment: "confirmed" }
      );
      return provider;
    } catch (error) {
      console.error("Error saat membuat provider:", error);
      return null;
    }
  };

  const checkWallet = async () => {
    const { solana } = window as any;
    if (solana && solana.isPhantom) {
      try {
        const response = await solana.connect({ onlyIfTrusted: true });
        setWalletAddress(response.publicKey.toString());
        setIsConnected(true);
        const newProvider = getProvider();
        setProvider(newProvider);
        if (newProvider) await setupCounter(newProvider);
      } catch (error) {
        console.log("Wallet belum terhubung:", error);
      }
    }
  };

  const connectWallet = async () => {
    try {
      const { solana } = window as any;
      if (!solana) throw new Error("Phantom Wallet tidak ditemukan");
      const response = await solana.connect();
      setWalletAddress(response.publicKey.toString());
      setIsConnected(true);
      const newProvider = getProvider();
      setProvider(newProvider);
      if (newProvider) await setupCounter(newProvider);
    } catch (error: any) {
      setError(`Gagal menghubungkan wallet: ${error.message}`);
    }
  };

  const disconnectWallet = () => {
    try {
      const { solana } = window as any;
      if (solana) solana.disconnect();
      setWalletAddress(null);
      setIsConnected(false);
      setProvider(null);
      setCounterAccount(null);
      setError(null);
      setIsInitialized(false);
    } catch (error: any) {
      setError(`Error saat memutuskan: ${error.message}`);
    }
  };

  const getCounterPDA = async () => {
    const [counterPDA] = await PublicKey.findProgramAddress(
      [Buffer.from("counter")],
      PROGRAM_ID
    );
    return counterPDA;
  };

  const setupCounter = async (currentProvider: any) => {
    if (!currentProvider) {
      setError("Provider tidak tersedia");
      return;
    }
    try {
      const counterPDA = await getCounterPDA();
      setCounterAccount(counterPDA);
      await fetchCounter(currentProvider, counterPDA);
      setIsInitialized(true);
    } catch (error: any) {
      setError("Counter belum diinisialisasi. Silakan klik 'Inisialisasi Counter'.");
    }
  };

  const initializeCounter = async () => {
    if (!provider) {
      setError("Provider belum diinisialisasi");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      console.log("IDL yang digunakan:", IDL);
      const program = new anchor.Program(IDL as any, PROGRAM_ID, provider);
      console.log("Program berhasil dibuat");
      const counterPDA = await getCounterPDA();
      console.log("Counter PDA:", counterPDA.toString());
      const tx = await program.methods
        .initialize()
        .accounts({
          counter: counterPDA,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
      console.log("Transaksi dikirim. Signature:", tx);
      const confirmation = await connection.confirmTransaction(tx, "confirmed");
      console.log("Konfirmasi transaksi:", confirmation);
      setCounterAccount(counterPDA);
      await new Promise(resolve => setTimeout(resolve, 5000));
      await fetchCounter(provider, counterPDA);
      setIsInitialized(true);
    } catch (error: any) {
      console.error("Error saat inisialisasi:", error);
      if (error.logs) console.error("Logs:", error.logs);
      setError(`Gagal inisialisasi: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const fetchCounter = async (currentProvider: any, counterPDA: PublicKey) => {
    if (!currentProvider) return;
    try {
      const program = new anchor.Program(IDL as any, PROGRAM_ID, currentProvider);
      const counterData = await program.account.counter.fetch(counterPDA);
      setCounter(counterData.count.toNumber());
      setError(null);
    } catch (error: any) {
      console.error("Gagal fetch counter:", error);
      setError("Counter belum diinisialisasi. Silakan klik 'Inisialisasi Counter'.");
      setCounter(0);
    }
  };

  const increaseCounter = async () => {
    if (!provider || !counterAccount) {
      setError("Provider atau counter belum diinisialisasi");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const program = new anchor.Program(IDL as any, PROGRAM_ID, provider);
      const payment = new anchor.BN(0.01 * LAMPORTS_PER_SOL);
      const tx = await program.methods
        .increment(payment)
        .accounts({
          counter: counterAccount,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
      await connection.confirmTransaction(tx, "confirmed");
      await new Promise(resolve => setTimeout(resolve, 5000));
      await fetchCounter(provider, counterAccount);
    } catch (error: any) {
      setError(`Gagal menambah counter: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const decreaseCounter = async () => {
    if (!provider || !counterAccount) {
      setError("Provider atau counter belum diinisialisasi");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const program = new anchor.Program(IDL as any, PROGRAM_ID, provider);
      const payment = new anchor.BN(0.01 * LAMPORTS_PER_SOL);
      const tx = await program.methods
        .decrement(payment)
        .accounts({
          counter: counterAccount,
          user: provider.wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc({ commitment: "confirmed" });
      await connection.confirmTransaction(tx, "confirmed");
      await new Promise(resolve => setTimeout(resolve, 5000));
      await fetchCounter(provider, counterAccount);
    } catch (error: any) {
      setError(`Gagal mengurangi counter: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkWallet();
  }, []);

  return (
    <main className="min-h-screen bg-white text-black">
      {/* Header */}
      <header className="w-full px-6 py-4 border-b border-gray-800 bg-black flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
      
          <h2 className="text-xl font-bold text-white">
            Solana Counter
          </h2>
        </div>
        
        <div>
          {isConnected ? (
            <button
              onClick={disconnectWallet}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 border border-gray-700 rounded-lg text-white font-medium text-sm transition-all"
              disabled={loading}
            >
              {walletAddress ? `${walletAddress.slice(0, 4)}...${walletAddress.slice(-4)}` : "Disconnect"}
            </button>
          ) : (
            <button
              onClick={connectWallet}
              className="px-4 py-2 bg-[#7B2CBF] hover:bg-[#6A24A8] rounded-lg text-white font-medium text-sm transition-all"
              disabled={loading}
            >
              Connect Wallet
            </button>
          )}
        </div>
      </header>
      
      {/* Main content */}
      <div className="container mx-auto px-4 py-12 flex flex-col items-center">
        {/* Status card */}
        <div className="w-full max-w-lg mb-12 rounded-2xl bg-white-800 border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-[#7B2CBF]' : 'bg-red-400'}`}></div>
                <span className="text-sm font-medium text-black">
                  {isConnected ? 'Connected to Solana Devnet' : 'Not Connected'}
                </span>
              </div>
              {counterAccount && (
                <div className="text-xs text-white bg-[#7B2CBF] px-2 py-1 rounded-md">
                  {counterAccount.toString().slice(0, 6)}...{counterAccount.toString().slice(-4)}
                </div>
              )}
            </div>
          </div>
          
          <div className="p-6">
            <div className="flex items-center mb-4">
              <div className="flex-1 h-px bg-gray-700"></div>
              <span className="px-4 text-xs uppercase tracking-wider text-black font-medium">Transaction Info</span>
              <div className="flex-1 h-px bg-gray-700"></div>
            </div>
            
            <div className="flex justify-between mb-2">
              <span className="text-sm text-black">Network</span>
              <span className="text-sm font-medium flex items-center text-black">
                <span className="w-2 h-2 bg-[#7B2CBF] rounded-full mr-2"></span>
                Devnet
              </span>
            </div>
            
            <div className="flex justify-between">
              <span className="text-sm text-black">Cost Per Transaction</span>
              <span className="text-sm font-medium">0.01 SOL</span>
            </div>
          </div>
        </div>
        
        {/* Counter display */}
<div className="w-full max-w-md rounded-3xl bg-white border border-gray-700 p-10 mb-8">
  <div className="flex flex-col items-center">
    <h3 className="text-xl font-medium mb-6 text-black">Current Counter Value</h3>
    
    <div className="flex items-center space-x-6 mb-8">
      <button
        onClick={decreaseCounter}
        className="w-14 h-14 flex items-center justify-center rounded-full bg-gray-700 hover:bg-gray-600 text-white text-3xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isConnected || !counterAccount || loading} // Tambah loading di sini
      >
        -
      </button>
      
      <div className="text-6xl font-bold text-[#7B2CBF]">
        {counter}
      </div>
      
      <button
        onClick={increaseCounter}
        className="w-14 h-14 flex items-center justify-center rounded-full bg-[#7B2CBF] hover:bg-[#6A24A8] text-white text-3xl font-bold shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={!isConnected || !counterAccount || loading} 
      >
        +
      </button>
    </div>
    
    {!isInitialized && (
      <button
        onClick={initializeCounter}
        className="w-full py-3 bg-[#7B2CBF] hover:bg-[#6A24A8] rounded-xl text-white font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        disabled={loading || !isConnected}
      >
        Initialize Counter
      </button>
    )}
  </div>
</div>

        {/* Status messages */}
        {loading && (
          <div className="w-full max-w-md bg-[#7B2CBF] bg-opacity-20 border border-[#6A24A8] rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2">
              <div className="animate-spin w-5 h-5 border-2 border-white border-t-transparent rounded-full"></div>
              <p className="text-white text-sm">
                Processing transaction... Please approve in your wallet.
              </p>
            </div>
          </div>
        )}
        
        {error && (
          <div className="w-full max-w-md bg-red-900 bg-opacity-20 border border-red-800 rounded-xl p-4">
            <p className="text-red-300 text-sm">
              {error}
            </p>
          </div>
        )}
      </div>
      
      {/* Footer */}
      <footer className="w-full py-6 px-4 border-t border-gray-800 mt-auto">
        <div className="container mx-auto flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-gray-500 mb-4 md:mb-0">
            Built with Solana, Anchor & Next.js
          </p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Running on</span>
            <span className="text-xs font-medium px-2 py-1 bg-[#7B2CBF] bg-opacity-30 border border-[#6A24A8] rounded-md text-white">
              Solana Devnet
            </span>
          </div>
        </div>
      </footer>
    </main>
  );
}