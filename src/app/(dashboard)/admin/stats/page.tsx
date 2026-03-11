"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3,
  FileText,
  Users,
  TrendingUp,
  Calendar,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Spinner } from "@/components/ui/spinner";

interface StatsData {
  totalDocuments: number;
  totalTemplates: number;
  totalUsers: number;
  topTemplates: { name: string; usageCount: number }[];
  recentDocuments: {
    id: string;
    title: string;
    createdAt: string;
    userName: string;
    templateCount: number;
  }[];
  documentsPerDay: { date: string; count: number }[];
}

export default function AdminStatsPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/stats")
      .then((r) => r.json())
      .then(setStats)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading || !stats) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  const statCards = [
    {
      label: "Всего документов",
      value: stats.totalDocuments,
      icon: FileText,
      color: "text-[#FF6200]",
      bg: "bg-[#FF6200]/10",
    },
    {
      label: "Шаблонов",
      value: stats.totalTemplates,
      icon: BarChart3,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      label: "Пользователей",
      value: stats.totalUsers,
      icon: Users,
      color: "text-emerald-400",
      bg: "bg-emerald-400/10",
    },
  ];

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="text-2xl font-bold">Статистика</h1>
        <p className="text-neutral-400 text-sm">Обзор использования системы</p>
      </motion.div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        {statCards.map((stat, index) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-5">
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.bg}`}
                >
                  <stat.icon className={`h-6 w-6 ${stat.color}`} />
                </div>
                <div>
                  <p className="text-2xl font-bold text-neutral-100">
                    {stat.value}
                  </p>
                  <p className="text-xs text-neutral-400">{stat.label}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Templates */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-[#FF6200]" />
              Популярные шаблоны
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.topTemplates.length > 0 ? (
              stats.topTemplates.map((t, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm font-mono text-neutral-500 w-6">
                    {i + 1}.
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-200 truncate">
                      {t.name}
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-[#FF6200]">
                    {t.usageCount}
                  </span>
                  {/* Simple bar */}
                  <div className="w-20 h-2 bg-neutral-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FF6200] rounded-full"
                      style={{
                        width: `${
                          stats.topTemplates[0]?.usageCount
                            ? (t.usageCount /
                                stats.topTemplates[0].usageCount) *
                              100
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500">Нет данных</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Documents */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Calendar className="h-4 w-4 text-blue-400" />
              Последние документы
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {stats.recentDocuments.length > 0 ? (
              stats.recentDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="flex items-center gap-3 py-2 border-b border-neutral-800/50 last:border-0"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-neutral-200 truncate">
                      {doc.title}
                    </p>
                    <p className="text-xs text-neutral-500">
                      {doc.userName} · {doc.templateCount} шаблонов
                    </p>
                  </div>
                  <span className="text-xs text-neutral-500 whitespace-nowrap">
                    {new Date(doc.createdAt).toLocaleDateString("ru-RU")}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-sm text-neutral-500">Нет данных</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
