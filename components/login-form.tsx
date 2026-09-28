"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Cloud,
  Eye,
  EyeOff,
  FileText,
  FolderOpen,
  Loader2,
  LockKeyhole,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { jsonRequest, requestApi } from "@/lib/client-api";

export function LoginForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  return (
    <div className="login-layout">
      <section className="login-story" aria-label="关于云尾笔记">
        <div className="flex items-center gap-3">
          <span className="brand-mark">
            <Cloud size={25} />
          </span>
          <span className="text-lg font-semibold">云尾笔记</span>
        </div>
        <p className="eyebrow mt-12 sm:mt-20">YOUR THOUGHTS, YOUR SPACE</p>
        <h1 className="mt-4 text-3xl font-semibold leading-relaxed tracking-tight sm:text-4xl">
          让每一个想法，
          <br />
          都有归处。
        </h1>
        <p className="mt-5 max-w-72 text-sm leading-7 text-muted-foreground">
          一个安静的私有笔记空间。
          <br />
          记录、整理，再与灵感不期而遇。
        </p>
        <div className="login-detail mt-auto flex gap-5 pt-12 text-xs text-primary">
          <span className="flex items-center gap-2">
            <FileText size={15} />
            自由书写
          </span>
          <span className="flex items-center gap-2">
            <FolderOpen size={15} />
            有序收藏
          </span>
        </div>
      </section>
      <section className="login-form" aria-label="登录">
        <span className="mb-6 flex h-10 w-10 items-center justify-center rounded-xl border text-primary">
          <LockKeyhole size={18} />
        </span>
        <h2 className="text-2xl font-semibold tracking-tight">欢迎回来</h2>
        <p className="mb-8 mt-3 text-sm text-muted-foreground">
          输入访问密码，继续你的记录。
        </p>
        <form
          className="space-y-5"
          onSubmit={async (event) => {
            event.preventDefault();
            if (loading || !password) return;
            setLoading(true);
            setError("");
            try {
              await requestApi(
                "/api/auth/login",
                jsonRequest("POST", { password }),
              );
              router.replace(nextPath);
              router.refresh();
            } catch (error) {
              setError(
                error instanceof Error
                  ? error.message
                  : "登录失败，请稍后重试。",
              );
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="space-y-2">
            <Label htmlFor="password">访问密码</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                className="h-11 pr-11"
                type={visible ? "text" : "password"}
                autoComplete="current-password"
                required
                maxLength={1024}
                value={password}
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "login-error" : undefined}
                placeholder="请输入你的密码"
                onChange={(event) => setPassword(event.target.value)}
              />
              <button
                type="button"
                className="absolute right-3 top-3 text-muted-foreground"
                aria-label={visible ? "隐藏密码" : "显示密码"}
                onClick={() => setVisible(!visible)}
              >
                {visible ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          {error && (
            <p
              id="login-error"
              className="text-sm text-destructive"
              role="alert"
            >
              {error}
            </p>
          )}
          <Button
            type="submit"
            className="h-11 w-full"
            disabled={loading || !password}
          >
            {loading ? <Loader2 size={16} className="animate-spin" /> : null}
            {loading ? "正在进入…" : "进入我的笔记"}
            {!loading && <ArrowRight size={16} />}
          </Button>
        </form>
        <p className="mt-8 text-center text-[11px] leading-6 text-muted-foreground">
          笔记与图片，存储在你自己的服务器。
          <br />
          只属于你的知识空间。
        </p>
      </section>
    </div>
  );
}
