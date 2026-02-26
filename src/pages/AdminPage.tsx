import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  KeyRound,
  Loader2,
  LogOut,
  Plus,
  Ban,
  RefreshCw,
  Shield,
  Copy,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

interface LicenseKey {
  id: string;
  key: string;
  created_at: string;
  expires_at: string | null;
  status: string;
}

export default function AdminPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<any>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(false);
  const [keys, setKeys] = useState<LicenseKey[]>([]);
  const [generating, setGenerating] = useState(false);
  const [expirationDays, setExpirationDays] = useState("30");
  const { toast } = useToast();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) {
        checkAdminRole(session);
      } else {
        setIsAdmin(false);
        setLoading(false);
      }
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) {
        checkAdminRole(session);
      } else {
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const checkAdminRole = async (session: any) => {
    try {
      const { data } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      setIsAdmin(!!data);
      if (data) fetchKeys();
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast({ title: "Erro ao entrar", description: error.message, variant: "destructive" });
    }
    setAuthLoading(false);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setSession(null);
    setIsAdmin(false);
    setKeys([]);
  };

  const fetchKeys = async () => {
    const { data, error } = await supabase.functions.invoke("list-keys");
    if (!error && Array.isArray(data)) {
      setKeys(data);
    }
  };

  const generateKey = async () => {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-key", {
      body: { expirationDays: parseInt(expirationDays) || 30 },
    });
    if (error) {
      toast({ title: "Erro ao gerar chave", description: "Tente novamente", variant: "destructive" });
    } else if (data) {
      setKeys((prev) => [data, ...prev]);
      toast({ title: "Chave gerada!", description: data.key });
    }
    setGenerating(false);
  };

  const revokeKey = async (key: string) => {
    const { error } = await supabase.functions.invoke("revoke-key", {
      body: { key },
    });
    if (error) {
      toast({ title: "Erro ao revogar", variant: "destructive" });
    } else {
      fetchKeys();
      toast({ title: "Chave revogada" });
    }
  };

  const copyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast({ title: "Chave copiada!" });
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center neon-border">
              <Shield className="w-7 h-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold neon-text">Admin</h1>
            <p className="text-sm text-muted-foreground">Painel de gerenciamento de licenças</p>
          </div>
          <form onSubmit={handleLogin} className="space-y-3">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-secondary/50"
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-secondary/50"
            />
            <Button type="submit" disabled={authLoading} className="w-full neon-glow">
              {authLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Entrar
            </Button>
          </form>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="text-center space-y-4">
          <Ban className="w-12 h-12 text-destructive mx-auto" />
          <h2 className="text-xl font-bold">Acesso negado</h2>
          <p className="text-muted-foreground">Esta conta não possui permissão de administrador.</p>
          <Button variant="outline" onClick={handleLogout}>Sair</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-bold neon-text">Painel de Licenças</h1>
        </div>
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-muted-foreground">Expiração (dias):</span>
          <Input
            type="number"
            value={expirationDays}
            onChange={(e) => setExpirationDays(e.target.value)}
            className="w-20 h-9 bg-secondary/50"
          />
        </div>
        <Button onClick={generateKey} disabled={generating} className="neon-glow">
          {generating ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Plus className="w-4 h-4 mr-2" />}
          Gerar nova chave
        </Button>
        <Button variant="outline" size="sm" onClick={fetchKeys}>
          <RefreshCw className="w-4 h-4 mr-2" />
          Atualizar
        </Button>
      </div>

      <div className="rounded-xl border border-border neon-border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="border-border">
              <TableHead>Chave</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Criada em</TableHead>
              <TableHead>Expira em</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                  Nenhuma chave encontrada
                </TableCell>
              </TableRow>
            ) : (
              keys.map((k) => (
                <TableRow key={k.id} className="border-border">
                  <TableCell className="font-mono text-xs">{k.key}</TableCell>
                  <TableCell>
                    <Badge
                      variant={k.status === "active" ? "default" : "destructive"}
                      className={k.status === "active" ? "bg-neon-cyan/20 text-neon-cyan border-neon-cyan/30" : ""}
                    >
                      {k.status === "active" ? "Ativa" : "Revogada"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {new Date(k.created_at).toLocaleDateString("pt-BR")}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {k.expires_at ? new Date(k.expires_at).toLocaleDateString("pt-BR") : "—"}
                  </TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => copyKey(k.key)}>
                      <Copy className="w-3.5 h-3.5" />
                    </Button>
                    {k.status === "active" && (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => revokeKey(k.key)}>
                        <Ban className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
