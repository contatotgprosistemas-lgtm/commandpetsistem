import { useEffect, useState, useRef, useCallback } from "react";
import { PawPrint, Image as ImageIcon, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { supabase } from "@/integrations/supabase/client";
import { usePortalCliente } from "@/hooks/usePortalCliente";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MediaPost {
  id: string;
  media_url: string;
  media_type: string;
  caption: string | null;
  created_at: string;
  pet: { nome: string; especie: string; raca: string | null } | null;
}

export default function PortalFeedPage() {
  const { cliente, loading: clienteLoading } = usePortalCliente();
  const [posts, setPosts] = useState<MediaPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const PAGE_SIZE = 10;

  const fetchPosts = useCallback(async (pageNum: number) => {
    if (!cliente) return;
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from("pet_media")
      .select("id, media_url, media_type, caption, created_at, pet:pets(nome, especie, raca)")
      .eq("cliente_id", cliente.id)
      .order("created_at", { ascending: false })
      .range(from, to);

    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

    const newPosts = (data as any) ?? [];
    if (newPosts.length < PAGE_SIZE) setHasMore(false);
    setPosts((prev) => (pageNum === 0 ? newPosts : [...prev, ...newPosts]));
    setLoading(false);
  }, [cliente]);

  useEffect(() => {
    if (cliente) {
      setLoading(true);
      setPage(0);
      setHasMore(true);
      fetchPosts(0);
    }
  }, [cliente, fetchPosts]);

  const lastPostRef = useCallback(
    (node: HTMLDivElement | null) => {
      if (loading) return;
      if (observerRef.current) observerRef.current.disconnect();
      observerRef.current = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && hasMore) {
          const nextPage = page + 1;
          setPage(nextPage);
          fetchPosts(nextPage);
        }
      });
      if (node) observerRef.current.observe(node);
    },
    [loading, hasMore, page, fetchPosts]
  );

  if (clienteLoading || loading) {
    return (
      <div className="max-w-lg mx-auto space-y-6 pb-20">
        <h1 className="text-xl font-bold text-foreground">📸 Galeria</h1>
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl overflow-hidden bg-card">
            <Skeleton className="h-8 w-48 m-3" />
            <Skeleton className="w-full aspect-square" />
            <Skeleton className="h-4 w-32 m-3" />
          </div>
        ))}
      </div>
    );
  }

  if (posts.length === 0) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center justify-center py-20 text-center">
        <ImageIcon className="h-16 w-16 text-muted-foreground/30 mb-4" />
        <h2 className="text-lg font-semibold text-foreground">Nenhuma foto ainda</h2>
        <p className="text-sm text-muted-foreground mt-1">
          As fotos e vídeos do seu pet aparecerão aqui!
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-lg mx-auto space-y-5 pb-20 md:pb-6">
      <h1 className="text-xl font-bold text-foreground">📸 Galeria</h1>

      {posts.map((post, idx) => (
        <div
          key={post.id}
          ref={idx === posts.length - 1 ? lastPostRef : undefined}
          className="bg-card rounded-xl border border-border overflow-hidden shadow-sm"
        >
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3">
            <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
              <PawPrint className="h-4 w-4 text-primary" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground">
                {post.pet?.nome ?? "Pet"}
              </p>
              <p className="text-xs text-muted-foreground">
                {post.pet?.raca ?? post.pet?.especie}
              </p>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <span className="text-xs text-muted-foreground">
                {format(new Date(post.created_at), "dd MMM yyyy", { locale: ptBR })}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const response = await fetch(post.media_url);
                    const blob = await response.blob();
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement("a");
                    a.href = url;
                    const ext = post.media_type === "video" ? "mp4" : "jpg";
                    a.download = `${post.pet?.nome || "pet"}_${format(new Date(post.created_at), "yyyyMMdd")}.${ext}`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                    toast.success("Download iniciado!");
                  } catch {
                    toast.error("Erro ao baixar arquivo");
                  }
                }}
              >
                <Download className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          </div>

          {/* Media */}
          {post.media_type === "video" ? (
            <div className="relative bg-black">
              <video
                src={post.media_url}
                controls
                playsInline
                preload="metadata"
                className="w-full max-h-[500px] object-contain"
              />
            </div>
          ) : (
            <img
              src={post.media_url}
              alt={post.caption || post.pet?.nome || "Pet"}
              className="w-full object-cover max-h-[500px]"
              loading="lazy"
            />
          )}

          {/* Caption */}
          {post.caption && (
            <div className="px-4 py-3">
              <p className="text-sm text-foreground">
                <span className="font-semibold mr-1">{post.pet?.nome}</span>
                {post.caption}
              </p>
            </div>
          )}

          {/* Timestamp */}
          <div className="px-4 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
              {format(new Date(post.created_at), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}
            </p>
          </div>
        </div>
      ))}

      {loading && hasMore && (
        <div className="flex justify-center py-4">
          <div className="h-6 w-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
}
