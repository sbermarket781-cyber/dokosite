"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
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

export default function DashboardPage() {
  const { data: session } = useSession();
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/categories")
      .then((res) => res.json())
      .then((data) => {
        setCategories(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

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
        className="mb-6"
      >
        <Button
          size="lg"
          className="w-full sm:w-auto"
          onClick={() => router.push("/documents/create")}
        >
          <FilePlus className="h-5 w-5" />
          Создать новый документ
        </Button>
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
    </div>
  );
}
