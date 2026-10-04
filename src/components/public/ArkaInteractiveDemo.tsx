import React, { useState } from 'react';
import { 
  ShoppingBag, 
  Plus, 
  Minus, 
  Wifi, 
  WifiOff, 
  Receipt, 
  CheckCircle2, 
  RotateCcw,
  Boxes
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductItem {
  id: string;
  name: string;
  category: string;
  price: number;
  stock: number;
}

const DEFAULT_PRODUCTS: ProductItem[] = [
  { id: 'p1', name: 'Robe Bazin Riche Brodé', category: 'Mode', price: 25000, stock: 14 },
  { id: 'p2', name: 'Chaussures Cuir Italien', category: 'Chaussures', price: 18000, stock: 8 },
  { id: 'p3', name: 'Pack Huile d\'Argan Pure (3x)', category: 'Cosmétique', price: 12500, stock: 22 },
  { id: 'p4', name: 'Montre Chronographe Acier', category: 'Accessoires', price: 35000, stock: 5 },
  { id: 'p5', name: 'Sac à Main Cuir Artisanal', category: 'Maroquinerie', price: 15000, stock: 11 },
];

export const ArkaInteractiveDemo: React.FC = () => {
  const [products, setProducts] = useState<ProductItem[]>(DEFAULT_PRODUCTS);
  const [cart, setCart] = useState<Array<{ product: ProductItem; quantity: number }>>([
    { product: DEFAULT_PRODUCTS[0], quantity: 1 }
  ]);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<'mtn' | 'orange' | 'especes'>('mtn');
  const [dailySalesTotal, setDailySalesTotal] = useState(125000);
  const [dailySalesCount, setDailySalesCount] = useState(18);
  const [lastReceipt, setLastReceipt] = useState<{
    number: string;
    items: Array<{ name: string; qty: number; price: number }>;
    total: number;
    method: string;
    timestamp: string;
    offline: boolean;
  } | null>(null);

  const [isProcessing, setIsProcessing] = useState(false);

  // Cart calculations
  const totalAmount = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);

  const addToCart = (product: ProductItem) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id);
      if (existing) {
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId) {
            const newQty = item.quantity + delta;
            return newQty > 0 ? { ...item, quantity: newQty } : null;
          }
          return item;
        })
        .filter(Boolean) as Array<{ product: ProductItem; quantity: number }>
    );
  };

  const clearCart = () => {
    setCart([]);
  };

  const handleCheckout = () => {
    if (cart.length === 0) return;

    setIsProcessing(true);

    setTimeout(() => {
      // Decrement stock
      setProducts((prev) =>
        prev.map((p) => {
          const inCart = cart.find((item) => item.product.id === p.id);
          if (inCart) {
            return { ...p, stock: Math.max(0, p.stock - inCart.quantity) };
          }
          return p;
        })
      );

      // Increment daily revenue
      setDailySalesTotal((prev) => prev + totalAmount);
      setDailySalesCount((prev) => prev + 1);

      // Generate receipt
      const receiptData = {
        number: `TK-${Math.floor(100000 + Math.random() * 900000)}`,
        items: cart.map((c) => ({ name: c.product.name, qty: c.quantity, price: c.product.price })),
        total: totalAmount,
        method: paymentMethod === 'mtn' ? 'MTN Mobile Money' : paymentMethod === 'orange' ? 'Orange Money' : 'Espèces (Cash)',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        offline: isOfflineMode,
      };

      setLastReceipt(receiptData);
      setCart([]);
      setIsProcessing(false);
    }, 450);
  };

  return (
    <div className="bg-rk-surface rounded-2xl border border-rk-line p-6 shadow-2xl relative overflow-hidden flex flex-col space-y-5">
      
      {/* Top Cockpit Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-rk-line gap-3">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold text-xs font-mono">
            POS
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-serif font-bold text-white text-sm">Simulateur Caisse ARKA-PME</span>
              <span className="text-xs font-mono bg-emerald-500/10 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/20">
                Interactif
              </span>
            </div>
            <div className="text-xs font-mono text-rk-muted font-light">
              Testez une vente réelle en caisse tactile
            </div>
          </div>
        </div>

        {/* Offline Toggle Simulation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsOfflineMode(!isOfflineMode)}
            className={`px-3 py-1.5 rounded-full text-xs font-mono flex items-center gap-2 transition-all cursor-pointer ${
              isOfflineMode
                ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
            }`}
            title="Simuler une coupure de connexion internet"
          >
            {isOfflineMode ? <WifiOff className="w-3.5 h-3.5 text-amber-400" /> : <Wifi className="w-3.5 h-3.5 text-emerald-400" />}
            <span>{isOfflineMode ? 'Mode Hors-Ligne (Actif)' : 'En Ligne (Synchronisé)'}</span>
          </button>
        </div>
      </div>

      {/* Offline Alert if enabled */}
      <AnimatePresence>
        {isOfflineMode && (
          <motion.div 
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-xs flex items-center gap-2 overflow-hidden"
          >
            <WifiOff className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>
              <strong>Coupure réseau simulée :</strong> ARKA-PME continue d'encaisser. Les tickets se synchroniseront automatiquement dès reconnexion.
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* KPI Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="bg-rk-base p-3.5 rounded-xl border border-rk-line-soft">
          <div className="text-xs uppercase font-mono text-rk-muted">Total Encaissé Aujourd'hui</div>
          <div className="font-serif text-lg font-bold text-emerald-400 mt-1">
            {dailySalesTotal.toLocaleString()} FCFA
          </div>
          <div className="text-xs text-rk-muted mt-0.5">
            {dailySalesCount} ventes validées
          </div>
        </div>

        <div className="bg-rk-base p-3.5 rounded-xl border border-rk-line-soft">
          <div className="text-xs uppercase font-mono text-rk-muted">Inventaire Rapide</div>
          <div className="font-serif text-lg font-bold text-white mt-1">
            12 minutes
          </div>
          <div className="text-xs text-emerald-400 mt-0.5">
            Zéro écart de caisse
          </div>
        </div>

        <div className="bg-rk-base p-3.5 rounded-xl border border-rk-line-soft col-span-2 sm:col-span-1">
          <div className="text-xs uppercase font-mono text-rk-muted">Articles en Stock</div>
          <div className="font-serif text-lg font-bold text-white mt-1">
            {products.reduce((acc, p) => acc + p.stock, 0)} pièces
          </div>
          <div className="text-xs text-rk-muted mt-0.5">
            Décompte instantané
          </div>
        </div>
      </div>

      {/* Main Interactive Workspace: Catalog + Cart */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        
        {/* Left: Quick Product Buttons */}
        <div className="md:col-span-7 space-y-3">
          <div className="flex items-center justify-between text-xs font-mono text-rk-muted">
            <span>Catalogue articles (Cliquer pour ajouter)</span>
            <span className="text-emerald-400">FCFA</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={product.stock <= 0}
                className="text-left p-3 rounded-xl bg-rk-base hover:bg-white/[0.04] border border-rk-line-soft hover:border-emerald-500/30 transition-all flex flex-col justify-between group cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <div>
                  <div className="flex items-center justify-between text-xs font-mono text-rk-muted mb-1">
                    <span>{product.category}</span>
                    <span className={product.stock < 10 ? 'text-amber-400' : 'text-rk-muted'}>
                      Stock : {product.stock}
                    </span>
                  </div>
                  <div className="font-medium text-white text-xs group-hover:text-emerald-300 transition-colors">
                    {product.name}
                  </div>
                </div>

                <div className="flex items-center justify-between mt-2 pt-2 border-t border-rk-line-soft">
                  <span className="font-mono font-bold text-emerald-400 text-xs">
                    {product.price.toLocaleString()} F
                  </span>
                  <span className="w-5 h-5 rounded-md bg-emerald-500/10 group-hover:bg-emerald-500 group-hover:text-slate-950 text-emerald-400 flex items-center justify-center transition-colors text-xs">
                    <Plus className="w-3 h-3" />
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Right: Cash Register & Payment Ticket */}
        <div className="md:col-span-5 bg-rk-base border border-rk-line-soft rounded-xl p-4 flex flex-col justify-between space-y-4">
          
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-rk-line-soft">
              <div className="flex items-center gap-2 text-xs font-semibold text-white">
                <ShoppingBag className="w-4 h-4 text-emerald-400" />
                <span>Panier de vente</span>
              </div>
              {cart.length > 0 && (
                <button
                  onClick={clearCart}
                  className="text-xs text-rk-muted hover:text-rose-400 transition-colors cursor-pointer"
                >
                  Vider
                </button>
              )}
            </div>

            {/* Cart Items List */}
            <div className="py-2 space-y-2 max-h-48 overflow-y-auto pr-1">
              {cart.length === 0 ? (
                <div className="py-8 text-center text-xs text-rk-muted font-mono">
                  Panier vide. Cliquez sur un article pour l'ajouter.
                </div>
              ) : (
                cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="flex items-center justify-between text-xs py-1.5 border-b border-rk-line-soft"
                  >
                    <div className="truncate pr-2">
                      <div className="text-white font-medium truncate">{item.product.name}</div>
                      <div className="text-xs text-rk-muted font-mono">
                        {item.product.price.toLocaleString()} F × {item.quantity}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => updateQuantity(item.product.id, -1)}
                        className="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.1] text-rk-text-secondary flex items-center justify-center cursor-pointer"
                      >
                        <Minus className="w-3 h-3" />
                      </button>
                      <span className="font-mono text-xs w-4 text-center text-white">{item.quantity}</span>
                      <button
                        onClick={() => updateQuantity(item.product.id, 1)}
                        className="w-5 h-5 rounded bg-white/[0.06] hover:bg-white/[0.1] text-rk-text-secondary flex items-center justify-center cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Payment Method Selector */}
          <div className="space-y-2 pt-2 border-t border-rk-line-soft">
            <div className="text-xs font-mono text-rk-muted">Mode d'encaissement :</div>
            <div className="grid grid-cols-3 gap-1.5 text-xs font-mono">
              <button
                type="button"
                onClick={() => setPaymentMethod('mtn')}
                className={`py-1.5 px-2 rounded-lg text-center border transition-all cursor-pointer text-xs ${
                  paymentMethod === 'mtn'
                    ? 'bg-amber-500/15 text-amber-300 border-amber-500/40 font-bold'
                    : 'bg-white/[0.04] text-rk-muted border-transparent hover:text-white'
                }`}
              >
                MTN MoMo
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('orange')}
                className={`py-1.5 px-2 rounded-lg text-center border transition-all cursor-pointer text-xs ${
                  paymentMethod === 'orange'
                    ? 'bg-orange-500/15 text-orange-300 border-orange-500/40 font-bold'
                    : 'bg-white/[0.04] text-rk-muted border-transparent hover:text-white'
                }`}
              >
                Orange M.
              </button>

              <button
                type="button"
                onClick={() => setPaymentMethod('especes')}
                className={`py-1.5 px-2 rounded-lg text-center border transition-all cursor-pointer text-xs ${
                  paymentMethod === 'especes'
                    ? 'bg-blue-500/15 text-blue-300 border-blue-500/40 font-bold'
                    : 'bg-white/[0.04] text-rk-muted border-transparent hover:text-white'
                }`}
              >
                Espèces
              </button>
            </div>
          </div>

          {/* Total & Validate Button */}
          <div className="space-y-2 pt-2 border-t border-rk-line-soft">
            <div className="flex items-center justify-between text-xs">
              <span className="text-rk-muted font-mono">Net à payer :</span>
              <span className="font-serif text-lg font-bold text-emerald-400">
                {totalAmount.toLocaleString()} FCFA
              </span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0 || isProcessing}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-white/[0.04] disabled:text-rk-muted text-slate-950 font-semibold py-2.5 rounded-lg text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
            >
              {isProcessing ? (
                <span>Validation en cours...</span>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Encaisser & Imprimer</span>
                </>
              )}
            </button>
          </div>

        </div>

      </div>

      {/* Generated Thermal Receipt Preview */}
      <AnimatePresence>
        {lastReceipt && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="p-4 rounded-xl bg-rk-base border border-emerald-500/30 space-y-3"
          >
            <div className="flex items-center justify-between pb-2 border-b border-rk-line-soft">
              <div className="flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                <span className="font-serif font-bold text-white text-xs">
                  Ticket de Caisse ARKA-PME #{lastReceipt.number}
                </span>
              </div>
              <span className="text-xs font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                Validé ({lastReceipt.timestamp})
              </span>
            </div>

            <div className="font-mono text-xs text-rk-text-secondary space-y-1">
              <div className="flex justify-between text-rk-muted">
                <span>Dépôt Central Yaoundé</span>
                <span>{lastReceipt.method}</span>
              </div>
              <div className="divide-y divide-rk-line-soft pt-1">
                {lastReceipt.items.map((item, i) => (
                  <div key={i} className="flex justify-between py-1 text-rk-text">
                    <span>{item.qty}x {item.name}</span>
                    <span>{(item.qty * item.price).toLocaleString()} FCFA</span>
                  </div>
                ))}
              </div>
              <div className="flex justify-between pt-2 border-t border-rk-line-soft font-bold text-white text-xs">
                <span>TOTAL ENCAISSÉ :</span>
                <span className="text-emerald-400">{lastReceipt.total.toLocaleString()} FCFA</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-rk-muted font-mono">
                Stock & caisse synchronisés avec le tableau de bord
              </span>
              <button
                onClick={() => setLastReceipt(null)}
                className="text-xs text-rk-muted hover:text-white underline cursor-pointer"
              >
                Fermer
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
};
