"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Upload,
  FileText,
  Pencil,
  Trash2,
  Eye,
  Plus,
  Search,
  FileStack,
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
import type { TemplateInfo, CategoryInfo } from "@/types";

export default function AdminTemplatesPage() {
  const router = useRouter();
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("FileText");

  // Upload form state
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadName, setUploadName] = useState("");
  const [uploadDescription, setUploadDescription] = useState("");
  const [uploadCategoryId, setUploadCategoryId] = useState("");

  const loadData = () => {
    Promise.all([
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([t, c]) => {
        setTemplates(t);
        setCategories(c);
        if (c.length > 0 && !uploadCategoryId) {
          setUploadCategoryId(c[0].id);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleUpload = async () => {
    if (!uploadFile || !uploadName || !uploadCategoryId) return;
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", uploadFile);
      formData.append("name", uploadName);
      formData.append("description", uploadDescription);
      formData.append("categoryId", uploadCategoryId);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const template = await res.json();
        setShowUpload(false);
        setUploadFile(null);
        setUploadName("");
        setUploadDescription("");
        // Navigate to placeholder constructor
        router.push(`/admin/templates/${template.id}`);
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка загрузки");
      }
    } catch {
      alert("Ошибка сети");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Удалить шаблон?")) return;
    try {
      await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
      loadData();
    } catch {
      alert("Ошибка");
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategoryName, icon: newCategoryIcon }),
      });
      if (res.ok) {
        setNewCategoryName("");
        setShowCategoryDialog(false);
        loadData();
      } else {
        const data = await res.json();
        alert(data.error || "Ошибка");
      }
    } catch {
      alert("Ошибка сети");
    }
  };

  const filteredTemplates = templates.filter(
    (t) =>
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold">Шаблоны документов</h1>
          <p className="text-neutral-400 text-sm">
            {templates.length} шаблонов
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowCategoryDialog(true)}
          >
            <Plus className="h-4 w-4" />
            <span className="hidden sm:inline">Категория</span>
          </Button>
          <Button onClick={() => setShowUpload(true)}>
            <Upload className="h-4 w-4" />
            Загрузить
          </Button>
        </div>
      </motion.div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
        <Input
          placeholder="Поиск шаблонов..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-12"
        />
      </div>

      {/* Templates list */}
      <div className="space-y-3">
        {filteredTemplates.map((template, index) => (
          <motion.div
            key={template.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.03 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6200]/10 shrink-0">
                  <FileText className="h-5 w-5 text-[#FF6200]" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-neutral-100 truncate">
                    {template.name}
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                    <Badge variant="secondary" className="text-[9px]">
                      {template.category?.name}
                    </Badge>
                    <span className="text-xs text-neutral-500">
                      {template.placeholders?.length || 0} полей
                    </span>
                    <span className="text-xs text-neutral-500">
                      · {template.usageCount} использований
                    </span>
                    <span className="text-xs text-neutral-600">
                      · {formatDate(template.createdAt)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() =>
                      router.push(`/admin/templates/${template.id}`)
                    }
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9"
                    onClick={() => handleDelete(template.id)}
                  >
                    <Trash2 className="h-4 w-4 text-red-400" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {filteredTemplates.length === 0 && (
          <div className="text-center py-16">
            <FileStack className="mx-auto h-12 w-12 text-neutral-600 mb-3" />
            <p className="text-neutral-400">
              {search ? "Ничего не найдено" : "Нет загруженных шаблонов"}
            </p>
          </div>
        )}
      </div>

      {/* Upload Dialog */}
      <Dialog open={showUpload} onOpenChange={setShowUpload}>
        <DialogHeader>
          <DialogTitle>Загрузить PDF-шаблон</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {/* File input */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              PDF файл
            </label>
            <div
              className="border-2 border-dashed border-neutral-700 rounded-xl p-6 text-center cursor-pointer hover:border-[#FF6200]/50 transition-colors"
              onClick={() =>
                document.getElementById("pdf-upload")?.click()
              }
            >
              <input
                id="pdf-upload"
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setUploadFile(file);
                    if (!uploadName) {
                      setUploadName(file.name.replace(".pdf", ""));
                    }
                  }
                }}
              />
              {uploadFile ? (
                <div className="flex items-center justify-center gap-2">
                  <FileText className="h-5 w-5 text-[#FF6200]" />
                  <span className="text-sm text-neutral-200">
                    {uploadFile.name}
                  </span>
                </div>
              ) : (
                <>
                  <Upload className="mx-auto h-8 w-8 text-neutral-500 mb-2" />
                  <p className="text-sm text-neutral-400">
                    Нажмите для загрузки PDF
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Название шаблона
            </label>
            <Input
              placeholder="Например: Инвойс стандартный"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Описание (необязательно)
            </label>
            <Input
              placeholder="Краткое описание шаблона"
              value={uploadDescription}
              onChange={(e) => setUploadDescription(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Категория
            </label>
            <Select
              options={categories.map((c) => ({
                value: c.id,
                label: c.name,
              }))}
              value={uploadCategoryId}
              onChange={(e) => setUploadCategoryId(e.target.value)}
              placeholder="Выберите категорию"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowUpload(false)}
            >
              Отмена
            </Button>
            <Button
              className="flex-1"
              disabled={uploading || !uploadFile || !uploadName}
              onClick={handleUpload}
            >
              {uploading ? (
                <Spinner className="h-4 w-4" />
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Загрузить
                </>
              )}
            </Button>
          </div>
        </div>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogHeader>
          <DialogTitle>Новая категория</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Название
            </label>
            <Input
              placeholder="Например: Инвойсы"
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-300">
              Иконка
            </label>
            <Select
              options={[
                { value: "FileText", label: "Документ" },
                { value: "Receipt", label: "Чек" },
                { value: "ScrollText", label: "Свиток" },
                { value: "Shield", label: "Щит" },
                { value: "Handshake", label: "Рукопожатие" },
                { value: "Briefcase", label: "Портфель" },
              ]}
              value={newCategoryIcon}
              onChange={(e) => setNewCategoryIcon(e.target.value)}
            />
          </div>
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => setShowCategoryDialog(false)}
            >
              Отмена
            </Button>
            <Button className="flex-1" onClick={handleCreateCategory}>
              Создать
            </Button>
          </div>
        </div>
      </Dialog>
    </div>
  );
}
