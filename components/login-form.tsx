"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, LockKeyhole } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { ApiError } from "@/types/api";

type LoginFormProps = {
  nextPath: string;
};

export function LoginForm({ nextPath }: LoginFormProps) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  return (
    <Card className="w-full max-w-md border-border/80 bg-card/95">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-xl">
          <LockKeyhole className="h-5 w-5 text-primary" />
          登录云尾笔记
        </CardTitle>
        <CardDescription>使用你配置在 .env 的单密码登录。</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={async (event) => {
            event.preventDefault();
            if (!password.trim()) {
              toast.error("请输入密码。");
              return;
            }

            setLoading(true);
            try {
              const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ password }),
              });
              if (!response.ok) {
                const payload = (await response.json().catch(() => null)) as ApiError | null;
                throw new Error(payload?.error ?? "登录失败");
              }

              toast.success("登录成功。");
              router.replace(nextPath);
            } catch (error) {
              toast.error(error instanceof Error ? error.message : "登录失败。");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-1.5">
            <Label htmlFor="password">访问密码</Label>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            登录
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
