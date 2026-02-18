"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { FileText, Download, Calendar, ChevronRight, FolderOpen } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Input } from "@/components/ui/input";
import { formatDate } from "@/lib/utils";
import type { DocumentInfo } from "@/types";

export default function CabinetPage() {
  const [documents, setDocuments] = useState<DocumentInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then((data) => {
        setDocuments(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered = documents.filter(
    (d) =>
      d.title.toLowerCase().includes(search.toLowerCase()) ||
      d.templates.some((t) =>
        t.template.name.toLowerCase().includes(search.toLowerCase())
      )
  );

  const handleDownloadDocument = async (docTemplate: DocumentInfo["templates"][0]) => {
    if (!docTemplate.generatedPath) return;
    try {
      const response = await fetch(docTemplate.generatedPath);
      const blob = await response.blob();
      const { saveAs } = await import("file-saver");
      saveAs(blob, `${docTemplate.template.name}.pdf`);
    } catch {
      alert("Ошибка при скачивании файла");
    }
  };

  const handleDownloadAll = async (doc: DocumentInfo) => {
    const JSZip = (await import("jszip")).default;
    const { saveAs } = await import("file-saver");

    const zip = new JSZip();
    for (const dt of doc.templates) {
      if (dt.generatedPath) {
        try {
          const response = await fetch(dt.generatedPath);
          const blob = await response.blob();
          zip.file(`${dt.template.name}.pdf`, blob);
        } catch {
          // skip failed files
        }
      }
    }

    const content = await zip.generateAsync({ type: "blob" });
    saveAs(content, `documents-${doc.id.slice(0, 8)}.zip`);
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
      >
        <h1 className="text-2xl font-bold mb-1">Мои документы</h1>
        <p className="text-neutral-400 text-sm mb-6">
          История созданных документов
        </p>
      </motion.div>

      {/* Search */}
      <div className="relative mb-6">
        <Input
          placeholder="Поиск по документам..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-4"
        />
      </div>

      {/* Document list */}
      <div className="space-y-3">
        {filtered.map((doc, index) => (
          <motion.div
            key={doc.id}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card
              className="cursor-pointer hover:border-neutral-700 transition-all"
              onClick={() =>
                setExpandedId(expandedId === doc.id ? null : doc.id)
              }
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6200]/10 shrink-0">
                    <FileText className="h-5 w-5 text-[#FF6200]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-neutral-100 truncate">
                      {doc.title}
                    </h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <Calendar className="h-3 w-3 text-neutral-500" />
                      <span className="text-xs text-neutral-500">
                        {formatDate(doc.createdAt)}
                      </span>
                      <Badge variant="secondary" className="text-[9px]">
                        {doc.templates.length} док.
                      </Badge>
                    </div>
                  </div>
                  <ChevronRight
                    className={`h-5 w-5 text-neutral-500 transition-transform ${
                      expandedId === doc.id ? "rotate-90" : ""
                    }`}
                  />
                </div>

                {/* Expanded content */}
                {expandedId === doc.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    className="mt-4 pt-4 border-t border-neutral-800 space-y-2"
                  >
                    {doc.templates.map((dt) => (
                      <div
                        key={dt.id}
                        className="flex items-center justify-between py-2 px-3 rounded-lg bg-neutral-800/30"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <FileText className="h-4 w-4 text-neutral-400 shrink-0" />
                          <span className="text-sm text-neutral-300 truncate">
                            {dt.template.name}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownloadDocument(dt);
                          }}
                          disabled={!dt.generatedPath}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}

                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadAll(doc);
                      }}
                    >
                      <Download className="h-4 w-4" />
                      Скачать все (ZIP)
                    </Button>
                  </motion.div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {filtered.length === 0 && (
          <div className="text-center py-16">
            <FolderOpen className="mx-auto h-12 w-12 text-neutral-600 mb-3" />
            <p className="text-neutral-400">
              {search
                ? "Ничего не найдено"
                : "Вы ещё не создавали документов"}
            </p>
            {!search && (
              <Button
                className="mt-4"
                onClick={() =>
                  (window.location.href = "/documents/create")
                }
              >
                Создать первый документ
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
