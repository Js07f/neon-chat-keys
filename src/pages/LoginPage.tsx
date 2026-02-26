import { useState } from "react";
import { KeyRound, Loader2, AlertCircle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { storage } from "@/lib/storage";
import { supabase } from "@/integrations/supabase/client";

interface LoginPageProps {
  onLogin: () => void;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const [key, setKey] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim()) return;

    setLoading(true);
    setError("");

    try {
      const { data, error: fnError } = await supabase.functions.invoke("validate-key", {
        body: { key: key.trim() },
      });

      if (fnError) throw new Error("Erro de conexão");

      if (data?.valid) {
        storage.setLicenseKey(key.trim());
        onLogin();
      } else {
        setError(data?.error || "Chave inválida ou expirada");
      }
    } catch (err: any) {
      setError(err.message || "Erro ao validar chave");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <div className="w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/20 flex items-center justify-center neon-border">
            <KeyRound className="w-8 h-8 text-primary neon-text" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight neon-text">NeonChat</h1>
          <p className="text-muted-foreground">Insira sua chave de licença para acessar</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Input
              type="text"
              placeholder="Digite sua chave de acesso..."
              value={key}
              onChange={(e) => setKey(e.target.value)}
              className="h-12 bg-secondary/50 border-border focus:neon-border font-mono text-center tracking-widest"
              autoFocus
            />
          </div>

          {error && (
            <div className="flex items-center gap-2 text-destructive text-sm">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            disabled={loading || !key.trim()}
            className="w-full h-12 neon-glow font-semibold"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              <KeyRound className="w-4 h-4 mr-2" />
            )}
            {loading ? "Validando..." : "Acessar"}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground">
          Não tem uma chave? Solicite ao administrador.
        </p>
      </div>
    </div>
  );
}
