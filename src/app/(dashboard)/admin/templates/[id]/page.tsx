"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  GripVertical,
  FileText,
  Eye,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import type { TemplateInfo, PlaceholderInfo, FieldType, CategoryInfo } from "@/types";

interface PlaceholderDraft {
  id?: string;
  key: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  order: number;
  isRepeatable: boolean;
  groupName: string;
}

const fieldTypes: { value: FieldType; label: string }[] = [
  { value: "TEXT", label: "Текст" },
  { value: "DATE", label: "Дата" },
  { value: "NUMBER", label: "Число" },
  { value: "PHONE", label: "Телефон" },
  { value: "EMAIL", label: "Email" },
  { value: "TEXTAREA", label: "Длинный текст" },
  { value: "CURRENCY", label: "Сумма (валюта)" },
];

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [template, setTemplate] = useState<TemplateInfo | null>(null);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPreview, setShowPreview] = useState(false);

  // Editable template fields
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");

  // Placeholders
  const [placeholders, setPlaceholders] = useState<PlaceholderDraft[]>([]);

  // Auto-detected placeholders from PDF text
  const [detectedKeys, setDetectedKeys] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/templates?id=${templateId}`).then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([t, c]) => {
        setTemplate(t);
        setCategories(c);
        setName(t.name);
        setDescription(t.description || "");
        setCategoryId(t.categoryId);
        setPlaceholders(
          (t.placeholders || []).map((p: PlaceholderInfo, i: number) => ({
            id: p.id,
            key: p.key,
            label: p.label,
            fieldType: p.fieldType,
            required: p.required,
            order: p.order || i,
            isRepeatable: p.isRepeatable,
            groupName: p.groupName || "",
          }))
        );
        setLoading(false);

        // Try to detect {{...}} placeholders from PDF
        detectPlaceholders(t.filePath);
      })
      .catch(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [templateId]);

  const detectPlaceholders = async (filePath: string) => {
    try {
      const response = await fetch(filePath);
      const arrayBuffer = await response.arrayBuffer();
      const { PDFDocument } = await import("pdf-lib");
      const pdfDoc = await PDFDocument.load(arrayBuffer);

      // Try to extract text and find {{...}} patterns
      const pages = pdfDoc.getPages();
      const keys: string[] = [];

      // Also check form fields
      try {
        const form = pdfDoc.getForm();
        const fields = form.getFields();
        fields.forEach((field) => {
          const name = field.getName();
          if (name && !keys.includes(name)) {
            keys.push(name);
          }
        });
      } catch {
        // no form
      }

      // Check page content for {{...}} patterns (basic approach)
      // In a production system, you'd use a proper PDF text extractor
      for (const page of pages) {
        // Attempting to read content stream for {{...}} patterns
        const content = page.node.toString();
        const matches = content.match(/\{\{([^}]+)\}\}/g);
        if (matches) {
          matches.forEach((match) => {
            const key = match;
            if (!keys.includes(key)) {
              keys.push(key);
            }
          });
        }
      }

      setDetectedKeys(keys);
    } catch {
      // Failed to parse PDF, user can add manually
    }
  };

  const addPlaceholder = (key?: string) => {
    setPlaceholders((prev) => [
      ...prev,
      {
        key: key || `{{ПОЛЕ_${prev.length + 1}}}`,
        label: key ? key.replace(/\{\{|\}\}/g, "") : `Поле ${prev.length + 1}`,
        fieldType: "TEXT",
        required: true,
        order: prev.length,
        isRepeatable: false,
        groupName: "",
      },
    ]);
  };

  const removePlaceholder = (index: number) => {
    setPlaceholders((prev) => prev.filter((_, i) => i !== index));
  };

  const updatePlaceholder = (
    index: number,
    updates: Partial<PlaceholderDraft>
  ) => {
    setPlaceholders((prev) =>
      prev.map((p, i) => (i === index ? { ...p, ...updates } : p))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update template info
      await fetch(`/api/templates?id=${templateId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          description,
          categoryId,
          placeholders: placeholders.map((p, i) => ({
            id: p.id,
            key: p.key,
            label: p.label,
            fieldType: p.fieldType,
            required: p.required,
            order: i,
            isRepeatable: p.isRepeatable,
            groupName: p.groupName || null,
          })),
        }),
      });

      alert("Шаблон сохранён!");
      router.push("/admin/templates/upload");
    } catch {
      alert("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-4 text-center">
        <p className="text-neutral-400">Шаблон не найден</p>
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center gap-3 mb-6"
      >
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/admin/templates/upload")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Конструктор плейсхолдеров</h1>
          <p className="text-sm text-neutral-400">
            Настройте поля для шаблона «{template.name}»
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
          <Eye className="h-4 w-4" />
          <span className="hidden sm:inline">Превью</span>
        </Button>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? <Spinner className="h-4 w-4" /> : <Save className="h-4 w-4" />}
          <span className="hidden sm:inline">Сохранить</span>
        </Button>
      </motion.div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Template Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic info */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Информация о шаблоне</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  Название
                </label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-neutral-300">
                  Описание
                </label>
                <Input
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Краткое описание..."
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
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Detected placeholders */}
          {detectedKeys.length > 0 && (
            <Card className="border-[#FF6200]/20 bg-[#FF6200]/5">
              <CardHeader>
                <CardTitle className="text-sm text-[#FF6200]">
                  Обнаруженные плейсхолдеры
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {detectedKeys
                    .filter(
                      (k) => !placeholders.some((p) => p.key === k)
                    )
                    .map((key) => (
                      <Button
                        key={key}
                        variant="outline"
                        size="sm"
                        onClick={() => addPlaceholder(key)}
                      >
                        <Plus className="h-3 w-3" />
                        {key}
                      </Button>
                    ))}
                  {detectedKeys.filter(
                    (k) => !placeholders.some((p) => p.key === k)
                  ).length === 0 && (
                    <p className="text-xs text-neutral-500">
                      Все обнаруженные плейсхолдеры добавлены
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Placeholder Constructor */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-sm">
                Поля документа ({placeholders.length})
              </CardTitle>
              <Button size="sm" onClick={() => addPlaceholder()}>
                <Plus className="h-4 w-4" />
                Добавить поле
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {placeholders.map((placeholder, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="border border-neutral-800 rounded-xl p-4 space-y-3"
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="h-4 w-4 text-neutral-600 shrink-0" />
                    <Badge variant="secondary" className="text-[9px] shrink-0">
                      #{index + 1}
                    </Badge>
                    <span className="flex-1" />
                    <button
                      onClick={() => removePlaceholder(index)}
                      className="text-neutral-500 hover:text-red-400 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Key */}
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">
                        Ключ в PDF
                      </label>
                      <Input
                        value={placeholder.key}
                        onChange={(e) =>
                          updatePlaceholder(index, { key: e.target.value })
                        }
                        placeholder="{{ФИО}}"
                        className="h-10 text-sm font-mono"
                      />
                    </div>

                    {/* Label */}
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">
                        Название для менеджера
                      </label>
                      <Input
                        value={placeholder.label}
                        onChange={(e) =>
                          updatePlaceholder(index, { label: e.target.value })
                        }
                        placeholder="Полное имя"
                        className="h-10 text-sm"
                      />
                    </div>

                    {/* Type */}
                    <div className="space-y-1">
                      <label className="text-xs text-neutral-400">
                        Тип поля
                      </label>
                      <Select
                        options={fieldTypes}
                        value={placeholder.fieldType}
                        onChange={(e) =>
                          updatePlaceholder(index, {
                            fieldType: e.target.value as FieldType,
                          })
                        }
                        className="h-10 text-sm"
                      />
                    </div>

                    {/* Group name (for repeatables) */}
                    {placeholder.isRepeatable && (
                      <div className="space-y-1">
                        <label className="text-xs text-neutral-400">
                          Группа
                        </label>
                        <Input
                          value={placeholder.groupName}
                          onChange={(e) =>
                            updatePlaceholder(index, {
                              groupName: e.target.value,
                            })
                          }
                          placeholder="Позиции инвойса"
                          className="h-10 text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Toggles */}
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                      <Checkbox
                        checked={placeholder.required}
                        onChange={(v) =>
                          updatePlaceholder(index, { required: v })
                        }
                      />
                      Обязательное
                    </label>
                    <label className="flex items-center gap-2 text-sm text-neutral-300 cursor-pointer">
                      <Checkbox
                        checked={placeholder.isRepeatable}
                        onChange={(v) =>
                          updatePlaceholder(index, { isRepeatable: v })
                        }
                      />
                      Повторяемое
                    </label>
                  </div>
                </motion.div>
              ))}

              {placeholders.length === 0 && (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-10 w-10 text-neutral-600 mb-2" />
                  <p className="text-sm text-neutral-400">
                    Добавьте плейсхолдеры для этого шаблона
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    Плейсхолдеры соответствуют полям {"{{...}}"} в PDF
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Preview sidebar */}
        <div className="space-y-6">
          {/* PDF Preview */}
          <Card className="sticky top-20">
            <CardHeader>
              <CardTitle className="text-sm">Шаблон PDF</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-neutral-800 rounded-lg overflow-hidden">
                <iframe
                  src={template.filePath}
                  className="w-full h-[400px] lg:h-[500px]"
                  title="PDF Preview"
                />
              </div>
              <p className="text-xs text-neutral-500 mt-2">
                Файл: {template.fileName}
              </p>
            </CardContent>
          </Card>

          {/* Quick reference */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Справка</CardTitle>
            </CardHeader>
            <CardContent className="text-xs text-neutral-400 space-y-2">
              <p>
                <strong className="text-neutral-300">Ключ в PDF</strong> — точное
                значение плейсхолдера в документе, например:{" "}
                <code className="text-[#FF6200]">{"{{ФИО}}"}</code>
              </p>
              <p>
                <strong className="text-neutral-300">Название</strong> —
                человекочитаемое имя поля, которое увидит менеджер.
              </p>
              <p>
                <strong className="text-neutral-300">Повторяемое</strong> — для
                позиций инвойса и других списков (менеджер может добавлять
                строки).
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
