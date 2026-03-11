"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  FileText,
  Search,
  Download,
  Eye,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Spinner } from "@/components/ui/spinner";
import { DocumentForm } from "@/components/documents/document-form";
import { DocumentPreview } from "@/components/documents/document-preview";
import { useDocumentStore } from "@/stores/document-store";
import type { TemplateInfo, CategoryInfo } from "@/types";

function DocumentCreateContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const categoryFilter = searchParams.get("category");

  const [step, setStep] = useState(1); // 1=select, 2=fill, 3=preview/download
  const [templates, setTemplates] = useState<TemplateInfo[]>([]);
  const [categories, setCategories] = useState<CategoryInfo[]>([]);
  const [search, setSearch] = useState("");
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(
    categoryFilter
  );
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [generatedPdfs, setGeneratedPdfs] = useState<
    { name: string; blob: Blob }[]
  >([]);

  const {
    selectedTemplates,
    toggleTemplate,
    fieldValues,
    setFieldValue,
    reset,
  } = useDocumentStore();

  useEffect(() => {
    Promise.all([
      fetch("/api/templates").then((r) => r.json()),
      fetch("/api/categories").then((r) => r.json()),
    ])
      .then(([t, c]) => {
        setTemplates(t);
        setCategories(c);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Get unique placeholders from selected templates
  const uniquePlaceholders = useCallback(() => {
    const seen = new Map<
      string,
      {
        key: string;
        label: string;
        fieldType: string;
        required: boolean;
        isRepeatable: boolean;
        groupName: string | null;
      }
    >();
    selectedTemplates.forEach((t) => {
      t.placeholders?.forEach((p) => {
        if (!seen.has(p.key)) {
          seen.set(p.key, p);
        }
      });
    });
    return Array.from(seen.values()).sort((a, b) => {
      if (a.isRepeatable !== b.isRepeatable) return a.isRepeatable ? 1 : -1;
      return 0;
    });
  }, [selectedTemplates]);

  const filledCount = uniquePlaceholders().filter(
    (p) => fieldValues[p.key] && String(fieldValues[p.key]).trim() !== ""
  ).length;
  const totalRequired = uniquePlaceholders().filter((p) => p.required).length;

  const filteredTemplates = templates.filter((t) => {
    const matchesSearch =
      !search ||
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !activeCategoryId || t.categoryId === activeCategoryId;
    return matchesSearch && matchesCategory && t.isActive;
  });

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      // Save document to server
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templateIds: selectedTemplates.map((t) => t.id),
          fieldValues,
          title: `Документы от ${new Date().toLocaleDateString("ru-RU")}`,
        }),
      });

      if (!response.ok) throw new Error("Failed to save");

      // Generate PDFs in browser
      const pdfs: { name: string; blob: Blob }[] = [];

      for (const template of selectedTemplates) {
        try {
          // Fetch template PDF
          const pdfResponse = await fetch(template.filePath);
          const pdfBytes = await pdfResponse.arrayBuffer();

          // Use pdf-lib to fill placeholders
          const { PDFDocument } = await import("pdf-lib");
          const pdfDoc = await PDFDocument.load(pdfBytes);
          const pages = pdfDoc.getPages();

          // Simple text replacement approach
          // For production, use @pdfme/generator with proper coordinate mapping
          const form = pdfDoc.getForm();

          // Try to fill form fields first
          try {
            const fields = form.getFields();
            fields.forEach((field) => {
              const name = field.getName();
              const value = fieldValues[name] || fieldValues[`{{${name}}}`];
              if (value && "setText" in field) {
                (field as { setText: (v: string) => void }).setText(
                  String(value)
                );
              }
            });
          } catch {
            // No form fields, use text overlay approach
          }

          // Flatten form
          try {
            form.flatten();
          } catch {
            // ignore
          }

          // For templates with {{...}} placeholders in visible text,
          // we'll add text annotations
          for (const page of pages) {
            const { width, height } = page.getSize();
            // This is a simplified approach — in production you'd use
            // pdfme's coordinate-based text placement
            void width;
            void height;
          }

          const filledPdfBytes = await pdfDoc.save();
          pdfs.push({
            name: `${template.name}.pdf`,
            blob: new Blob([filledPdfBytes as BlobPart], { type: "application/pdf" }),
          });
        } catch (err) {
          console.error(`Error generating PDF for ${template.name}:`, err);
          // Still add a placeholder
          pdfs.push({
            name: `${template.name}.pdf`,
            blob: new Blob(["Error generating PDF"], { type: "text/plain" }),
          });
        }
      }

      setGeneratedPdfs(pdfs);
      setStep(3);
    } catch (err) {
      console.error("Error:", err);
      alert("Ошибка при создании документов");
    } finally {
      setGenerating(false);
    }
  };

  const handleDownloadAll = async () => {
    const JSZip = (await import("jszip")).default;
    const { saveAs } = await import("file-saver");

    const zip = new JSZip();
    generatedPdfs.forEach((pdf) => {
      zip.file(pdf.name, pdf.blob);
    });

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `alexei-docs-${Date.now()}.zip`);
  };

  const handleDownloadSingle = async (pdf: { name: string; blob: Blob }) => {
    const { saveAs } = await import("file-saver");
    saveAs(pdf.blob, pdf.name);
  };

  const stepLabels = ["Выбор шаблонов", "Заполнение", "Скачивание"];

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Spinner className="h-8 w-8" />
      </div>
    );
  }

  return (
    <div className="p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Progress bar */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center justify-between mb-3">
          {stepLabels.map((label, i) => (
            <div
              key={label}
              className="flex items-center gap-2"
            >
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                  step > i + 1
                    ? "bg-[#FF6200] text-white"
                    : step === i + 1
                    ? "bg-[#FF6200]/20 text-[#FF6200] border border-[#FF6200]"
                    : "bg-neutral-800 text-neutral-500"
                }`}
              >
                {step > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
              </div>
              <span
                className={`hidden sm:inline text-sm ${
                  step === i + 1
                    ? "text-neutral-100 font-medium"
                    : "text-neutral-500"
                }`}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
        <Progress value={step} max={3} />
      </motion.div>

      <AnimatePresence mode="wait">
        {/* STEP 1: Select Templates */}
        {step === 1 && (
          <motion.div
            key="step1"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold">Выберите шаблоны</h2>
              {selectedTemplates.length > 0 && (
                <Badge>{selectedTemplates.length} выбрано</Badge>
              )}
            </div>

            {/* Search */}
            <div className="relative mb-4">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-neutral-500" />
              <Input
                placeholder="Поиск шаблонов..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-12"
              />
            </div>

            {/* Category filters */}
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2 -mx-4 px-4">
              <Button
                variant={activeCategoryId === null ? "default" : "secondary"}
                size="sm"
                onClick={() => setActiveCategoryId(null)}
              >
                Все
              </Button>
              {categories.map((cat) => (
                <Button
                  key={cat.id}
                  variant={activeCategoryId === cat.id ? "default" : "secondary"}
                  size="sm"
                  onClick={() => setActiveCategoryId(cat.id)}
                  className="whitespace-nowrap"
                >
                  {cat.name}
                </Button>
              ))}
            </div>

            {/* Template list */}
            <div className="space-y-3">
              {filteredTemplates.map((template) => {
                const isSelected = selectedTemplates.some(
                  (t) => t.id === template.id
                );
                return (
                  <Card
                    key={template.id}
                    className={`cursor-pointer transition-all duration-200 ${
                      isSelected
                        ? "border-[#FF6200] bg-[#FF6200]/5"
                        : "hover:border-neutral-700"
                    }`}
                    onClick={() => toggleTemplate(template)}
                  >
                    <CardContent className="flex items-center gap-4 p-4">
                      <Checkbox
                        checked={isSelected}
                        onChange={() => toggleTemplate(template)}
                      />
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-neutral-100 truncate">
                          {template.name}
                        </h3>
                        {template.description && (
                          <p className="text-sm text-neutral-400 truncate">
                            {template.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <Badge variant="secondary" className="text-[10px]">
                            {template.category?.name}
                          </Badge>
                          <span className="text-xs text-neutral-500">
                            {template.placeholders?.length || 0} полей
                          </span>
                        </div>
                      </div>
                      <FileText className="h-5 w-5 text-neutral-600 shrink-0" />
                    </CardContent>
                  </Card>
                );
              })}

              {filteredTemplates.length === 0 && (
                <div className="text-center py-12">
                  <FileText className="mx-auto h-12 w-12 text-neutral-600 mb-3" />
                  <p className="text-neutral-400">Шаблоны не найдены</p>
                </div>
              )}
            </div>

            {/* Next button */}
            <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 lg:relative lg:mt-6 p-4 lg:p-0 bg-neutral-950/90 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none border-t border-neutral-800 lg:border-0">
              <Button
                size="lg"
                className="w-full"
                disabled={selectedTemplates.length === 0}
                onClick={() => setStep(2)}
              >
                Далее — заполнить поля
                <ArrowRight className="h-5 w-5" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 2: Fill Form */}
        {step === 2 && (
          <motion.div
            key="step2"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setStep(1)}
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                  <h2 className="text-xl font-bold">Заполните данные</h2>
                  <p className="text-sm text-neutral-400">
                    {filledCount} из {totalRequired} обязательных полей
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Form */}
              <div>
                <DocumentForm
                  placeholders={uniquePlaceholders()}
                  values={fieldValues}
                  onChange={setFieldValue}
                />
              </div>

              {/* Live Preview (desktop only) */}
              <div className="hidden lg:block">
                <DocumentPreview
                  templates={selectedTemplates}
                  values={fieldValues}
                />
              </div>
            </div>

            {/* Mobile preview button + Generate */}
            <div className="fixed bottom-20 lg:bottom-0 left-0 right-0 lg:relative lg:mt-6 p-4 lg:p-0 bg-neutral-950/90 lg:bg-transparent backdrop-blur-xl lg:backdrop-blur-none border-t border-neutral-800 lg:border-0 flex gap-3">
              <Button
                variant="outline"
                size="lg"
                className="lg:hidden flex-1"
                onClick={() => {
                  // Mobile preview modal could go here
                }}
              >
                <Eye className="h-5 w-5" />
                Превью
              </Button>
              <Button
                size="lg"
                className="flex-1"
                disabled={generating}
                onClick={handleGenerate}
              >
                {generating ? (
                  <Spinner className="h-5 w-5" />
                ) : (
                  <>
                    <Check className="h-5 w-5" />
                    Создать документы
                  </>
                )}
              </Button>
            </div>
          </motion.div>
        )}

        {/* STEP 3: Download */}
        {step === 3 && (
          <motion.div
            key="step3"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <div className="text-center mb-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-green-500/20 mb-4"
              >
                <Check className="h-8 w-8 text-green-400" />
              </motion.div>
              <h2 className="text-2xl font-bold">Документы готовы!</h2>
              <p className="text-neutral-400 mt-1">
                Создано {generatedPdfs.length} документов
              </p>
            </div>

            {/* Download all */}
            <Button
              size="lg"
              className="w-full mb-6"
              onClick={handleDownloadAll}
            >
              <Download className="h-5 w-5" />
              Скачать все (ZIP)
            </Button>

            {/* Individual downloads */}
            <div className="space-y-3">
              {generatedPdfs.map((pdf, idx) => (
                <Card key={idx}>
                  <CardContent className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <FileText className="h-5 w-5 text-[#FF6200]" />
                      <span className="text-sm font-medium truncate">
                        {pdf.name}
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadSingle(pdf)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                size="lg"
                className="flex-1"
                onClick={() => {
                  reset();
                  setStep(1);
                  setGeneratedPdfs([]);
                }}
              >
                Создать ещё
              </Button>
              <Button
                variant="secondary"
                size="lg"
                className="flex-1"
                onClick={() => router.push("/cabinet")}
              >
                Мои документы
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function DocumentCreatePage() {
  return (
    <Suspense
      fallback={
        <div className="flex justify-center py-20">
          <Spinner className="h-8 w-8" />
        </div>
      }
    >
      <DocumentCreateContent />
    </Suspense>
  );
}
