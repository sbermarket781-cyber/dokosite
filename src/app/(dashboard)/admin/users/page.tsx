"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Users,
  Plus,
  Pencil,
  Ban,
  CheckCircle,
  Copy,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select } from "@/components/ui/select";
import { Spinner } from "@/components/ui/spinner";
import {
  Dialog,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import type { UserInfo } from "@/types";

export default function AdminUsersPage() {
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingUser, setEditingUser] = useState<UserInfo | null>(null);
  const [newUser, setNewUser] = useState({
    login: "",
    fullName: "",
    role: "MANAGER" as "ADMIN" | "MANAGER",
    password: "",
  });
  const [showPassword, setShowPassword] = useState(false);
  const [createdCredentials, setCreatedCredentials] = useState<{
    login: string;
    password: string;
  } | null>(null);
  const [saving, setSaving] = useState(false);

  const loadUsers = () => {
    fetch("/api/users")
      .then((r) => r.json())
      .then(setUsers)
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const generatePassword = () => {
    const chars =
      "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
    let pass = "";
    for (let i = 0; i < 10; i++) {
      pass += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setNewUser((p) => ({ ...p, password: pass }));
  };

  const handleCreate = async () => {
    if (!newUser.login || !newUser.fullName || !newUser.password) return;
    setSaving(true);

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser),
      });

      if (res.ok) {
        setCreatedCredentials({
          login: newUser.login,
          password: newUser.password,
        });
        setNewUser({ login: "", fullName: "", role: "MANAGER", password: "" });
        setShowCreate(false);
        loadUsers();
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка создания пользователя");
      }
    } catch {
      alert("Ошибка сети");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (user: UserInfo) => {
    try {
      await fetch(`/api/users?id=${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !user.isActive }),
      });
      loadUsers();
    } catch {
      alert("Ошибка");
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;
    setSaving(true);

    try {
      await fetch(`/api/users?id=${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: editingUser.fullName,
          role: editingUser.role,
        }),
      });
      setEditingUser(null);
      loadUsers();
    } catch {
      alert("Ошибка");
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6"
      >
        <div>
          <h1 className="text-2xl font-bold">Пользователи</h1>
          <p className="text-neutral-400 text-sm">
            {users.length} пользователей
          </p>
        </div>
        <Button onClick={() => { setShowCreate(true); generatePassword(); }}>
          <Plus className="h-4 w-4" />
          Создать
        </Button>
      </motion.div>

      {/* Credentials display after creation */}
      {createdCredentials && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mb-6"
        >
          <Card className="border-green-500/30 bg-green-500/5">
            <CardContent className="p-4">
              <h3 className="font-semibold text-green-400 mb-3">
                Аккаунт создан! Передайте данные сотруднику:
              </h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2 bg-neutral-900 rounded-lg p-3">
                  <span className="text-sm text-neutral-400">Логин:</span>
                  <code className="text-sm text-neutral-100 flex-1">
                    {createdCredentials.login}
                  </code>
                  <button
                    onClick={() => copyToClipboard(createdCredentials.login)}
                    className="text-neutral-400 hover:text-neutral-200"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2 bg-neutral-900 rounded-lg p-3">
                  <span className="text-sm text-neutral-400">Пароль:</span>
                  <code className="text-sm text-neutral-100 flex-1">
                    {createdCredentials.password}
                  </code>
                  <button
                    onClick={() =>
                      copyToClipboard(createdCredentials.password)
                    }
                    className="text-neutral-400 hover:text-neutral-200"
                  >
                    <Copy className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3"
                onClick={() => setCreatedCredentials(null)}
              >
                Скрыть
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Users list */}
      <div className="space-y-3">
        {users.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card
              className={
                !user.isActive ? "opacity-60" : ""
              }
            >
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-neutral-800">
                  <Users className="h-5 w-5 text-neutral-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium text-neutral-100 truncate">
                      {user.fullName}
                    </h3>
                    <Badge
                      variant={
                        user.role === "ADMIN" ? "default" : "secondary"
                      }
                      className="text-[9px]"
                    >
                      {user.role === "ADMIN" ? "Админ" : "Менеджер"}
                    </Badge>
                    {!user.isActive && (
                      <Badge variant="destructive" className="text-[9px]">
                        Деактивирован
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-neutral-500">
                    @{user.login} · {formatDate(user.createdAt)}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => setEditingUser(user)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handleToggleActive(user)}
                  >
                    {user.isActive ? (
                      <Ban className="h-4 w-4 text-red-400" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-green-400" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Create Dialog */}
      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogHeader>
          <DialogTitle>Создать пользователя</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Полное имя
            </label>
            <Input
              placeholder="Иванов Иван Иванович"
              value={newUser.fullName}
              onChange={(e) =>
                setNewUser((p) => ({ ...p, fullName: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Логин
            </label>
            <Input
              placeholder="ivanov"
              value={newUser.login}
              onChange={(e) =>
                setNewUser((p) => ({ ...p, login: e.target.value }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Роль
            </label>
            <Select
              options={[
                { value: "MANAGER", label: "Менеджер" },
                { value: "ADMIN", label: "Администратор" },
              ]}
              value={newUser.role}
              onChange={(e) =>
                setNewUser((p) => ({
                  ...p,
                  role: e.target.value as "ADMIN" | "MANAGER",
                }))
              }
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Пароль
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  type={showPassword ? "text" : "password"}
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser((p) => ({ ...p, password: e.target.value }))
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              <Button
                variant="secondary"
                onClick={generatePassword}
              >
                Генерировать
              </Button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCreate(false)}
            >
              Отмена
            </Button>
            <Button
              className="flex-1"
              disabled={saving}
              onClick={handleCreate}
            >
              {saving ? <Spinner className="h-4 w-4" /> : "Создать"}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog
        open={!!editingUser}
        onOpenChange={(open) => !open && setEditingUser(null)}
      >
        {editingUser && (
          <>
            <DialogHeader>
              <DialogTitle>Редактировать пользователя</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  Полное имя
                </label>
                <Input
                  value={editingUser.fullName}
                  onChange={(e) =>
                    setEditingUser((p) =>
                      p ? { ...p, fullName: e.target.value } : null
                    )
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  Роль
                </label>
                <Select
                  options={[
                    { value: "MANAGER", label: "Менеджер" },
                    { value: "ADMIN", label: "Администратор" },
                  ]}
                  value={editingUser.role}
                  onChange={(e) =>
                    setEditingUser((p) =>
                      p
                        ? {
                            ...p,
                            role: e.target.value as "ADMIN" | "MANAGER",
                          }
                        : null
                    )
                  }
                />
              </div>

              <div className="flex gap-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setEditingUser(null)}
                >
                  Отмена
                </Button>
                <Button
                  className="flex-1"
                  disabled={saving}
                  onClick={handleUpdate}
                >
                  {saving ? <Spinner className="h-4 w-4" /> : "Сохранить"}
                </Button>
              </div>
            </div>
          </>
        )}
      </Dialog>
    </div>
  );
}
