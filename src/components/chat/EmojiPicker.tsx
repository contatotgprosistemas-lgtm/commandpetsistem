import { useState, useMemo } from "react";
import { X, Search } from "lucide-react";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Rostos",
    emojis: ["😀","😃","😄","😁","😆","😅","🤣","😂","🙂","😉","😊","😇","🥰","😍","🤩","😘","😗","😙","😚","😋","😛","😜","🤪","😝","🤑","🤗","🤭","🤫","🤔","😐","😑","😶","😏","😒","🙄","😬","🤥","😌","😔","😪","🤤","😴","😷","🤒","🤕","🤢","🤮","🥵","🥶","😵","🤯","🤠","🥳","😎","🤓","🧐","😕","😟","🙁","😮","😯","😲","😳","🥺","😦","😧","😨","😰","😥","😢","😭","😱","😖","😣","😞","😓","😩","😫","🥱","😤","😡","😠","🤬","😈","👿","💀","☠️","💩","🤡","👹","👺","👻","👽","👾","🤖"],
  },
  {
    label: "Mãos",
    emojis: ["👋","🤚","🖐️","✋","🖖","👌","🤌","🤏","✌️","🤞","🤟","🤘","🤙","👈","👉","👆","🖕","👇","☝️","👍","👎","✊","👊","🤛","🤜","👏","🙌","👐","🤲","🤝","🙏","✍️","💅","🤳","💪"],
  },
  {
    label: "Animais",
    emojis: ["🐶","🐱","🐭","🐹","🐰","🦊","🐻","🐼","🐨","🐯","🦁","🐮","🐷","🐸","🐵","🙈","🙉","🙊","🐒","🐔","🐧","🐦","🐤","🐣","🐥","🦆","🦅","🦉","🦇","🐺","🐗","🐴","🦄","🐝","🐛","🦋","🐌","🐞","🐜","🪲","🐢","🐍","🦎","🦖","🦕","🐙","🐠","🐟","🐬","🐳","🐋","🦈","🐊"],
  },
  {
    label: "Objetos",
    emojis: ["❤️","🧡","💛","💚","💙","💜","🖤","🤍","🤎","💔","❣️","💕","💞","💓","💗","💖","💘","💝","💟","⭐","🌟","✨","💫","🔥","💥","🎉","🎊","🎈","🎁","🏆","🥇","🎯","💰","💳","📱","💻","📷","🎤","🎧","🎵","🎶","📝","📋","📎","✏️","🔑","🔒"],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search) return EMOJI_CATEGORIES;
    const q = search.toLowerCase();
    return EMOJI_CATEGORIES.map((cat) => ({
      ...cat,
      emojis: cat.emojis.filter(() => true), // emojis don't have text labels for search, show all
    })).filter((cat) => cat.emojis.length > 0);
  }, [search]);

  return (
    <div className="absolute bottom-12 left-0 w-[320px] bg-popover border border-border rounded-xl shadow-lg z-50 animate-in fade-in slide-in-from-bottom-2 duration-150">
      <div className="flex items-center justify-between p-2 border-b border-border">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar emoji..."
            className="w-full h-8 pl-7 pr-2 text-xs bg-muted rounded-md border-0 outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        <button onClick={onClose} className="ml-2 h-7 w-7 rounded-md hover:bg-muted flex items-center justify-center text-muted-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="max-h-[280px] overflow-y-auto p-2">
        {filtered.map((cat) => (
          <div key={cat.label} className="mb-2">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1 mb-1">{cat.label}</p>
            <div className="grid grid-cols-8 gap-0.5">
              {cat.emojis.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => onSelect(emoji)}
                  className="h-8 w-8 flex items-center justify-center rounded-md hover:bg-muted text-lg transition-colors"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
