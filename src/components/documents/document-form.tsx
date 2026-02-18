"use client";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";
import { motion } from "framer-motion";
import type { FieldValue } from "@/types";

interface Placeholder {
  key: string;
  label: string;
  fieldType: string;
  required: boolean;
  isRepeatable: boolean;
  groupName: string | null;
}

interface DocumentFormProps {
  placeholders: Placeholder[];
  values: FieldValue;
  onChange: (key: string, value: string | number) => void;
}

const fieldTypeMap: Record<string, string> = {
  TEXT: "text",
  DATE: "date",
  NUMBER: "number",
  PHONE: "tel",
  EMAIL: "email",
  TEXTAREA: "textarea",
  CURRENCY: "number",
};

const fieldTypeLabels: Record<string, string> = {
  TEXT: "Текст",
  DATE: "Дата",
  NUMBER: "Число",
  PHONE: "Телефон",
  EMAIL: "Email",
  TEXTAREA: "Текст",
  CURRENCY: "Сумма",
};

export function DocumentForm({
  placeholders,
  values,
  onChange,
}: DocumentFormProps) {
  // Group repeatable fields
  const regularFields = placeholders.filter((p) => !p.isRepeatable);
  const repeatableGroups = placeholders
    .filter((p) => p.isRepeatable)
    .reduce((acc, p) => {
      const group = p.groupName || "items";
      if (!acc[group]) acc[group] = [];
      acc[group].push(p);
      return acc;
    }, {} as Record<string, Placeholder[]>);

  return (
    <div className="space-y-5">
      {/* Regular fields */}
      {regularFields.map((placeholder, index) => (
        <motion.div
          key={placeholder.key}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.03 }}
          className="space-y-2"
        >
          <label className="flex items-center gap-2 text-sm font-medium text-neutral-300">
            {placeholder.label}
            {placeholder.required && (
              <span className="text-[#FF6200]">*</span>
            )}
            <Badge variant="outline" className="text-[9px] ml-auto">
              {fieldTypeLabels[placeholder.fieldType] || placeholder.fieldType}
            </Badge>
          </label>
          {placeholder.fieldType === "TEXTAREA" ? (
            <Textarea
              placeholder={`Введите ${placeholder.label.toLowerCase()}`}
              value={(values[placeholder.key] as string) || ""}
              onChange={(e) => onChange(placeholder.key, e.target.value)}
              required={placeholder.required}
            />
          ) : (
            <Input
              type={fieldTypeMap[placeholder.fieldType] || "text"}
              placeholder={`Введите ${placeholder.label.toLowerCase()}`}
              value={(values[placeholder.key] as string) || ""}
              onChange={(e) =>
                onChange(
                  placeholder.key,
                  placeholder.fieldType === "NUMBER" ||
                    placeholder.fieldType === "CURRENCY"
                    ? e.target.value
                    : e.target.value
                )
              }
              required={placeholder.required}
              step={placeholder.fieldType === "CURRENCY" ? "0.01" : undefined}
            />
          )}
        </motion.div>
      ))}

      {/* Repeatable groups */}
      {Object.entries(repeatableGroups).map(([groupName, fields]) => (
        <RepeatableGroup
          key={groupName}
          groupName={groupName}
          fields={fields}
          values={values}
          onChange={onChange}
        />
      ))}
    </div>
  );
}

function RepeatableGroup({
  groupName,
  fields,
  values,
  onChange,
}: {
  groupName: string;
  fields: Placeholder[];
  values: FieldValue;
  onChange: (key: string, value: string | number) => void;
}) {
  const items = (values[`_repeat_${groupName}`] as FieldValue[] | undefined) || [{}];

  const addItem = () => {
    const current = (values[`_repeat_${groupName}`] as FieldValue[] | undefined) || [{}];
    // Store as JSON string for simplicity with the flat store
    onChange(`_repeat_${groupName}`, JSON.stringify([...current, {}]) as unknown as string);
  };

  const removeItem = (index: number) => {
    const current = (values[`_repeat_${groupName}`] as FieldValue[] | undefined) || [{}];
    const updated = current.filter((_, i) => i !== index);
    onChange(`_repeat_${groupName}`, JSON.stringify(updated) as unknown as string);
  };

  return (
    <div className="border border-neutral-800 rounded-xl p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-200">
          {groupName}
        </h3>
        <Badge variant="secondary">{items.length} позиций</Badge>
      </div>

      {items.map((_, itemIndex) => (
        <div
          key={itemIndex}
          className="relative border border-neutral-800/50 rounded-lg p-3 space-y-3"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-neutral-500">
              #{itemIndex + 1}
            </span>
            {items.length > 1 && (
              <button
                onClick={() => removeItem(itemIndex)}
                className="text-neutral-500 hover:text-red-400 transition-colors"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>
          {fields.map((field) => {
            const fieldKey = `${field.key}_${itemIndex}`;
            return (
              <div key={fieldKey} className="space-y-1">
                <label className="text-xs font-medium text-neutral-400">
                  {field.label}
                </label>
                <Input
                  type={fieldTypeMap[field.fieldType] || "text"}
                  placeholder={field.label}
                  value={(values[fieldKey] as string) || ""}
                  onChange={(e) => onChange(fieldKey, e.target.value)}
                  className="h-10"
                />
              </div>
            );
          })}
        </div>
      ))}

      <Button variant="outline" size="sm" className="w-full" onClick={addItem}>
        <Plus className="h-4 w-4" />
        Добавить позицию
      </Button>
    </div>
  );
}
