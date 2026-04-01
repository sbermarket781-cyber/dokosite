"use client";

import { useEffect, useState, useCallback } from "react";

interface TemplateOption {
  id: string;
  name: string;
  filePath: string;
  placeholders: {
    key: string;
    label: string;
    fieldType: string;
    required: boolean;
  }[];
}

interface InvoiceRow {
  description: string;
  quantity: string;
  price: string;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        ready: () => void;
        expand: () => void;
        close: () => void;
        MainButton: {
          text: string;
          color: string;
          textColor: string;
          isVisible: boolean;
          isActive: boolean;
          show: () => void;
          hide: () => void;
          enable: () => void;
          disable: () => void;
          showProgress: (leaveActive?: boolean) => void;
          hideProgress: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
          setText: (text: string) => void;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (cb: () => void) => void;
          offClick: (cb: () => void) => void;
        };
        themeParams: Record<string, string>;
        colorScheme: "light" | "dark";
        initDataUnsafe: {
          user?: { id: number; first_name: string; last_name?: string };
        };
        sendData: (data: string) => void;
        showAlert: (message: string) => void;
        showConfirm: (message: string, cb: (ok: boolean) => void) => void;
        HapticFeedback: {
          impactOccurred: (style: string) => void;
          notificationOccurred: (type: string) => void;
        };
      };
    };
  }
}

export default function TelegramPage() {
  const [step, setStep] = useState<"select" | "fill" | "done">("select");
  const [templates, setTemplates] = useState<TemplateOption[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<TemplateOption | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [rows, setRows] = useState<InvoiceRow[]>([
    { description: "", quantity: "1", price: "" },
  ]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const tg = typeof window !== "undefined" ? window.Telegram?.WebApp : null;

  // Initialize Telegram WebApp
  useEffect(() => {
    if (!tg) return;
    tg.ready();
    tg.expand();
  }, [tg]);

  // Fetch templates
  useEffect(() => {
    fetch("/api/templates")
      .then((r) => r.json())
      .then((data) => {
        setTemplates(data.filter((t: TemplateOption) => t.placeholders?.length > 0));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Handle MainButton
  const handleGenerate = useCallback(async () => {
    if (!selectedTemplate || generating) return;

    setGenerating(true);
    tg?.MainButton.showProgress(true);

    try {
      // Merge row data into fieldValues for repeatable fields
      const allValues = { ...fieldValues };

      // Send data to Telegram bot via sendData
      const payload = JSON.stringify({
        templates: [{
          id: selectedTemplate.id,
          name: selectedTemplate.name,
          filePath: selectedTemplate.filePath,
        }],
        fieldValues: allValues,
      });

      // Try sending via sendData (closes the Mini App and sends to bot)
      tg?.sendData(payload);
    } catch (err) {
      console.error("Error:", err);
      tg?.showAlert("Ошибка при генерации. Попробуйте снова.");
      tg?.MainButton.hideProgress();
      setGenerating(false);
    }
  }, [selectedTemplate, fieldValues, generating, tg]);

  // MainButton setup for fill step
  useEffect(() => {
    if (!tg) return;

    if (step === "fill") {
      tg.MainButton.setText("Сгенерировать инвойс");
      tg.MainButton.color = "#FF6200";
      tg.MainButton.textColor = "#ffffff";
      tg.MainButton.show();
      tg.MainButton.enable();
      tg.MainButton.onClick(handleGenerate);

      return () => {
        tg.MainButton.offClick(handleGenerate);
      };
    } else {
      tg.MainButton.hide();
    }
  }, [step, tg, handleGenerate]);

  // BackButton
  useEffect(() => {
    if (!tg) return;

    if (step === "fill") {
      tg.BackButton.show();
      const goBack = () => {
        setStep("select");
        setSelectedTemplate(null);
        setFieldValues({});
      };
      tg.BackButton.onClick(goBack);
      return () => {
        tg.BackButton.offClick(goBack);
        tg.BackButton.hide();
      };
    } else {
      tg.BackButton.hide();
    }
  }, [step, tg]);

  const selectTemplate = (t: TemplateOption) => {
    setSelectedTemplate(t);
    setStep("fill");
    // Pre-fill date with today
    const today = new Date().toLocaleDateString("ru-RU", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
    const initial: Record<string, string> = {};
    t.placeholders.forEach((p) => {
      if (p.fieldType === "DATE") {
        initial[p.key] = today;
      }
    });
    setFieldValues(initial);
    tg?.HapticFeedback?.impactOccurred("light");
  };

  const updateField = (key: string, value: string) => {
    setFieldValues((prev) => ({ ...prev, [key]: value }));
  };

  const addRow = () => {
    setRows((prev) => [...prev, { description: "", quantity: "1", price: "" }]);
    tg?.HapticFeedback?.impactOccurred("light");
  };

  const removeRow = (idx: number) => {
    if (rows.length <= 1) return;
    setRows((prev) => prev.filter((_, i) => i !== idx));
    tg?.HapticFeedback?.impactOccurred("light");
  };

  const updateRow = (idx: number, field: keyof InvoiceRow, value: string) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, [field]: value } : r)));
  };

  const totalAmount = rows.reduce((sum, r) => {
    return sum + (parseFloat(r.quantity) || 0) * (parseFloat(r.price) || 0);
  }, 0);

  const isDark = tg?.colorScheme === "dark" || true;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-2 border-[#FF6200] border-t-transparent rounded-full" />
      </div>
    );
  }

  // STEP 1: Select template
  if (step === "select") {
    return (
      <div className="p-4 max-w-lg mx-auto">
        <div className="mb-6">
          <h1 className="text-xl font-bold">Alexei Docs</h1>
          <p className="text-sm opacity-60 mt-1">Выберите шаблон для заполнения</p>
        </div>

        <div className="space-y-3">
          {templates.map((t) => (
            <button
              key={t.id}
              onClick={() => selectTemplate(t)}
              className="w-full text-left p-4 rounded-2xl border transition-all active:scale-[0.98]"
              style={{
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.03)",
                borderColor: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#FF6200]/10 shrink-0">
                  <svg className="h-5 w-5 text-[#FF6200]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs opacity-50 mt-0.5">
                    {t.placeholders.length} полей
                  </div>
                </div>
                <svg className="h-5 w-5 opacity-30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}

          {templates.length === 0 && (
            <div className="text-center py-12 opacity-50">
              <p>Нет доступных шаблонов</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // STEP 2: Fill form
  if (step === "fill" && selectedTemplate) {
    const inputStyle = {
      backgroundColor: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)",
      borderColor: isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)",
      color: "inherit",
    };

    return (
      <div className="p-4 max-w-lg mx-auto pb-24">
        <div className="mb-5">
          <h1 className="text-lg font-bold">{selectedTemplate.name}</h1>
          <p className="text-xs opacity-50 mt-0.5">Заполните все поля</p>
        </div>

        {/* Template fields */}
        <div className="space-y-4">
          {selectedTemplate.placeholders.map((p) => (
            <div key={p.key}>
              <label className="block text-sm font-medium mb-1.5 opacity-80">
                {p.label}
                {p.required && <span className="text-[#FF6200] ml-1">*</span>}
              </label>
              <input
                type={
                  p.fieldType === "DATE" ? "text" :
                  p.fieldType === "NUMBER" ? "number" :
                  p.fieldType === "EMAIL" ? "email" :
                  p.fieldType === "PHONE" ? "tel" : "text"
                }
                value={fieldValues[p.key] || ""}
                onChange={(e) => updateField(p.key, e.target.value)}
                placeholder={p.label}
                className="w-full px-4 py-3 rounded-xl border text-sm outline-none transition-colors focus:border-[#FF6200]"
                style={inputStyle}
              />
            </div>
          ))}
        </div>

        {/* Invoice table */}
        <div className="mt-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-bold opacity-80">Позиции инвойса</h2>
            <button
              onClick={addRow}
              className="text-xs px-3 py-1.5 rounded-lg bg-[#FF6200]/10 text-[#FF6200] font-medium active:scale-95 transition-transform"
            >
              + Добавить
            </button>
          </div>

          <div className="space-y-3">
            {rows.map((row, idx) => (
              <div
                key={idx}
                className="p-3 rounded-xl border"
                style={{
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.02)",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)",
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs opacity-40">#{idx + 1}</span>
                  {rows.length > 1 && (
                    <button
                      onClick={() => removeRow(idx)}
                      className="text-xs text-red-400 opacity-60 active:opacity-100"
                    >
                      Удалить
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={row.description}
                  onChange={(e) => updateRow(idx, "description", e.target.value)}
                  placeholder="Описание"
                  className="w-full px-3 py-2 rounded-lg border text-sm mb-2 outline-none"
                  style={inputStyle}
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={row.quantity}
                    onChange={(e) => updateRow(idx, "quantity", e.target.value)}
                    placeholder="Кол-во"
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={inputStyle}
                  />
                  <input
                    type="number"
                    value={row.price}
                    onChange={(e) => updateRow(idx, "price", e.target.value)}
                    placeholder="Цена"
                    className="w-full px-3 py-2 rounded-lg border text-sm outline-none"
                    style={inputStyle}
                  />
                </div>
                <div className="text-right text-xs mt-1.5 opacity-50">
                  Сумма: {((parseFloat(row.quantity) || 0) * (parseFloat(row.price) || 0)).toFixed(2)}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div
            className="mt-4 p-4 rounded-xl border"
            style={{
              backgroundColor: "rgba(255, 98, 0, 0.08)",
              borderColor: "rgba(255, 98, 0, 0.2)",
            }}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold">Итого:</span>
              <span className="text-lg font-bold text-[#FF6200]">
                {totalAmount.toFixed(2)}
              </span>
            </div>
          </div>
        </div>

        {/* Fallback generate button (for non-Telegram browsers) */}
        {!tg && (
          <button
            onClick={handleGenerate}
            disabled={generating}
            className="w-full mt-6 py-3 rounded-xl bg-[#FF6200] text-white font-medium text-sm active:scale-[0.98] transition-transform disabled:opacity-50"
          >
            {generating ? "Генерация..." : "Сгенерировать инвойс"}
          </button>
        )}
      </div>
    );
  }

  return null;
}
