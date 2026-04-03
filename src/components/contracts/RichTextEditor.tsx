import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Image from "@tiptap/extension-image";
import { TextStyle } from "@tiptap/extension-text-style";
import FontFamily from "@tiptap/extension-font-family";
import FontSize from "@tiptap/extension-font-size";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, ImagePlus, Tags } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface Props {
  content: string;
  onChange: (html: string) => void;
  onLogoUpload?: (file: File) => Promise<string | null>;
}

const FONT_SIZES = ["12px", "14px", "16px", "18px", "20px", "24px", "28px", "32px"];
const FONT_FAMILIES = [
  { label: "Padrão", value: "Inter, sans-serif" },
  { label: "Serif", value: "Georgia, serif" },
  { label: "Mono", value: "monospace" },
  { label: "Arial", value: "Arial, sans-serif" },
  { label: "Times", value: "'Times New Roman', serif" },
];

const PLACEHOLDERS = [
  { group: "Cliente", items: [
    { label: "Nome do cliente", value: "{{cliente_nome}}" },
    { label: "CPF do cliente", value: "{{cliente_cpf}}" },
    { label: "E-mail do cliente", value: "{{cliente_email}}" },
    { label: "Endereço do cliente", value: "{{cliente_endereco}}" },
  ]},
  { group: "Pet", items: [
    { label: "Nome do pet", value: "{{pet_nome}}" },
    { label: "Raça", value: "{{pet_raca}}" },
    { label: "Sexo", value: "{{pet_sexo}}" },
    { label: "Cor", value: "{{pet_cor}}" },
    { label: "Castrado", value: "{{pet_castrado}}" },
    { label: "Pets do mesmo tutor", value: "{{pets_mesmo_tutor}}" },
  ]},
  { group: "Serviços / Planos", items: [
    { label: "Serviços", value: "{{servicos}}" },
    { label: "Plano", value: "{{plano}}" },
    { label: "Pacote", value: "{{pacote}}" },
  ]},
  { group: "Valores / Datas", items: [
    { label: "Data da reserva", value: "{{data_reserva}}" },
    { label: "Valor do plano", value: "{{valor_plano}}" },
    { label: "Valor do serviço", value: "{{valor_servico}}" },
    { label: "Valor do pacote", value: "{{valor_pacote}}" },
    { label: "Data atual", value: "{{data_atual}}" },
  ]},
];

export function RichTextEditor({ content, onChange, onLogoUpload }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [placeholderOpen, setPlaceholderOpen] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      TextStyle,
      FontFamily,
      FontSize,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ inline: false, allowBase64: true }),
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  useEffect(() => {
    if (editor && content !== editor.getHTML()) {
      editor.commands.setContent(content);
    }
  }, [content]);

  if (!editor) return null;

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !onLogoUpload) return;
    const url = await onLogoUpload(file);
    if (url && editor) {
      editor.chain().focus().setImage({ src: url }).run();
    }
    e.target.value = "";
  }

  function insertPlaceholder(value: string) {
    if (!editor) return;
    editor.chain().focus().insertContent(value).run();
    setPlaceholderOpen(false);
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex flex-wrap items-center gap-1 p-2 border-b bg-muted/30">
        <Select
          value={editor.getAttributes("textStyle").fontFamily || "Inter, sans-serif"}
          onValueChange={(v) => editor.chain().focus().setFontFamily(v).run()}
        >
          <SelectTrigger className="h-7 w-28 text-xs">
            <SelectValue placeholder="Fonte" />
          </SelectTrigger>
          <SelectContent>
            {FONT_FAMILIES.map((f) => (
              <SelectItem key={f.value} value={f.value} style={{ fontFamily: f.value }}>
                {f.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={editor.getAttributes("textStyle").fontSize || "14px"}
          onValueChange={(v) => editor.chain().focus().setFontSize(v).run()}
        >
          <SelectTrigger className="h-7 w-20 text-xs">
            <SelectValue placeholder="Tamanho" />
          </SelectTrigger>
          <SelectContent>
            {FONT_SIZES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace("px", "")}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          type="button"
          variant={editor.isActive("bold") ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("italic") ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive("underline") ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          <UnderlineIcon className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          type="button"
          variant={editor.isActive({ textAlign: "left" }) ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().setTextAlign("left").run()}
        >
          <AlignLeft className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive({ textAlign: "center" }) ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().setTextAlign("center").run()}
        >
          <AlignCenter className="h-3.5 w-3.5" />
        </Button>
        <Button
          type="button"
          variant={editor.isActive({ textAlign: "right" }) ? "default" : "ghost"}
          size="icon"
          className="h-7 w-7"
          onClick={() => editor.chain().focus().setTextAlign("right").run()}
        >
          <AlignRight className="h-3.5 w-3.5" />
        </Button>

        <div className="w-px h-5 bg-border mx-1" />

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={() => fileInputRef.current?.click()}
          title="Inserir logo/imagem"
        >
          <ImagePlus className="h-3.5 w-3.5" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />

        <div className="w-px h-5 bg-border mx-1" />

        <Popover open={placeholderOpen} onOpenChange={setPlaceholderOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-7 text-xs gap-1 px-2"
              title="Inserir placeholder"
            >
              <Tags className="h-3.5 w-3.5" />
              Campos
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-0 max-h-72 overflow-y-auto" align="start">
            {PLACEHOLDERS.map((group) => (
              <div key={group.group}>
                <div className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted/50 sticky top-0">
                  {group.group}
                </div>
                {group.items.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className="w-full text-left px-3 py-1.5 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex items-center justify-between"
                    onClick={() => insertPlaceholder(item.value)}
                  >
                    <span>{item.label}</span>
                    <span className="text-xs text-muted-foreground font-mono">{item.value}</span>
                  </button>
                ))}
              </div>
            ))}
          </PopoverContent>
        </Popover>
      </div>
      <EditorContent editor={editor} className="prose prose-sm max-w-none p-4 min-h-[300px] focus:outline-none [&_.ProseMirror]:outline-none [&_.ProseMirror]:min-h-[280px] [&_.ProseMirror_img]:max-w-[200px] [&_.ProseMirror_img]:mx-auto [&_.ProseMirror_img]:block" />
    </div>
  );
}