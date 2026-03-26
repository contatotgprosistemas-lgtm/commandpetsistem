import { useState } from "react";
import { Tag, Plus, X, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useConversationTags, useConversaTags, useTagMutations } from "@/hooks/useConversationTags";
import { toast } from "sonner";

const TAG_COLORS = [
  "#3b82f6", "#22c55e", "#ef4444", "#eab308",
  "#a855f7", "#ec4899", "#f97316", "#6b7280",
];

interface ConversationTagManagerProps {
  conversaId: string;
}

export function ConversationTagManager({ conversaId }: ConversationTagManagerProps) {
  const { data: allTags } = useConversationTags();
  const { data: conversaTags } = useConversaTags();
  const { createTag, assignTag, removeTag, deleteTag } = useTagMutations();
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3b82f6");
  const [showCreate, setShowCreate] = useState(false);

  const currentTagIds = conversaTags
    ?.filter(ct => ct.conversa_id === conversaId)
    .map(ct => ct.tag_id) ?? [];

  const handleToggleTag = (tagId: string) => {
    if (currentTagIds.includes(tagId)) {
      removeTag.mutate({ conversaId, tagId });
    } else {
      assignTag.mutate({ conversaId, tagId });
    }
  };

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    createTag.mutate(
      { name: newTagName.trim(), color: newTagColor },
      {
        onSuccess: () => {
          setNewTagName("");
          setShowCreate(false);
          toast.success("Tag criada");
        },
      }
    );
  };

  const handleDeleteTag = (e: React.MouseEvent, tagId: string) => {
    e.stopPropagation();
    deleteTag.mutate(tagId, { onSuccess: () => toast.success("Tag excluída") });
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="h-9 w-9 rounded-full hover:bg-muted flex items-center justify-center text-muted-foreground transition-colors">
          <Tag className="h-[18px] w-[18px]" strokeWidth={1.5} />
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 p-2">
        <p className="text-xs font-semibold text-foreground px-2 py-1">Etiquetas</p>

        <div className="max-h-48 overflow-y-auto space-y-0.5">
          {allTags?.map(tag => (
            <button
              key={tag.id}
              onClick={() => handleToggleTag(tag.id)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-sm transition-colors group"
            >
              <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
              <span className="flex-1 text-left text-foreground truncate">{tag.name}</span>
              {currentTagIds.includes(tag.id) && (
                <Check className="h-3.5 w-3.5 text-primary shrink-0" />
              )}
              <button
                onClick={(e) => handleDeleteTag(e, tag.id)}
                className="h-5 w-5 rounded hover:bg-destructive/10 items-center justify-center text-muted-foreground hover:text-destructive hidden group-hover:flex shrink-0"
              >
                <X className="h-3 w-3" />
              </button>
            </button>
          ))}
          {!allTags?.length && (
            <p className="text-xs text-muted-foreground px-2 py-3 text-center">Nenhuma tag criada</p>
          )}
        </div>

        <div className="border-t border-border mt-1 pt-1">
          {showCreate ? (
            <div className="space-y-2 p-1">
              <Input
                value={newTagName}
                onChange={e => setNewTagName(e.target.value)}
                placeholder="Nome da tag"
                className="h-8 text-xs"
                onKeyDown={e => e.key === "Enter" && handleCreateTag()}
              />
              <div className="flex gap-1">
                {TAG_COLORS.map(c => (
                  <button
                    key={c}
                    onClick={() => setNewTagColor(c)}
                    className={`w-5 h-5 rounded-full border-2 transition-all ${newTagColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
              <div className="flex gap-1">
                <Button size="sm" className="h-7 text-xs flex-1" onClick={handleCreateTag} disabled={!newTagName.trim()}>
                  Criar
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => setShowCreate(false)}>
                  Cancelar
                </Button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md hover:bg-muted text-xs text-muted-foreground transition-colors"
            >
              <Plus className="h-3.5 w-3.5" />
              Criar nova tag
            </button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
