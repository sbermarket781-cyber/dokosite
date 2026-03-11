import { create } from "zustand";
import type { TemplateInfo, FieldValue } from "@/types";

interface DocumentStore {
  selectedTemplates: TemplateInfo[];
  fieldValues: FieldValue;
  currentPreviewIndex: number;

  addTemplate: (template: TemplateInfo) => void;
  removeTemplate: (templateId: string) => void;
  toggleTemplate: (template: TemplateInfo) => void;
  clearTemplates: () => void;
  setFieldValue: (key: string, value: string | number) => void;
  setFieldValues: (values: FieldValue) => void;
  setCurrentPreviewIndex: (index: number) => void;
  reset: () => void;
}

export const useDocumentStore = create<DocumentStore>((set) => ({
  selectedTemplates: [],
  fieldValues: {},
  currentPreviewIndex: 0,

  addTemplate: (template) =>
    set((state) => ({
      selectedTemplates: [...state.selectedTemplates, template],
    })),

  removeTemplate: (templateId) =>
    set((state) => ({
      selectedTemplates: state.selectedTemplates.filter(
        (t) => t.id !== templateId
      ),
    })),

  toggleTemplate: (template) =>
    set((state) => {
      const exists = state.selectedTemplates.find((t) => t.id === template.id);
      if (exists) {
        return {
          selectedTemplates: state.selectedTemplates.filter(
            (t) => t.id !== template.id
          ),
        };
      }
      return {
        selectedTemplates: [...state.selectedTemplates, template],
      };
    }),

  clearTemplates: () => set({ selectedTemplates: [] }),

  setFieldValue: (key, value) =>
    set((state) => ({
      fieldValues: { ...state.fieldValues, [key]: value },
    })),

  setFieldValues: (values) => set({ fieldValues: values }),

  setCurrentPreviewIndex: (index) => set({ currentPreviewIndex: index }),

  reset: () =>
    set({
      selectedTemplates: [],
      fieldValues: {},
      currentPreviewIndex: 0,
    }),
}));
