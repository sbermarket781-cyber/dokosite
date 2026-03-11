"use client";

import { useState } from "react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, FileText } from "lucide-react";
import type { TemplateInfo, FieldValue } from "@/types";

interface DocumentPreviewProps {
  templates: TemplateInfo[];
  values: FieldValue;
}

export function DocumentPreview({ templates, values }: DocumentPreviewProps) {
  const [currentIndex, setCurrentIndex] = useState(0);

  if (templates.length === 0) {
    return (
      <Card className="h-full flex items-center justify-center">
        <div className="text-center p-8">
          <FileText className="mx-auto h-12 w-12 text-neutral-600 mb-3" />
          <p className="text-neutral-400">Выберите шаблоны для предпросмотра</p>
        </div>
      </Card>
    );
  }

  const currentTemplate = templates[currentIndex];

  // Build preview text with filled placeholders
  const previewFields = currentTemplate.placeholders?.map((p) => {
    const value = values[p.key];
    return {
      key: p.key,
      label: p.label,
      value: value ? String(value) : "",
      filled: !!value && String(value).trim() !== "",
    };
  }) || [];

  return (
    <Card className="sticky top-20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Предпросмотр</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {currentIndex + 1} / {templates.length}
          </Badge>
        </div>
        {/* Template switcher */}
        {templates.length > 1 && (
          <div className="flex items-center gap-2 mt-2">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => i - 1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="flex-1 text-center text-xs text-neutral-400 truncate">
              {currentTemplate.name}
            </span>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              disabled={currentIndex === templates.length - 1}
              onClick={() => setCurrentIndex((i) => i + 1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Simulated document preview */}
        <div className="bg-white rounded-lg p-6 min-h-[400px] shadow-inner">
          <div className="text-center mb-6">
            <h3 className="text-lg font-bold text-neutral-900">
              {currentTemplate.name}
            </h3>
            <div className="h-0.5 w-16 bg-[#FF6200] mx-auto mt-2" />
          </div>

          <div className="space-y-3">
            {previewFields.map((field) => (
              <div key={field.key} className="flex items-start gap-2">
                <span className="text-xs text-neutral-500 min-w-[100px]">
                  {field.label}:
                </span>
                <span
                  className={`text-sm flex-1 ${
                    field.filled
                      ? "text-neutral-900 font-medium"
                      : "text-neutral-400 italic"
                  }`}
                >
                  {field.filled
                    ? field.value
                    : `{{${field.key}}}`}
                </span>
              </div>
            ))}
          </div>

          {previewFields.length === 0 && (
            <p className="text-sm text-neutral-500 text-center mt-8">
              Нет полей для предпросмотра
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
