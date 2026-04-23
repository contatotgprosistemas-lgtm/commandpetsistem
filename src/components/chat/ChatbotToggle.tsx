import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Bot, BotOff } from "lucide-react";
import { toast } from "sonner";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ChatbotToggleProps {
  conversaId: string;
  enabled: boolean;
}

export function ChatbotToggle({ conversaId, enabled }: ChatbotToggleProps) {
  const queryClient = useQueryClient();

  const toggle = useMutation({
    mutationFn: async (next: boolean) => {
      const { error } = await supabase
        .from("conversas")
        .update({ chatbot_enabled: next })
        .eq("id", conversaId);
      if (error) throw error;
      // If turning off, also clear any active session so the flow stops
      if (!next) {
        await supabase.from("chatbot_sessions").delete().eq("conversa_id", conversaId);
      }
      return next;
    },
    onSuccess: (next) => {
      queryClient.invalidateQueries({ queryKey: ["conversas"] });
      toast.success(next ? "Chatbot ativado nesta conversa" : "Chatbot desativado nesta conversa");
    },
    onError: () => toast.error("Não foi possível atualizar o chatbot"),
  });

  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            onClick={() => toggle.mutate(!enabled)}
            disabled={toggle.isPending}
            className={`h-9 w-9 rounded-full flex items-center justify-center transition-colors ${
              enabled
                ? "text-primary hover:bg-primary/10"
                : "text-muted-foreground hover:bg-muted"
            }`}
            aria-label={enabled ? "Desligar chatbot" : "Ligar chatbot"}
          >
            {enabled ? (
              <Bot className="h-[18px] w-[18px]" strokeWidth={1.5} />
            ) : (
              <BotOff className="h-[18px] w-[18px]" strokeWidth={1.5} />
            )}
          </button>
        </TooltipTrigger>
        <TooltipContent side="bottom">
          {enabled ? "Chatbot ativo — clique para desligar" : "Chatbot desligado — clique para ligar"}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
