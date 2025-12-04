
import React, { useState } from 'react';
import { CreditCard, CheckCircle, Shield, Lock, Zap, Smartphone } from 'lucide-react';
import { activateSubscription } from '../services/chatService';

interface SubscriptionScreenProps {
  onSuccess: () => void;
}

const SubscriptionScreen: React.FC<SubscriptionScreenProps> = ({ onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'upi' | 'card'>('upi');

  const handlePayment = () => {
    setIsProcessing(true);
    
    // Simulate payment gateway delay
    setTimeout(() => {
        activateSubscription();
        setIsProcessing(false);
        onSuccess();
    }, 2500);
  };

  return (
    <div className="flex flex-col h-full bg-[#0a0a0c] text-white overflow-hidden relative">
      {/* Background Decor */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-900/10 rounded-full blur-[80px] pointer-events-none"></div>
      <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-900/10 rounded-full blur-[80px] pointer-events-none"></div>

      <div className="flex-1 flex flex-col items-center justify-center p-6 relative z-10 overflow-y-auto">
        <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-800 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-emerald-900/30">
            <Lock className="text-white" size={32} />
        </div>

        <h2 className="text-2xl font-bold mb-2 tracking-tight">Premium Access</h2>
        <p className="text-slate-400 text-center text-sm mb-8 max-w-[280px]">
            To maintain secure server infrastructure and encrypted lines, a subscription is required.
        </p>

        {/* Pricing Card */}
        <div className="w-full max-w-sm bg-[#161618] border border-white/10 rounded-3xl p-6 mb-8 relative overflow-hidden group hover:border-emerald-500/30 transition-colors">
            <div className="absolute top-0 right-0 bg-emerald-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl uppercase tracking-wider">
                Most Popular
            </div>
            
            <div className="flex items-baseline gap-1 mb-6">
                <span className="text-4xl font-bold text-white">₹5.00</span>
                <span className="text-slate-500">/ month</span>
            </div>

            <div className="space-y-3 mb-8">
                <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-500"><CheckCircle size={14} /></div>
                    End-to-End Encryption
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-500"><CheckCircle size={14} /></div>
                    Unlimited Messages
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-500"><CheckCircle size={14} /></div>
                    Audio & Video Secure Calls
                </div>
                <div className="flex items-center gap-3 text-sm text-slate-300">
                    <div className="p-1 rounded-full bg-emerald-500/10 text-emerald-500"><CheckCircle size={14} /></div>
                    Priority Socket Connection
                </div>
            </div>

            {/* Payment Methods */}
            <div className="grid grid-cols-2 gap-3 mb-6">
                <button 
                    onClick={() => setPaymentMethod('upi')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all
                        ${paymentMethod === 'upi' 
                            ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400' 
                            : 'bg-black border-white/10 text-slate-500 hover:bg-white/5'}`}
                >
                    <Smartphone size={20} />
                    <span className="text-xs font-medium">UPI / QR</span>
                </button>
                <button 
                    onClick={() => setPaymentMethod('card')}
                    className={`p-3 rounded-xl border flex flex-col items-center gap-2 transition-all
                        ${paymentMethod === 'card' 
                            ? 'bg-emerald-900/20 border-emerald-500 text-emerald-400' 
                            : 'bg-black border-white/10 text-slate-500 hover:bg-white/5'}`}
                >
                    <CreditCard size={20} />
                    <span className="text-xs font-medium">Card</span>
                </button>
            </div>

            <button 
                onClick={handlePayment}
                disabled={isProcessing}
                className="w-full bg-white text-black font-bold py-3.5 rounded-xl hover:bg-gray-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
                {isProcessing ? (
                    <>Processing...</>
                ) : (
                    <>Pay ₹5.00 & Activate <Zap size={18} fill="currentColor" /></>
                )}
            </button>
        </div>

        <div className="flex items-center gap-4 text-[10px] text-slate-600 uppercase tracking-widest">
            <span className="flex items-center gap-1"><Shield size={10} /> SSL Secure</span>
            <span className="flex items-center gap-1"><Lock size={10} /> 256-Bit Encrypted</span>
        </div>
      </div>
      
      {/* Loading Overlay */}
      {isProcessing && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
            <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
            <div className="text-emerald-500 font-bold tracking-widest text-sm animate-pulse">VERIFYING PAYMENT...</div>
        </div>
      )}
    </div>
  );
};

export default SubscriptionScreen;
