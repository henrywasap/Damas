import React from 'react';
import { X, BookOpen, Crown, Zap, ShieldCheck } from 'lucide-react';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
      <div className="relative w-full max-w-lg bg-stone-900 border border-stone-800 rounded-2xl p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-stone-400 hover:text-white bg-stone-800 rounded-lg transition cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-5 h-5 text-amber-400" />
          <h2 className="text-lg font-bold text-stone-100">Reglas Oficiales de Damas</h2>
        </div>

        <div className="space-y-4 text-xs text-stone-300 leading-relaxed">
          <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800">
            <h3 className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
              <Zap className="w-4 h-4 text-amber-400" />
              1. Movimiento Básico
            </h3>
            <p>
              Las piezas se desplazan siempre en <strong>diagonal</strong>, una casilla hacia adelante sobre las casillas oscuras vacías.
            </p>
          </div>

          <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800">
            <h3 className="font-bold text-amber-300 flex items-center gap-1.5 mb-1">
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              2. Capturas Opcionales y Libertad de Movimiento
            </h3>
            <p>
              Si una pieza rival está adyacente en diagonal y la casilla posterior está libre, <strong>puedes saltar sobre ella para capturarla</strong>. Sin embargo, <strong>la captura es opcional</strong>: tienes la libertad de comer o realizar un movimiento regular con cualquier otra pieza, logrando un juego más justo, estratégico y menos monótono.
            </p>
            <p className="mt-1 text-stone-400">
              <strong>Saltos encadenados opcionales:</strong> Si tras realizar un salto hay otro disponible, puedes continuar saltando o finalizar tu turno según te convenga.
            </p>
          </div>

          <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800">
            <h3 className="font-bold text-amber-300 flex items-center gap-1.5 mb-1.5">
              <Crown className="w-4 h-4 text-amber-400" />
              3. Reglas de la Dama Coronada (Dama Voladora)
            </h3>
            <p className="mb-2">
              Cuando un peón llega a la última fila contraria, se convierte en <strong>Dama</strong> (coronada con una corona dorada) y adquiere poderes especiales:
            </p>
            <ul className="space-y-1.5 text-stone-300 pl-1">
              <li>
                <strong className="text-amber-400">Movimiento a larga distancia:</strong> La dama puede moverse cualquier número de casillas vacías en diagonal, tanto hacia adelante como hacia atrás.
              </li>
              <li>
                <strong className="text-amber-400">Captura a distancia:</strong> Puede saltar sobre una pieza enemiga situada a cualquier distancia en la misma diagonal (siempre que haya una o más casillas libres después de la pieza capturada) y aterrizar en cualquier casilla libre posterior.
              </li>
              <li>
                <strong className="text-amber-400">Captura múltiple:</strong> Puede cambiar de dirección en ángulo recto (90°) durante una secuencia de capturas si hay más piezas enemigas para comer.
              </li>
            </ul>
          </div>

          <div className="p-3 bg-stone-950/70 rounded-xl border border-stone-800">
            <h3 className="font-bold text-amber-300 mb-1">
              4. Final de la Partida y Victoria
            </h3>
            <ul className="list-disc list-inside space-y-1 text-stone-300">
              <li><strong>Regla de 1 pieza:</strong> Ganas automáticamente cuando tu rival queda reducido a <strong>solo 1 pieza</strong> o si eliminas todas sus piezas.</li>
              <li>Ganas si solo queda <strong>1 pieza en total</strong> en el tablero.</li>
              <li>Ganas si tu rival no tiene ningún movimiento legal en su turno (bloqueo total).</li>
              <li>Empate (Tablas) si ambos jugadores quedan con 1 sola pieza cada uno o por acuerdo mutuo.</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 pt-4 border-t border-stone-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold rounded-xl text-xs transition cursor-pointer"
          >
            Entendido, ¡a jugar!
          </button>
        </div>
      </div>
    </div>
  );
};
