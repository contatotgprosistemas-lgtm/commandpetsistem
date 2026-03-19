import { Package } from "lucide-react";

const ServicosPage = () => {
  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Package className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-bold text-foreground">Serviços</h1>
      </div>
      <p className="text-muted-foreground">Gerencie os serviços oferecidos pela sua empresa.</p>
    </div>
  );
};

export default ServicosPage;
