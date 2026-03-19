import { ShoppingBag } from "lucide-react";

const ProdutosPage = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <ShoppingBag className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Produtos</h1>
      </div>
      <p className="text-muted-foreground">Gerencie os produtos disponíveis na sua empresa.</p>
    </div>
  );
};

export default ProdutosPage;
