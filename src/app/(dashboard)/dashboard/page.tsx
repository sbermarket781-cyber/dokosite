"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Receipt,
  ScrollText,
  Shield,
  Handshake,
  Briefcase,
  Search,
  FilePlus,
  TrendingUp,
  Plus,
  X,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import type { CategoryInfo } from "@/types";

const iconMap: Record<string, React.ElementType> = {
  FileText,
  Receipt,
  ScrollText,
  Shield,
  Handshake,
  Briefcase,
  TrendingUp,
};

const categoryColors = [
  "from-orange-500/20 to-orange-600/5 border-orange-500/20",
  "from-blue-500/20 to-blue-600/5 border-blue-500/20",
  "from-emerald-500/20 to-emerald-600/5 border-emerald-500/20",
  "from-violet-500/20 to-violet-600/5 border-violet-500/20",
  "from-pink-500/20 to-pink-600/5 border-pink-500/20",
  "from-cyan-500/20 to-cyan-600/5 border-cyan-500/20",
];

const iconColors = [
  "text-orange-400",
  "text-blue-400",
  "text-emerald-400",
  "text-violet-400",
  "text-pink-400",
  "text-cyan-400",
];

const availableIcons = Object.keys(iconMap);

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("FileText");
  const [saving, setSaving] = useState(false);

  const isAdmin = session?.user?.role === "ADMIN";

  const fetchCategories = () => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleAddCategory = async () => {
    if (!newName.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName.trim(), icon: newIcon }),
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Ошибка");
        return;
      }
      setNewName("");
      setNewIcon("FileText");
      setShowAddModal(false);
      fetchCategories();
    } catch {
      alert("Ошибка при создании категории");
    } finally {
      setSaving(false);
    }
  };

  const filteredCategories = categories.filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Welcome */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl lg:text-3xl font-bold text-neutral-100">
          Добро пожаловать{session?.user.name ? `, ${session.user.name}` : ""}
        </h1>
        <p className="text-neutral-400 mt-1">
          Выберите категорию или создайте новый документ
        </p>
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mb-6 flex gap-3 flex-wrap"
      >
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => router.push("/documents/create")}
        >
          <FilePlus className="h-5 w-5" />
          Создать новый документ
        </Button>
        {isAdmin && (
          <Button
            size="lg"
            variant="outline"
            className="w-full sm:w-auto"
            onClick={() => setShowAddModal(true)}
          >
            <Plus className="h-5 w-5" />
            Добавить категорию
          </Button>
        )}
      </motion.div>

      {/* Search */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-6"
      >
        <div className="relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
          <Input
            placeholder="Поиск по категориям и шаблонам..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-12 h-14 text-base"
          />
        </div>
      </motion.div>

      {/* Categories Grid */}
      {loading ? (
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredCategories.map((category, index) => {
            const IconComponent =
              iconMap[category.icon] || FileText;
            const colorClass =
              categoryColors[index % categoryColors.length];
            const iconColor =
              iconColors[index % iconColors.length];

            return (
              <motion.div
                key={category.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <Card
                  className={`cursor-pointer bg-gradient-to-br ${colorClass} hover:scale-[1.02] transition-all duration-300 active:scale-[0.98]`}
                  onClick={() =>
                    router.push(
                      `/documents/create?category=${category.id}`
                    )
                  }
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div
                          className={`inline-flex h-12 w-12 items-center justify-center rounded-xl bg-neutral-900/50 ${iconColor} mb-3`}
                        >
                          <IconComponent className="h-6 w-6" />
                        </div>
                        <h3 className="text-lg font-semibold text-neutral-100">
                          {category.name}
                        </h3>
                        <p className="text-sm text-neutral-400 mt-1">
                          {category._count?.templates || 0} шаблонов
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}

          {filteredCategories.length === 0 && !loading && (
            <div className="col-span-full text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-neutral-600 mb-3" />
              <p className="text-neutral-400">
                {search
                  ? "Ничего не найдено"
                  : "Категории пока не добавлены"}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Add Category Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 w-full max-w-md"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-lg font-bold text-neutral-100">
                  Новая категория
                </h2>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="text-neutral-400 hover:text-neutral-200 transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">
                    Название
                  </label>
                  <Input
                    placeholder="Например: Договоры"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
                    autoFocus
                  />
                </div>

                <div>
                  <label className="block text-sm text-neutral-400 mb-1.5">
                    Иконка
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {availableIcons.map((iconName, idx) => {
                      const Icon = iconMap[iconName];
                      return (
                        <button
                          key={iconName}
                          onClick={() => setNewIcon(iconName)}
                          className={`flex flex-col items-center gap-1 p-3 rounded-xl border transition-all ${
                            newIcon === iconName
                              ? "border-[#FF6200] bg-[#FF6200]/10 text-[#FF6200]"
                              : "border-neutral-800 text-neutral-400 hover:border-neutral-700 hover:text-neutral-300"
                          }`}
                        >
                          <Icon className="h-5 w-5" />
                          <span className="text-[10px] truncate w-full text-center">
                            {iconName}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <Button
                  variant="secondary"
                  className="flex-1"
                  onClick={() => setShowAddModal(false)}
                >
                  Отмена
                </Button>
                <Button
                  className="flex-1"
                  onClick={handleAddCategory}
                  disabled={!newName.trim() || saving}
                >
                  {saving ? <Spinner className="h-4 w-4" /> : "Создать"}
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
