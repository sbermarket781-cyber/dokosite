export type Role = "ADMIN" | "MANAGER";

export type FieldType =
  | "TEXT"
  | "DATE"
  | "NUMBER"
  | "PHONE"
  | "EMAIL"
  | "TEXTAREA"
  | "CURRENCY";

export interface UserInfo {
  id: string;
  login: string;
  fullName: string;
  role: Role;
  isActive: boolean;
  createdAt: string;
}

export interface CategoryInfo {
  id: string;
  name: string;
  icon: string;
  order: number;
  _count?: { templates: number };
}

export interface PlaceholderInfo {
  id: string;
  key: string;
  label: string;
  fieldType: FieldType;
  required: boolean;
  order: number;
  isRepeatable: boolean;
  groupName: string | null;
}

export interface TemplateInfo {
  id: string;
  name: string;
  description: string | null;
  fileName: string;
  filePath: string;
  categoryId: string;
  category?: CategoryInfo;
  isActive: boolean;
  usageCount: number;
  createdAt: string;
  placeholders: PlaceholderInfo[];
}

export interface DocumentInfo {
  id: string;
  title: string;
  fieldValues: Record<string, unknown>;
  createdAt: string;
  templates: {
    id: string;
    templateId: string;
    generatedPath: string | null;
    template: TemplateInfo;
  }[];
}

export interface FieldValue {
  [key: string]: string | number | FieldValue[];
}
